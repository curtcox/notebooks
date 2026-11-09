import asyncio
import os
import sys
import unittest
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'py'))
import analyze
import nbruntime as runtime
import marimo as mo
from ipython_compat import transform

class AnalysisTests(unittest.TestCase):
    def test_defs_refs_scopes(self):
        a = analyze.analyze('import math\nx = [i + offset for i in range(3)]\ndef f(arg):\n    return x + arg + external\n_private = 1')
        self.assertEqual(a['defs'], ['f', 'math', 'x'])
        self.assertTrue({'offset','external','x'} <= set(a['refs']))
        self.assertNotIn('i', a['refs'])
        self.assertNotIn('arg', a['refs'])
    def test_comprehension_scope_and_outer_iterator(self):
        self.assertEqual(analyze.analyze('[i for i in range(3)]')['refs'],[])
        self.assertEqual(analyze.analyze('[i for i in range(i)]')['refs'],['i'])
        self.assertIn('i',analyze.analyze('[j for j in range(3)]\nprint(i)')['refs'])
        self.assertIn('external',analyze.analyze('def f():\n    return [x+external for x in items]')['refs'])

    def test_walrus_global_delete(self):
        a = analyze.analyze('global x\nx = (y := other)\ndel z')
        self.assertTrue({'x','y'} <= set(a['defs']))
        self.assertEqual(a['deletes'], ['z'])
    def test_notebook_definitions_shadow_builtins(self):
        cells = [{'kind': 'python', 'source': 'sum([1, 2])'},
                 {'kind': 'python', 'source': 'sum = lambda values: 42'}]
        consumer, producer = analyze.analyze_cells(cells)
        self.assertEqual(consumer['refs'], ['sum'])
        self.assertEqual(producer['defs'], ['sum'])
        cells[1]['options'] = {'disabled': True}
        self.assertEqual(analyze.analyze_cells(cells)[0]['refs'], [])

    def test_sql_magic_has_dataframe_dependencies_and_output(self):
        cells = [{'kind': 'python', 'source': 'answer = int(totals.iloc[0]["total"])'},
                 {'kind': 'python', 'source': '%%sql totals\nselect sum(x) as total from df'},
                 {'kind': 'python', 'source': 'df = make_dataframe()'}]
        analyses = analyze.analyze_cells(cells)
        self.assertEqual(analyses[1]['defs'], ['totals'])
        self.assertEqual(analyses[1]['refs'], ['df'])
        self.assertIn('totals', analyses[0]['refs'])
        cells[1]['source'] = '%%sql\nselect * from df'
        self.assertEqual(analyze.analyze_cells(cells)[1]['defs'], [])
        cells[1]['source'] = '%%sql invalid output\nselect * from df'
        self.assertIn('error', analyze.analyze_cells(cells)[1])

    def test_native_sql_output_can_shadow_builtin(self):
        cells = [{'kind': 'python', 'source': 'sum.iloc[0]'},
                 {'kind': 'sql', 'source': 'select 42', 'options': {'output': 'sum'}}]
        self.assertEqual(analyze.analyze_cells(cells)[0]['refs'], ['sum'])

    def test_invalid_and_dynamic(self):
        self.assertIn('error', analyze.analyze('x = '))
        self.assertTrue(analyze.analyze('exec("x=1")')['dynamic'])
    def test_marimo_ast(self):
        src='import marimo\napp = marimo.App()\n@app.cell\ndef _(x):\n    y = x + 1\n    return (y,)\n'
        result=analyze.parse_marimo(src)
        self.assertEqual(result['cells'][0]['source'],'y = x + 1')
        self.assertIn('def _(x)',analyze.export_marimo(result['cells'])['source'])
    def test_magics(self):
        self.assertIn('await get_ipython().pip',transform('%pip install numpy'))
        self.assertIn('run_line_magic',transform('%time 1 + 1'))
        self.assertIn('run_cell_magic',transform('%%sql\nselect 1'))
        with self.assertRaises(ValueError): transform('!ls')

class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.items=[];runtime.emit=self.items.append;runtime.namespace.clear();runtime.namespace['__name__']='__main__';runtime.reset_input('Ada\n')
    def run_cell(self, source, id='test', **kwargs):
        return asyncio.run(runtime.run(source,id,**kwargs))
    def test_persistence_and_expression(self):
        self.assertTrue(self.run_cell('x = 21')['ok'])
        self.run_cell('x * 2')
        self.assertEqual(self.items[-1]['data']['text/plain'],'42')
    def test_semicolon_none_and_stdin(self):
        self.run_cell('name=input("Name: ")\nname;')
        self.assertFalse(any('data' in item for item in self.items))
        self.assertEqual(runtime.namespace['name'],'Ada')
        self.assertTrue(self.run_cell('print("hello")')['ok'])
        self.assertFalse(any(item.get('data',{}).get('text/plain')=='None' for item in self.items))
    def test_private_cell_names(self):
        self.run_cell('_x = 1\nx = _x',id='a',reactive=True)
        self.run_cell('_x = 2\ny = _x',id='b',reactive=True)
        self.assertEqual(runtime.namespace['x'],1);self.assertEqual(runtime.namespace['y'],2)
    def test_private_nested_scopes_preserve_python_apis(self):
        source = '''
_value = 40
def _helper(_arg=2, *, _extra=0):
    return _value + _arg + _extra
class _Example:
    _value = 7
    def _method(self, _arg=2):
        return _helper(_arg=_arg) + self._value
def factory(_arg):
    def _nested(*, _increment=1):
        return _arg + _increment
    return _nested
answer = (_helper(_arg=2), _Example()._method(_arg=2), factory(40)(_increment=2))
'''
        result = self.run_cell(source, id='a-b', reactive=True)
        self.assertTrue(result['ok'], result['error'])
        self.assertEqual(runtime.namespace['answer'], (42, 49, 42))
        self.run_cell('_value = 100', id='ab', reactive=True)
        result = self.run_cell('answer = _helper(_arg=2)', id='a-b', reactive=True)
        self.assertTrue(result['ok'], result['error'])
        self.assertEqual(runtime.namespace['answer'], 42)

    def test_private_imports_without_references_do_not_leak(self):
        for id, source in [('a', 'import math as _module\nfrom math import sqrt as _root'),
                           ('b', 'import json as _module\nfrom json import loads as _root')]:
            result = self.run_cell(source, id=id, reactive=True)
            self.assertTrue(result['ok'], result['error'])
        result = self.run_cell('answer = _root(1764) + _module.floor(0.5)', id='a', reactive=True)
        self.assertTrue(result['ok'], result['error'])
        self.assertEqual(runtime.namespace['answer'], 42)
        self.assertNotIn('_module', runtime.namespace)
        self.assertNotIn('_root', runtime.namespace)

    def test_private_comprehensions_closures_and_global(self):
        source = '''
_items = [1, 2, 3]
_offset = 40
functions = [lambda: _i + _offset for _i in _items]
answer = sum(_i for _i in _items) + (lambda _arg: _arg)(_arg=36)
def change():
    global _offset
    _offset = 39
change()
closure_answer = functions[0]()
def outer():
    _local = 1
    def inner():
        nonlocal _local
        _local += 1
        return _local
    return inner()
nonlocal_answer = outer()
'''
        result = self.run_cell(source, reactive=True)
        self.assertTrue(result['ok'], result['error'])
        self.assertEqual(runtime.namespace['answer'], 42)
        self.assertEqual(runtime.namespace['closure_answer'], 42)
        self.assertEqual(runtime.namespace['nonlocal_answer'], 2)

    def test_private_pattern_and_exception_bindings(self):
        result = self.run_cell('''
match {'x': 42, 'y': 1}:
    case {'x': _answer, **_rest}:
        answer = _answer
try:
    raise ValueError('private error')
except ValueError as _caught:
    message = str(_caught)
''', reactive=True)
        self.assertTrue(result['ok'], result['error'])
        self.assertEqual(runtime.namespace['answer'], 42)
        self.assertEqual(runtime.namespace['message'], 'private error')
        self.assertNotIn('_answer', runtime.namespace)
        self.assertNotIn('_rest', runtime.namespace)

    @unittest.skipIf(sys.version_info < (3, 12), 'Type parameters require Python 3.12.')
    def test_private_generic_function_and_class(self):
        result = self.run_cell('''
_offset = 40
def _identity[_T](_value: _T) -> _T:
    return _value
class _Example[_T]:
    def _method(self, _value: _T):
        return _identity(_value=_value) + _offset
answer = _Example[int]()._method(_value=2)
''', reactive=True)
        self.assertTrue(result['ok'], result['error'])
        self.assertEqual(runtime.namespace['answer'], 42)
    def test_error_and_stop(self):
        self.assertFalse(self.run_cell('1/0')['ok'])
        self.assertTrue(self.run_cell('import marimo as mo\nmo.stop(True)')['stopped'])
    def test_mime(self):
        class Rich:
            def _repr_html_(self): return '<b>Hi</b>'
            def _repr_json_(self): return {'x':1}
        data=runtime.mimebundle(Rich());self.assertEqual(data['text/html'],'<b>Hi</b>');self.assertEqual(data['application/json'],{'x':1})
    def test_embedded_widgets_forms_and_mapping(self):
        mo._begin('composite',self.items.append)
        choice=mo.ui.dropdown({'Two':2,'Four':4},value='Two')
        self.assertEqual(choice.value,2)
        form=choice.form()
        mo._set_value(form.id,'Four')
        self.assertEqual(choice.value,4);self.assertEqual(form.value,4)
        rich=mo.md(f'Choose: {choice}')._repr_mimebundle_()[mo.MIME]
        self.assertEqual(rich['children'][0]['id'],choice.id)
        array=mo.ui.array([choice]);self.assertEqual(array.value,[4])

    def test_widget_state_and_unsupported(self):
        mo._begin('widgets',self.items.append);widget=mo.ui.slider(0,10,value=3);self.assertEqual(widget.value,3)
        mo._set_value(widget.id,7);self.assertEqual(widget.value,7)
        with self.assertRaises(ValueError):mo._set_value(widget.id,100)
        with self.assertRaises(NotImplementedError):mo.ui.anywidget()
        get,set_=mo.state(1);set_(lambda x:x+1);self.assertEqual(get(),2)

class SQLTests(unittest.TestCase):
    def test_real_duckdb(self):
        try:import duckdb;import pandas as pd
        except ImportError:self.skipTest('Install tests/requirements.txt for SQL coverage.')
        import sqlcell
        ns={'df':pd.DataFrame({'x':[1,2,3]})}
        result=sqlcell.run('select sum(x) as total from df',ns,'result')
        self.assertEqual(result.iloc[0]['total'],6);self.assertIs(ns['result'],result)

if __name__=='__main__':unittest.main()
