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
