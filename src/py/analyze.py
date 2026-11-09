"""AST/symbol-table analysis and marimo file translation. No notebook code is executed."""
import ast
import builtins
import json
import re
import symtable
import textwrap
from ipython_compat import transform

BUILTINS = set(dir(builtins)) | {'display', 'get_ipython', '__name__', '__file__'}


def analyze(source, notebook_defs=()):
    try:
        transformed = transform(source)
        analysis_source = re.sub(r'^(\s*)%(?:time|timeit)\s+(.+)$', r'\1\2', source, flags=re.M)
        if analysis_source != source:
            transformed = transform(analysis_source)
        tree = ast.parse(transformed)
        table = symtable.symtable(transformed, '<cell>', 'exec')
        class Bindings(ast.NodeVisitor):
            def __init__(self): self.names = set()
            def visit_Name(self, node):
                if isinstance(node.ctx, ast.Store): self.names.add(node.id)
            def visit_Import(self, node):
                self.names.update(a.asname or a.name.split('.')[0] for a in node.names)
            def visit_ImportFrom(self, node):
                self.names.update(a.asname or a.name for a in node.names if a.name != '*')
            def visit_FunctionDef(self, node): self.names.add(node.name)
            visit_AsyncFunctionDef = visit_FunctionDef
            visit_ClassDef = visit_FunctionDef
            def visit_Lambda(self, node): pass
            def visit_ExceptHandler(self, node):
                if node.name: self.names.add(node.name)
                self.generic_visit(node)
            def visit_MatchAs(self, node):
                if node.name: self.names.add(node.name)
                self.generic_visit(node)
            visit_MatchStar = visit_MatchAs
            def visit_comprehension(self, node):
                self.visit(node.iter)
                for expr in node.ifs: self.visit(expr)
        bindings = Bindings()
        bindings.visit(tree)
        defs = bindings.names | {name for n in ast.walk(tree) if isinstance(n, ast.Global) for name in n.names}
        class Loads(ast.NodeVisitor):
            def __init__(self): self.names, self.locals = set(), []
            def visit_Name(self, node):
                if isinstance(node.ctx, ast.Load) and not any(node.id in scope for scope in self.locals): self.names.add(node.id)
            def visit_FunctionDef(self, node):
                for expr in [*node.decorator_list, *node.args.defaults, *[v for v in node.args.kw_defaults if v], node.returns]:
                    if expr is not None: self.visit(expr)
                for arg in [*node.args.posonlyargs, *node.args.args, *node.args.kwonlyargs]:
                    if arg.annotation: self.visit(arg.annotation)
            visit_AsyncFunctionDef = visit_FunctionDef
            def visit_Lambda(self, node):
                for expr in node.args.defaults: self.visit(expr)
            def visit_ClassDef(self, node):
                for expr in [*node.decorator_list, *node.bases, *[k.value for k in node.keywords]]: self.visit(expr)
            def comprehension(self, node):
                self.locals.append(set())
                for generator in node.generators:
                    self.visit(generator.iter)
                    self.locals[-1].update(n.id for n in ast.walk(generator.target) if isinstance(n, ast.Name))
                    for condition in generator.ifs: self.visit(condition)
                for expr in ([node.key, node.value] if isinstance(node, ast.DictComp) else [node.elt]): self.visit(expr)
                self.locals.pop()
            visit_ListComp = comprehension
            visit_SetComp = comprehension
            visit_DictComp = comprehension
            visit_GeneratorExp = comprehension
        loads = Loads()
        loads.visit(tree)
        refs = loads.names
        def children(scope):
            for child in scope.get_children():
                for symbol in child.get_symbols():
                    if symbol.is_global() and symbol.is_referenced(): refs.add(symbol.get_name())
                children(child)
        children(table)
        deleted = {n.id for node in ast.walk(tree) if isinstance(node, ast.Delete) for n in ast.walk(node) if isinstance(n, ast.Name)}
        dynamic = any(isinstance(n, ast.ImportFrom) and any(a.name == '*' for a in n.names) or isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in ('exec', 'globals') for n in ast.walk(tree))
        public = lambda names: sorted(n for n in names if not n.startswith('_'))
        return {'defs': [] if dynamic else public(defs), 'refs': public(refs - (BUILTINS - set(notebook_defs))), 'deletes': public(deleted), 'dynamic': dynamic}
    except (SyntaxError, ValueError) as error:
        return {'defs': [], 'refs': [], 'deletes': [], 'error': str(error)}


def analyze_cells(cells):
    analyses = [analyze(c['source']) if c['kind'] == 'python' else {'defs': [], 'refs': [], 'deletes': []} for c in cells]
    sql_cells = {}
    for i, c in enumerate(cells):
        if c['kind'] == 'sql':
            sql_cells[i] = (c['source'], c.get('options', {}).get('output', '_df'))
        elif c['kind'] == 'python' and re.match(r'^%%sql(?:\s|$)', c['source']):
            header, _, query = c['source'].partition('\n')
            sql_cells[i] = (query, header[len('%%sql'):].strip() or '_df')
    for i, (_, output) in sql_cells.items():
        if not isinstance(output, str) or not output.isidentifier():
            analyses[i] = {'defs': [], 'refs': [], 'deletes': [], 'error': 'SQL output must be a Python variable name.'}
        else:
            analyses[i] = {'defs': [output] if not output.startswith('_') else [], 'refs': [], 'deletes': []}
    names = {name for c, a in zip(cells, analyses) if not c.get('options', {}).get('disabled') for name in a['defs']}
    for i, c in enumerate(cells):
        if i in sql_cells:
            analyses[i]['refs'] = sorted(set(re.findall(r'\b[A-Za-z_]\w*\b', sql_cells[i][0])) & names)
        elif c['kind'] == 'python' and names & BUILTINS:
            analyses[i] = analyze(c['source'], names)
    return analyses


class Locals(ast.NodeTransformer):
    def __init__(self, tree, cell_id):
        self.mapping = {n.id: f'_nb_{re.sub(r"[^a-zA-Z0-9]", "", cell_id)}{n.id}' for n in ast.walk(tree) if isinstance(n, ast.Name) and n.id.startswith('_') and not n.id.startswith('__')}
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and node.name.startswith('_') and not node.name.startswith('__'):
                self.mapping[node.name] = f'_nb_{re.sub(r"[^a-zA-Z0-9]", "", cell_id)}{node.name}'
    def visit_Name(self, node):
        node.id = self.mapping.get(node.id, node.id)
        return node
    def visit_FunctionDef(self, node):
        node.name = self.mapping.get(node.name, node.name)
        return self.generic_visit(node)
    visit_AsyncFunctionDef = visit_FunctionDef
    visit_ClassDef = visit_FunctionDef
    def visit_arg(self, node):
        node.arg = self.mapping.get(node.arg, node.arg)
        return node
    def visit_Import(self, node):
        for alias in node.names:
            name = alias.asname or alias.name.split('.')[0]
            if name in self.mapping:
                alias.asname = self.mapping[name]
        return node
    def visit_ImportFrom(self, node):
        for alias in node.names:
            name = alias.asname or alias.name
            alias.asname = self.mapping.get(name, alias.asname)
        return node
    def visit_Global(self, node):
        node.names = [self.mapping.get(name, name) for name in node.names]
        return node


def parse_marimo(source):
    tree = ast.parse(source)
    cells, dropped = [], []
    lines = source.splitlines()
    for node in tree.body:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            decorators = [ast.unparse(d) for d in node.decorator_list]
            if any(d.startswith('app.cell') for d in decorators):
                body = list(node.body)
                if body and isinstance(body[-1], ast.Return):
                    body.pop()
                text = '\n'.join(textwrap.dedent('\n'.join(lines[n.lineno-1:n.end_lineno])) for n in body)
                if len(body) == 1 and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Call) and ast.unparse(body[0].value.func) in ('mo.md', 'marimo.md') and body[0].value.args and isinstance(body[0].value.args[0], ast.Constant):
                    cells.append({'kind': 'markdown', 'source': str(body[0].value.args[0].value), 'options': {}})
                else:
                    options = {'name': node.name}
                    if any('disabled=True' in d for d in decorators):
                        options['disabled'] = True
                    cells.append({'kind': 'python', 'source': text, 'options': options})
            elif any(d in ('app.function', 'app.class_definition') for d in decorators):
                text = '\n'.join(lines[node.lineno-1:node.end_lineno])
                cells.append({'kind': 'python', 'source': text, 'options': {'name': node.name}})
            else:
                cells.append({'kind': 'python', 'source': ast.unparse(node), 'options': {}})
        elif isinstance(node, ast.ClassDef) and any(ast.unparse(d) == 'app.class_definition' for d in node.decorator_list):
            node.decorator_list = []
            cells.append({'kind': 'python', 'source': ast.unparse(node), 'options': {'name': node.name}})
        elif isinstance(node, ast.With) and any(ast.unparse(item.context_expr) == 'app.setup' for item in node.items):
            cells.append({'kind': 'python', 'source': '\n'.join(ast.unparse(n) for n in node.body), 'options': {'name': 'setup'}})
        elif isinstance(node, (ast.Import, ast.ImportFrom)):
            if not (isinstance(node, ast.Import) and any(a.name == 'marimo' for a in node.names)):
                cells.append({'kind': 'python', 'source': ast.unparse(node), 'options': {}})
        elif isinstance(node, ast.Assign) and any(isinstance(t, ast.Name) and t.id in ('app', '__generated_with') for t in node.targets):
            continue
        elif isinstance(node, ast.If) and '__name__' in ast.unparse(node.test):
            continue
        else:
            cells.append({'kind': 'python', 'source': ast.unparse(node), 'options': {}})
    return {'cells': cells, 'dropped': dropped, 'converted': ['marimo function wrappers converted to cells; layout configuration is not retained.']}


def export_marimo(cells):
    result = ['import marimo', '__generated_with = "0.23.0"', 'app = marimo.App()', '']
    dropped, converted = [], []
    needs_mo = any(c['kind'] in ('markdown', 'sql') for c in cells)
    if needs_mo and not any('mo' in analyze(c['source'])['defs'] for c in cells if c['kind'] == 'python'):
        result += ['@app.cell', 'def _():', '    import marimo as mo', '    return (mo,)', '']
    for cell in cells:
        kind, source = cell['kind'], cell['source']
        if kind == 'raw':
            dropped.append('Raw cell is not representable in marimo.')
            continue
        if kind == 'markdown':
            source = f'mo.md({source!r})'
        elif kind == 'sql':
            source = f'{cell.get("options", {}).get("output", "_df")} = mo.sql({source!r})'
        elif kind == 'r':
            source = f'_r_source = {source!r}'
            converted.append('R source retained in a disabled Python cell.')
        analysis = analyze(source)
        refs = [r for r in analysis['refs'] if r not in analysis['defs']]
        defs = analysis['defs']
        disabled = kind == 'r' or cell.get('options', {}).get('disabled')
        result += ['@app.cell' + ('(disabled=True)' if disabled else ''), f'def _({", ".join(refs)}):', textwrap.indent(source or 'pass', '    '), '    return ' + (f'({", ".join(defs)},)' if defs else ''), '']
    result += ['if __name__ == "__main__":', '    app.run()', '']
    return {'source': '\n'.join(result), 'dropped': dropped, 'converted': converted}
