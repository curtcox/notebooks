import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';
// Real engine coverage is opt-in locally and mandatory in CI.
test('Pyodide persistent namespace, private names, SQL, widgets and matplotlib',{skip:process.env.TEST_PACKAGES!=='1',timeout:240000},async()=>{
 const {loadPyodide}=await import('pyodide');const py=await loadPyodide({packageCacheDir:'.pyodide-cache'});
 py.FS.mkdirTree('/opt/notebookonline/marimo');for(const file of ['analyze.py','nbruntime.py','ipython_compat.py','sqlcell.py','marimo/__init__.py'])py.FS.writeFile('/opt/notebookonline/'+file,await fs.readFile('src/py/'+file,'utf8'));
 py.runPython("import sys,os\nsys.path.insert(0,'/opt/notebookonline')\nos.environ['MPLBACKEND']='agg'\nimport nbruntime,analyze,marimo\nitems=[]\nnbruntime.emit=items.append");
 let result=JSON.parse(await py.runPythonAsync("import json\njson.dumps(await nbruntime.run('x = 21', 'a', True))"));assert.equal(result.ok,true);
 result=JSON.parse(await py.runPythonAsync("json.dumps(await nbruntime.run('x*2', 'b', True))"));assert.equal(result.ok,true);assert.equal(py.runPython("items[-1]['data']['text/plain']"),'42');
 await py.loadPackage(['ipython','duckdb','pandas','matplotlib']);
 result=JSON.parse(await py.runPythonAsync("json.dumps(await nbruntime.run('import pandas as pd\\ndf=pd.DataFrame({\"x\":[1,2,3]})', 'data', True))"));assert.equal(result.ok,true,result.error);
 result=JSON.parse(await py.runPythonAsync("json.dumps(await nbruntime.run('select sum(x) as total from df', 'sql', True, [], 'sql', 'result'))"));assert.equal(result.ok,true,result.error);assert.equal(py.runPython("int(nbruntime.namespace['result'].iloc[0]['total'])"),6);
 result=JSON.parse(await py.runPythonAsync("json.dumps(await nbruntime.run('import matplotlib.pyplot as plt\\nplt.plot([1,2],[2,4])\\nplt.show()', 'plot'))"));assert.equal(result.ok,true,result.error);assert.ok(py.runPython("any('image/svg+xml' in item.get('data',{}) for item in items)"));
 result=JSON.parse(await py.runPythonAsync("json.dumps(await nbruntime.run('import marimo as mo\\nslider=mo.ui.slider(0,10,value=2)\\nslider', 'widget'))"));assert.equal(result.ok,true,result.error);assert.equal(py.runPython("marimo._set_value('widget:1',7)"),'widget');assert.equal(py.runPython("nbruntime.namespace['slider'].value"),7);
});
