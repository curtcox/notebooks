/* Concatenated into the HashBin SDK's opaque sandbox worker, never run on the editor origin. */
const RUNTIME='https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
const send=self.postMessage.bind(self);
let py,cellId=null,outputBytes=0,outputLines=0,truncated=false;
function harden(){for(const key of ['caches','indexedDB','importScripts','Worker','SharedWorker']){for(let proto=Object.getPrototypeOf(self);proto;proto=Object.getPrototypeOf(proto)){if(Object.getOwnPropertyDescriptor(proto,key)?.configurable)delete proto[key];}Object.defineProperty(self,key,{value:undefined,configurable:false,writable:false});}}
function emit(raw){const item=JSON.parse(raw);if(item.output_type==='stream'){if(truncated)return;outputBytes+=new TextEncoder().encode(item.text).length;outputLines+=(item.text.match(/\n/g)??[]).length;if(outputBytes>1024*1024||outputLines>20000){truncated=true;item.text='\n… output truncated at 1 MiB / 20,000 lines.\n';}}else if(raw.length>12*1024*1024){send({type:'output',id:cellId,output:{output_type:'stream',name:'stderr',text:'Rich output exceeds the size limit.\n'}});return;}send({type:'output',id:cellId,output:item});}
const ready=(async()=>{
 send({type:'status',text:'Loading Python… (~12 MB on first visit)'});
 const [{loadPyodide},asm]=await Promise.all(['pyodide.mjs','pyodide.asm.mjs'].map(f=>hashbinSandbox.import(RUNTIME+f)));
 py=await loadPyodide({indexURL:RUNTIME,createPyodideModule:asm.default});
 const files=['nbruntime.py','analyze.py','ipython_compat.py','sqlcell.py','marimo/__init__.py'];
 const texts=await Promise.all(files.map(async f=>{const r=await fetch('py/'+f);if(!r.ok)throw Error('Runtime helper download failed: '+f);return r.text();}));
 py.FS.mkdirTree('/opt/notebookonline/marimo');files.forEach((f,i)=>py.FS.writeFile('/opt/notebookonline/'+f,texts[i]));
 py.runPython("import sys, os\nsys.path.insert(0, '/opt/notebookonline')\nos.environ['MPLBACKEND']='agg'");
 // Keep the real display classes and input transformer; use our bounded publisher/dispatcher.
 await py.loadPackage('ipython');
 py.registerJsModule('_notebook_bridge',{emit});
 py.runPython("import json, nbruntime, analyze, marimo\nfrom _notebook_bridge import emit\nnbruntime.emit = lambda item: emit(json.dumps(item, default=str))");
 harden();send({type:'ready'});
})();
ready.catch(error=>send({type:'fatal',error:String(error.message??error)}));
async function handle(data){try{
 await ready;const {request,action}=data;py.globals.set('_request_json',JSON.stringify(data));py.runPython('_request = json.loads(_request_json)');
 if(action==='analyze'){send({type:'result',request,result:JSON.parse(py.runPython("json.dumps(analyze.analyze_cells(_request['cells']))"))});return;}
 if(action==='parse-marimo'||action==='export-marimo'){const expression=action==='parse-marimo'?"analyze.parse_marimo(_request['source'])":"analyze.export_marimo(_request['cells'])";send({type:'result',request,result:JSON.parse(py.runPython(`json.dumps(${expression})`))});return;}
 if(action==='input'){py.runPython("nbruntime.reset_input(_request['stdin'])");send({type:'result',request,result:true});return;}
 if(action==='delete'){py.runPython("nbruntime.delete_names(_request['names'])");send({type:'result',request,result:true});return;}
 if(action==='widget'){const result=py.runPython("marimo._set_value(_request['widgetId'], _request['value'])");send({type:'result',request,result});return;}
 if(action!=='run')throw Error('Unknown kernel action.');
 cellId=data.id;outputBytes=outputLines=0;truncated=false;send({type:'status',id:cellId,text:'Loading packages…'});
 if(data.kind==='sql'||/^%%sql\b/m.test(data.source))await py.loadPackage(['duckdb','pandas']);
 const imports=data.source.replace(/^\s*(?:import marimo\b.*|from marimo\b.*|[%!].*)$/gm,'');
 await py.loadPackagesFromImports(imports,{messageCallback:text=>send({type:'status',id:cellId,text}),errorCallback:text=>send({type:'status',id:cellId,text})});
 const deps=JSON.parse(py.runPython("json.dumps(nbruntime.dependency_spec(_request['source']))"));if(deps.length){await py.loadPackage('micropip');await py.runPythonAsync('import micropip\nawait micropip.install(nbruntime.dependency_spec(_request["source"]))');}
 send({type:'running',id:cellId});
 const result=await py.runPythonAsync("json.dumps(await nbruntime.run(_request['source'], _request['id'], _request.get('reactive', False), _request.get('delete', []), _request.get('kind', 'python'), _request.get('output', '_df')))");
 send({type:'result',request,id:cellId,result:JSON.parse(result)});
}catch(error){send({type:'result',request:data.request,error:String(error.message??error),id:data.id});}}
let queue=Promise.resolve();self.onmessage=({data})=>{queue=queue.then(()=>handle(data));};
