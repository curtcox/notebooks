"""A persistent notebook namespace and Jupyter MIME publisher, independent of the JS host."""
import ast
import base64
import builtins
import inspect
import io
import json
import linecache
import os
import re
import sys
import traceback
import types
import tomllib
from analyze import Locals
from ipython_compat import transform, install

emit = lambda item: None
namespace = {'__name__': '__main__', '__file__': 'notebook.py'}
_input = io.StringIO()
_count = 0
_cell = ''


def reset_input(text=''):
    global _input
    _input = io.StringIO(text)


def read_input(prompt=''):
    print(prompt, end='')
    line = _input.readline()
    if not line:
        raise EOFError('No more program input. Add lines in Program input.')
    print(line.rstrip('\r\n'))
    return line.rstrip('\r\n')


class Stream(io.TextIOBase):
    def __init__(self, name):
        self.name = name
    def writable(self):
        return True
    def write(self, text):
        if text:
            emit({'output_type': 'stream', 'name': self.name, 'text': str(text)})
        return len(text)
    def flush(self):
        pass


def mimebundle(value):
    data = {}
    method = getattr(value, '_repr_mimebundle_', None)
    if callable(method):
        bundle = method()
        data.update(bundle[0] if isinstance(bundle, tuple) else bundle or {})
    for name, mime in [('html','text/html'),('markdown','text/markdown'),('svg','image/svg+xml'),('png','image/png'),('jpeg','image/jpeg'),('latex','text/latex'),('json','application/json')]:
        method = getattr(value, f'_repr_{name}_', None)
        if mime in data or not callable(method):
            continue
        item = method()
        if isinstance(item, tuple):
            item = item[0]
        if item is not None:
            data[mime] = item
    if value.__class__.__module__.startswith('PIL.'):
        buffer = io.BytesIO()
        value.save(buffer, format='PNG')
        data['image/png'] = buffer.getvalue()
    for mime, item in list(data.items()):
        if isinstance(item, bytes):
            data[mime] = base64.b64encode(item).decode('ascii')
    data.setdefault('text/plain', repr(value))
    return data


def display(*objects, display_id=None, update=False, **kwargs):
    for value in objects:
        emit({'output_type': 'update_display_data' if update else 'display_data', 'data': mimebundle(value), 'metadata': {}, 'transient': {'display_id': str(display_id)} if display_id else {}})
    if display_id:
        class Handle:
            def update(self, obj):
                display(obj, display_id=display_id, update=True)
        return Handle()


def dependency_spec(source):
    match = re.search(r'^# /// script\s*\n(.*?)^# ///\s*$', source, re.M | re.S)
    if not match:
        if '# /// script' in source:
            raise ValueError('Unclosed PEP 723 script metadata.')
        return []
    lines = match.group(1).splitlines()
    if any(not line.startswith('#') for line in lines):
        raise ValueError('PEP 723 metadata lines must be comments.')
    result = tomllib.loads('\n'.join(line[2:] if line.startswith('# ') else line[1:] for line in lines)).get('dependencies', [])
    if not isinstance(result, list) or any(not isinstance(dep, str) for dep in result):
        raise ValueError('Dependencies must be a list of package names.')
    return result


def figures():
    plt = sys.modules.get('matplotlib.pyplot')
    if plt is None:
        return
    for number in plt.get_fignums():
        fig = plt.figure(number)
        svg, png = io.StringIO(), io.BytesIO()
        fig.savefig(svg, format='svg', bbox_inches='tight')
        fig.savefig(png, format='png', dpi=fig.dpi*2, bbox_inches='tight')
        emit({'output_type': 'display_data', 'data': {'image/svg+xml': svg.getvalue(), 'image/png': base64.b64encode(png.getvalue()).decode('ascii')}, 'metadata': {}})
        plt.close(fig)


def delete_names(names):
    for name in names:
        namespace.pop(name, None)


async def run(source, cell_id, reactive=False, delete=None, kind='python', output='_df'):
    global _cell, _count
    _cell, _count = cell_id, _count + 1
    previous = sys.stdout, sys.stderr, sys.stdin, builtins.input
    sys.stdout, sys.stderr, sys.stdin = Stream('stdout'), Stream('stderr'), _input
    builtins.input, builtins.display = read_input, display
    install(namespace)
    namespace['_nb_display'] = lambda value: display(value) if value is not None else None
    error, stopped = None, False
    try:
        import marimo
        marimo._begin(cell_id, emit)
        import turtle, turtle_svg
        turtle._reset(lambda item: emit({'output_type':'display_data','data':{'image/svg+xml':turtle_svg.render(item)},'metadata':{}}) if item.get('type')=='turtle' else None)
        if reactive:
            delete_names(delete or [])
        os.environ['MPLBACKEND'] = 'agg'
        if 'matplotlib' in sys.modules:
            import matplotlib
            matplotlib.use('agg', force=True)
            import matplotlib.pyplot as plt
            plt.close('all')
            plt.show = figures
        if kind == 'sql':
            import sqlcell
            result = sqlcell.run(source, namespace, output)
            if result is not None:
                display(result)
        else:
            transformed = transform(source)
            filename = f'cell-{cell_id}.py'
            linecache.cache[filename] = (len(source), None, source.splitlines(True), filename)
            tree = ast.parse(transformed, filename=filename)
            if reactive:
                tree = Locals(transformed, cell_id).visit(tree)
            if tree.body and isinstance(tree.body[-1], ast.Expr) and not source.rstrip().endswith(';'):
                expr = tree.body.pop()
                tree.body.append(ast.copy_location(ast.Expr(value=ast.Call(func=ast.Name(id='_nb_display', ctx=ast.Load()), args=[expr.value], keywords=[])), expr))
            ast.fix_missing_locations(tree)
            code = compile(tree, filename, 'exec', flags=ast.PyCF_ALLOW_TOP_LEVEL_AWAIT)
            value = eval(code, namespace)
            if inspect.isawaitable(value):
                await value
        figures()
        turtle._finish()
    except BaseException as caught:
        from marimo import Stop
        if isinstance(caught, Stop):
            stopped = True
        else:
            error = ''.join(traceback.format_exception(caught))
            emit({'output_type': 'error', 'ename': type(caught).__name__, 'evalue': str(caught), 'traceback': error.splitlines()})
    finally:
        sys.stdout, sys.stderr, sys.stdin, builtins.input = previous
    return {'ok': error is None, 'error': error, 'stopped': stopped, 'executionCount': _count}


def update_widget(widget_id, value):
    import marimo
    old = sys.stdout, sys.stderr
    sys.stdout, sys.stderr = Stream('stdout'), Stream('stderr')
    try:
        return marimo._set_value(widget_id, value)
    finally:
        sys.stdout, sys.stderr = old
