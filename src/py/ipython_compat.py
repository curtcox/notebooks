"""A bounded magic dispatcher; IPython is used for its input transformer and display classes."""
import ast
import builtins
import shlex
import time


class UsageError(ValueError):
    pass


class Shell:
    def __init__(self, namespace=None):
        self.user_ns = namespace if namespace is not None else {}

    async def pip(self, text):
        import micropip
        args = shlex.split(text)
        if not args or args[0] != 'install' or any(a.startswith('-') for a in args[1:]):
            raise UsageError('Use %pip install package [package…], without shell options.')
        await micropip.install(args[1:])

    def run_line_magic(self, name, text):
        if name == 'matplotlib' and text.strip() in ('inline', ''):
            return None
        if name not in ('time', 'timeit'):
            raise UsageError(f'%{name} is not supported. See docs/python.html.')
        started = time.perf_counter()
        try:
            code = compile(text, '<magic>', 'eval')
        except SyntaxError:
            code = compile(text, '<magic>', 'exec')
        result = eval(code, self.user_ns)
        print(f'{(time.perf_counter() - started) * 1000:.3f} ms' + (' (one bounded iteration)' if name == 'timeit' else ''))
        return result

    def run_cell_magic(self, name, line, source):
        import nbruntime
        if name == 'sql':
            import sqlcell
            return sqlcell.run(source, self.user_ns, line.strip() or '_df')
        mime = {'html': 'text/html', 'markdown': 'text/markdown', 'latex': 'text/latex'}.get(name)
        if mime:
            nbruntime.emit({'output_type': 'display_data', 'data': {mime: source}, 'metadata': {}})
            return None
        raise UsageError(f'%%{name} is not supported. Use an R cell for %%R (R execution is disabled).')

    def system(self, text):
        raise UsageError('Shell commands (!cmd) are unavailable in the browser.')


def transform(source):
    lines = source.splitlines()
    if lines and lines[0].startswith('%%'):
        name, _, args = lines[0][2:].partition(' ')
        if name not in ('sql', 'html', 'markdown', 'latex'):
            raise UsageError(f'%%{name} is not supported in Python cells.')
        return f'get_ipython().run_cell_magic({name!r}, {args!r}, {chr(10).join(lines[1:])!r})'
    result = []
    for line in lines:
        stripped = line.lstrip()
        indent = line[:len(line)-len(stripped)]
        if stripped.startswith('%pip '):
            result.append(indent + f'await get_ipython().pip({stripped[5:]!r})')
        elif stripped.startswith('!'):
            raise UsageError('Shell commands (!cmd) are unavailable in the browser.')
        elif stripped.startswith('%'):
            name, _, text = stripped[1:].partition(' ')
            if name not in ('time', 'timeit', 'matplotlib'):
                raise UsageError(f'%{name} is not supported. See docs/python.html.')
            result.append(indent + f'get_ipython().run_line_magic({name!r}, {text!r})')
        else:
            result.append(line)
    transformed = '\n'.join(result)
    try:
        from IPython.core.inputtransformer2 import TransformerManager
    except ImportError:
        return transformed
    return TransformerManager().transform_cell(transformed)


def install(namespace):
    shell = Shell(namespace)
    builtins.get_ipython = lambda: shell
    namespace['get_ipython'] = builtins.get_ipython
    try:
        import IPython
        import IPython.display
        import nbruntime
        # Preserve the public representation classes; replace only the publisher.
        IPython.get_ipython = lambda: None  # matplotlib must stay on Agg, outside an IPython event loop.
        IPython.display.display = nbruntime.display
        IPython.display.clear_output = lambda wait=False: nbruntime.emit({'output_type': 'clear_output', 'wait': bool(wait)})
        IPython.display.update_display = lambda obj, display_id, **kw: nbruntime.display(obj, display_id=display_id, update=True)
    except ImportError:
        pass
