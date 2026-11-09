import fs from 'node:fs/promises';import {createHash} from 'node:crypto';import {parse} from '../src/model/notebook-markdown.js';import {buildGraph} from '../src/kernels/scheduler.js';import {examplesSource} from './examples.mjs';
import {examples} from '../src/examples.js';
const hash=text=>createHash('sha256').update(text).digest('hex'),escape=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const files=['analyze.py','nbruntime.py','ipython_compat.py','sqlcell.py','marimo/__init__.py','turtle.py','turtle_svg.py'];const helpers=await Promise.all(files.map(f=>fs.readFile('src/py/'+f,'utf8')));const runtime=hash(helpers.join('\n')+await fs.readFile('scripts/render-gallery.mjs','utf8')+await fs.readFile('src/kernels/scheduler.js','utf8'));
const expected=Object.fromEntries(examples.map(e=>[e.id,hash(e.src+JSON.stringify(e.settings)+runtime)]));
if(process.argv.includes('--check')){if(await fs.readFile('src/examples.js','utf8')!==await examplesSource())throw Error('Examples catalog is stale. Run node scripts/examples.mjs.');const actual=JSON.parse(await fs.readFile('gallery/fingerprints.json','utf8'));if(JSON.stringify(actual)!==JSON.stringify(expected))throw Error('Gallery fingerprints are stale. Run npm run gallery.');for(const e of examples)await fs.access('gallery/previews/'+e.id+'.svg');console.log('Gallery fingerprints verified.');process.exit();}
const {loadPyodide}=await import('pyodide');const py=await loadPyodide({packageCacheDir:'.pyodide-cache'});
py.FS.mkdirTree('/opt/notebookonline/marimo');files.forEach((f,i)=>py.FS.writeFile('/opt/notebookonline/'+f,helpers[i]));py.runPython("import sys,os,json\nsys.path.insert(0,'/opt/notebookonline')\nos.environ['MPLBACKEND']='agg'\nimport nbruntime,analyze,marimo");
await py.loadPackage(['ipython','duckdb','pandas','polars','pyarrow','numpy','matplotlib']);await fs.mkdir('gallery/previews',{recursive:true});
for(const example of examples){
 const {cells}=parse(example.src);py.globals.set('_cells_json',JSON.stringify(cells));const analyses=JSON.parse(py.runPython('json.dumps(analyze.analyze_cells(json.loads(_cells_json)))'));const graph=buildGraph(cells,analyses);
 if(example.settings.mode!=='linear'&&graph.errors.size)throw Error(example.id+': '+[...graph.errors.values()].join('; '));
 py.runPython("nbruntime.namespace.clear()\nnbruntime.namespace['__name__']='__main__'\nmarimo._widgets.clear()\nmarimo._values.clear()\nmarimo._states.clear()\nitems=[]\nnbruntime.emit=items.append");py.globals.set('_stdin',example.settings.stdin);py.runPython('nbruntime.reset_input(_stdin)');
 const order=example.settings.mode==='linear'?cells.filter(c=>['python','sql'].includes(c.kind)):graph.order.map(id=>graph.nodes.get(id).cell);
 for(const cell of order){if(cell.kind==='r'||cell.options.disabled)continue;py.globals.set('_cell_json',JSON.stringify(cell));const result=JSON.parse(await py.runPythonAsync("_cell=json.loads(_cell_json)\njson.dumps(await nbruntime.run(_cell['source'],_cell['id'],"+(example.settings.mode==='reactive'?'True':'False')+",[],_cell['kind'],_cell['options'].get('output','_df')))"));if(!result.ok)throw Error(example.id+': '+result.error);}
 const outputs=JSON.parse(py.runPython('json.dumps(items,default=str)'));const figure=outputs.find(o=>o.data?.['image/svg+xml']);
 const lines=outputs.flatMap(o=>o.output_type==='stream'?o.text.split('\n'):o.data?.['application/vnd.notebook-online.widget+json']?[`${o.data['application/vnd.notebook-online.widget+json'].label||'Widget'}: ${JSON.stringify(o.data['application/vnd.notebook-online.widget+json'].value)}`]:o.data?.['text/plain']?o.data['text/plain'].split('\n'):[]).filter(Boolean);
 if(!lines.length)lines.push(example.tags.includes('R')?'R source retained · execution disabled':'Markdown, math and readable source');
 let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"><rect width="640" height="360" fill="#f7f6f2"/><rect x="20" y="20" width="600" height="320" rx="12" fill="white" stroke="#dadfd8"/><text x="42" y="58" fill="#225b50" font-family="Georgia,serif" font-size="24">${escape(example.title)}</text><path d="M42 78h556" stroke="#dadfd8"/>`;
 if(figure)svg+=`<image x="70" y="86" width="500" height="238" href="data:image/svg+xml;base64,${Buffer.from(figure.data['image/svg+xml']).toString('base64')}"/>`;
 else svg+=lines.slice(0,11).map((line,i)=>`<text x="42" y="${108+i*19}" fill="#33483d" font-family="monospace" font-size="13">${escape(line.slice(0,69))}</text>`).join('');
 svg+='</svg>\n';await fs.writeFile(`gallery/previews/${example.id}.svg`,svg);console.log('Rendered '+example.id);
}
await fs.writeFile('gallery/fingerprints.json',JSON.stringify(expected,null,2)+'\n');
