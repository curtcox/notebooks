import {kit,config,type,urlState} from './fragment-config.mjs';
import {Notebook} from './model/notebook.js';
import {serialize} from './model/notebook-markdown.js';
import {CellList} from './ui/cell-list.js';
import {examples} from './examples.js';
import {PythonClient} from './kernels/python-client.js';
import {Scheduler} from './kernels/scheduler.js';
import {renderWidget} from './ui/widgets.js';
import {importNotebook,exportNotebook} from './formats/sniff.js';
import {showReport} from './formats/report.js';
import {NotebookStore} from './hashbin.mjs';
import {mountAi,handleAiCallback} from './ai.mjs';
const $=id=>document.getElementById(id),status=text=>{$('status').textContent=text;};
export const model=new Notebook({src:examples[0].src});
let sourceEditor,sourceMode=false,sourceTimer,sourceSync=false,savedCID=null,saveFingerprint=null,hashbinPanel,aiUI,saveWaiter;
let loadRevision=0;
const storage=kit.createStorage({prefix:config.storagePrefix});
const drafts=new kit.LocalDrafts({storage,key:'work',serialize:doc=>urlState.documents.serialize(doc),parse:text=>urlState.documents.parse(text)});
const snapshot=()=>model.snapshot(),fingerprint=()=>JSON.stringify(snapshot());
function changed(id,{run=true}={}) {
 loadRevision++;hashbinPanel?.cancelLoad();aiUI?.cancel();savedCID=null;saveFingerprint=null;
 drafts.attempt(snapshot(),true);urlState.write(snapshot());outline();
 if(id)cells.update(id);scheduler.edit(id,{auto:run});
}
function structure(id,{run=true}={}){cells.render();if(id)cells.select(id);changed(undefined,{run});}
function load(doc,{imported=false,result}={}){
 scheduler.stop('Notebook opened — kernel restarted.');aiUI?.cancel();clearTimeout(sourceTimer);loadRevision++;model.load(doc);
 if(imported)model.settings.autorun=false;
 if(result){if(result.cells)model.cells=result.cells;model.metadata=result.metadata??{};model.frontMatter=result.frontMatter??model.frontMatter;showReport($('report'),result.report);}
 drafts.opened();savedCID=null;saveFingerprint=null;cells.render();syncSettings();outline();syncSource();
}
function outline(){
 const nav=$('outline');nav.replaceChildren();let title='Untitled notebook';
 for(const cell of model.cells){
  if(cell.kind==='markdown')for(const match of cell.source.matchAll(/^(#{1,6})\s+(.+)$/gm)){
   if(title==='Untitled notebook')title=match[2];const a=document.createElement('a');a.textContent=match[2];a.href=`#cell-${cell.id}`;a.style.paddingLeft=`${(match[1].length-1)*8}px`;
   a.onclick=e=>{e.preventDefault();cells.select(cell.id);cells.nodes.get(cell.id).node.scrollIntoView({behavior:'smooth'});};nav.append(a);
  }
  if(cell.error){const error=document.createElement('a');error.textContent=`⚠ Cell ${model.cells.indexOf(cell)+1}`;error.href=`#cell-${cell.id}`;error.onclick=e=>{e.preventDefault();cells.nodes.get(cell.id)?.node.scrollIntoView();};nav.append(error);}
 }
 $('title').textContent=title;document.title=`${title} · Notebook Online`;
}
const kernel=new PythonClient({onEvent:event=>{
 if(event.type==='status')status(event.text);
 else if(event.type==='running')scheduler.running();
 else if(event.type==='output'){
  const cell=model.cells.find(c=>c.id===event.id);if(!cell)return;const output={...event.output,kernelGeneration:event.generation};
  if(output.output_type==='state_change'){scheduler.stateEvents.add(output.owner);return;}
  if(output.output_type==='clear_output')cell.outputs=[];
  else if(output.output_type==='update_display_data'){
   const displayId=output.transient?.display_id;
   for(const item of model.cells)for(let i=0;i<item.outputs.length;i++)if(displayId&&item.outputs[i].transient?.display_id===displayId){item.outputs[i]={...output,output_type:item.outputs[i].output_type};cells.update(item.id);}
  }else cell.outputs.push(output);
  cells.update(cell.id);
 }else if(event.type==='fatal')status(event.error);
}});
const scheduler=new Scheduler({model,kernel,onChange:id=>cells.update(id),onStatus:text=>{status(text);queueMicrotask(()=>{$('stop').disabled=!scheduler.busy;});}});
async function runSelected(id,options){const cell=model.cells.find(c=>c.id===id);if(cell?.kind==='markdown'){cells.finishEdit(id);return;}await scheduler.run(options??{ids:id?[id]:null});await stateChanges();outline();}
async function stateChanges(){const owners=[...scheduler.stateEvents];scheduler.stateEvents.clear();for(const owner of owners)await scheduler.widget(owner);}
async function widgetChanged(widgetId,value,generation){try{if(generation!==kernel.generation)throw Error('Widget belongs to a previous kernel. Run its cell again.');if(scheduler.busy){status('Wait for the current batch or use Stop.');return;}const owner=await kernel.widget(widgetId,value);await scheduler.widget(owner);await stateChanges();}catch(error){status(error.message);}}
const cells=new CellList({container:$('cells'),model,onEdit:changed,onStructure:structure,onRun:runSelected,onAsk:cell=>openAi(cell),onWidget:(container,spec,generation)=>renderWidget(container,spec,(id,value)=>widgetChanged(id,value,generation))});
const shell=kit.createShell({config:{...config,docs:new URL('docs/',location.href).href,gallery:new URL('gallery.html',location.href).href},actions:[
 {id:'run',label:'▶ Run',onClick:()=>runSelected(cells.selected)},
 {id:'run-all',label:'Run all',onClick:async()=>{await scheduler.run();await stateChanges();outline();}},
 {id:'stop',label:'Stop',onClick:()=>scheduler.stop()},
 {id:'restart',label:'Restart',extra:true,onClick:()=>scheduler.stop()},
 {id:'run-stale',label:'Run stale',extra:true,onClick:()=>scheduler.run({ids:model.cells.filter(c=>['stale','idle','error'].includes(c.status)).map(c=>c.id)})},
 {id:'restart-run',label:'Restart and run all',extra:true,onClick:()=>{scheduler.stop();void scheduler.run();}},
 {id:'add-cell',label:'+ Cell',onClick:()=>newCellDialog.open()},
 {id:'open',label:'Open',extra:true,onClick:()=>$('file-open').click()},
 {id:'open-url',label:'Open from URL',extra:true,onClick:()=>openURLDialog.open()},
 {id:'download',label:'Download',extra:true,onClick:()=>downloadDialog.open()},
 {id:'share-open',label:'Share',onClick:()=>share.open()},
 {id:'qr-open',label:'QR',extra:false,onClick:()=>qr.open(savedCID&&saveFingerprint===fingerprint()?urlState.link(location.href,savedCID):urlState.build(snapshot()).href)},
 {id:'source-toggle',label:'Source',extra:true,onClick:()=>toggleSource()},
 {id:'ask-open',label:'Ask',extra:true,onClick:()=>openAi()},
 {id:'undo',label:'Undo structure',extra:true,onClick:()=>{model.undo();structure();}},
 {id:'shortcuts',label:'Keyboard shortcuts',extra:true,onClick:()=>shortcuts.open()}
]});
shell.header.querySelector('.fk-brand').href='./';
$('run').classList.add('primary');$('stop').disabled=true;
const mode=document.createElement('select');mode.id='mode';mode.setAttribute('aria-label','Execution mode');mode.innerHTML='<option value="reactive">Reactive</option><option value="linear">Linear</option>';
mode.onchange=()=>{if(!confirm('Changing execution mode restarts the kernel. Continue?')){mode.value=model.settings.mode;return;}scheduler.stop();model.settings.mode=mode.value;model.settings.autorun=mode.value==='reactive';model.revision++;syncSettings();structure(undefined,{run:false});if(confirm('Restart and run all cells now?'))void scheduler.run();};
const auto=document.createElement('input');auto.type='checkbox';auto.id='autorun';const autoLabel=document.createElement('label');autoLabel.append(auto,document.createTextNode('Auto-run'));
auto.onchange=()=>{model.settings.autorun=auto.checked;changed(undefined,{run:false});};shell.toolbar.insertBefore(mode,$('add-cell'));shell.toolbar.insertBefore(autoLabel,$('add-cell'));
function syncSettings(){mode.value=model.settings.mode;auto.checked=model.settings.autorun;$('mode-badge').textContent=mode.value==='reactive'?'Reactive':'Linear';$('stdin').value=model.settings.stdin;}
$('stdin').oninput=()=>{model.settings.stdin=$('stdin').value;changed(undefined,{run:false});};
const newCellDialog=kit.createDialog('Add a cell',{id:'add-cell-dialog'});
for(const kind of ['python','markdown','sql','r','raw']){const b=document.createElement('button');b.textContent=kind==='r'?'R (execution disabled)':kind[0].toUpperCase()+kind.slice(1);b.onclick=()=>{const next=model.insert(model.cells.length,kind);structure(next.id);newCellDialog.dialog.close();cells.edit(next.id);};newCellDialog.body.append(b);}
$('append-cell').onclick=()=>newCellDialog.open();
const store=new NotebookStore({kernel});
hashbinPanel=new kit.HashBinPanel({store,urlState,getSnapshot:snapshot,getFingerprint:fingerprint,container:shell.drawer.body,
 onLoad:async(doc,cid)=>{load(doc,{imported:Boolean(doc._import),result:doc._import});savedCID=cid;saveFingerprint=fingerprint();history.replaceState(null,'',cid?urlState.link(location.href,cid):urlState.build(snapshot()).href);shell.drawer.dialog.close();},
 onSaved:async(cid,fp,href)=>{savedCID=cid;saveFingerprint=fp;urlState.cancel();history.replaceState(null,'',href);if(saveWaiter){const resolve=saveWaiter;saveWaiter=null;hashbinPanel.dialog.close();resolve(href);}}
});
if(!config.hashbinClientId){hashbinPanel.saveButton.title='Saving requires a registered client ID; open for setup details.';const note=document.createElement('p');note.id='hashbin-setup';note.textContent='Saving is disabled until Notebook Online is registered with HashBin. Load works without registration. R execution requires approval in this build.';shell.drawer.body.append(note);}
const share=kit.createShareDialog({urlState,getSnapshot:snapshot,onSave:config.hashbinClientId?()=>hashbinPanel.openSave():undefined});
const qr=kit.createQrDialog({config,urlState,onSave:config.hashbinClientId?()=>new Promise(resolve=>{saveWaiter=resolve;void hashbinPanel.openSave();}):undefined,onLoad:async intent=>{if(intent.kind==='cid')await hashbinPanel.load(intent.cid);else {const doc=intent.doc??intent.intent?.doc;if(!doc)throw Error('QR image does not contain a notebook.');load(doc);history.replaceState(null,'',urlState.build(snapshot()).href);}}});
hashbinPanel.dialog.addEventListener('close',()=>{if(saveWaiter){saveWaiter(null);saveWaiter=null;}});
drafts.mount(shell.drawer.body,doc=>{load(doc);changed(undefined,{run:false});});
for(const [label,href]of [['Python docs ↗','https://docs.python.org/3/'],['Pyodide packages ↗','https://pyodide.org/en/stable/usage/packages-in-pyodide.html'],['R docs ↗','https://cran.r-project.org/manuals.html'],['DuckDB SQL ↗','https://duckdb.org/docs/stable/sql/introduction'],['marimo docs ↗','https://docs.marimo.io/'],['Jupyter docs ↗','https://docs.jupyter.org/']]){const a=document.createElement('a');a.textContent=label;a.setAttribute('aria-label',label.replace(/docs/gi,'documentation'));a.href=href;a.target='_blank';a.rel='noopener noreferrer';shell.drawer.body.append(a);}
function syncSource(){if(sourceEditor){sourceSync=true;sourceEditor.setValue(serialize(model),-1);sourceSync=false;}}
function toggleSource(){sourceMode=!sourceMode;$('source-pane').hidden=!sourceMode;$('cells').hidden=sourceMode;$('append-cell').hidden=sourceMode;if(sourceMode){if(!sourceEditor){sourceEditor=ace.edit('source-editor');sourceEditor.session.setMode('ace/mode/markdown');sourceEditor.setOptions({showPrintMargin:false,useWorker:false,fontSize:14});sourceEditor.on('change',()=>{if(sourceSync)return;clearTimeout(sourceTimer);sourceTimer=setTimeout(()=>{if(!sourceMode)return;model.editSource(sourceEditor.getValue());cells.render();changed();},750);});}syncSource();sourceEditor.focus();}else{clearTimeout(sourceTimer);model.editSource(sourceEditor.getValue());structure();}}
async function importText(text){const revision=++loadRevision;status('Reading notebook…');const result=await importNotebook(text,{kernel});if(revision!==loadRevision){status('Import cancelled because the notebook changed.');return;}load(result.doc,{imported:true,result});urlState.write(snapshot());status('Imported. Auto-run is off; use Run all.');}
async function openFile(file){if(!file)return;try{if(file.size>50*1024*1024)throw Error('File exceeds the 50 MiB import limit. Export a smaller notebook first.');await importText(await file.text());}catch(error){status(error.message);}}
$('file-open').onchange=()=>{void openFile($('file-open').files[0]);$('file-open').value='';};
document.addEventListener('dragover',event=>{if(event.dataTransfer.types.includes('Files'))event.preventDefault();});document.addEventListener('drop',event=>{if(event.dataTransfer.files.length){event.preventDefault();void openFile(event.dataTransfer.files[0]);}});
const openURLDialog=kit.createDialog('Open from URL',{id:'open-url-dialog'}),urlInput=document.createElement('input'),urlFetch=document.createElement('button'),urlStatus=document.createElement('p');urlInput.type='url';urlInput.id='open-url-input';urlInput.placeholder='https://…/notebook.ipynb';urlInput.setAttribute('aria-label','Notebook URL');urlFetch.textContent='Fetch notebook';urlFetch.id='fetch-notebook';urlStatus.textContent='Only fetch URLs you trust. Code remains idle until you run it.';openURLDialog.body.append(urlInput,urlFetch,urlStatus);
urlFetch.onclick=async()=>{try{const url=new URL(urlInput.value);if(url.protocol!=='https:'||url.username||url.password)throw Error('Enter an HTTPS URL without credentials.');urlFetch.disabled=true;urlStatus.textContent='Fetching…';const revision=loadRevision,response=await fetch(url,{credentials:'omit',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(30000)});if(!response.ok)throw Error(`Download failed (${response.status}).`);const text=kit.text(await kit.readResponse(response,50*1024*1024));if(revision!==loadRevision)throw Error('Notebook changed during download. Fetch again to open it.');await importText(text);openURLDialog.dialog.close();}catch(error){urlStatus.textContent=error.message+' The server must allow CORS.';}finally{urlFetch.disabled=false;}};
const downloadDialog=kit.createDialog('Download notebook',{id:'download-dialog'}),include=document.createElement('input');include.type='checkbox';include.checked=true;include.id='include-outputs';const includeLabel=document.createElement('label');includeLabel.append(include,document.createTextNode('Include current outputs in .ipynb'));downloadDialog.body.append(includeLabel);
for(const [format,label]of [['ipynb','Jupyter .ipynb'],['quarto','Quarto .qmd'],['myst','MyST .md'],['percent','Jupytext percent .py'],['marimo','marimo .py']]){const b=document.createElement('button');b.id='download-'+format;b.textContent=label;b.onclick=async()=>{try{b.disabled=true;const result=await exportNotebook(model,format,{kernel,outputs:include.checked});kit.download(new Blob([result.source],{type:'text/plain;charset=utf-8'}),'notebook.'+result.extension);showReport($('report'),result.report);downloadDialog.dialog.close();}catch(error){status(error.message);}finally{b.disabled=false;}};downloadDialog.body.append(b);}
const shortcuts=kit.createDialog('Keyboard shortcuts',{id:'shortcuts-dialog'});const shortcutsText=document.createElement('p');shortcutsText.textContent='Enter: edit · Escape: command mode / render Markdown · Ctrl/Cmd+Enter: run cell · Shift+Enter: run and advance · Alt+Enter: run and insert · A/B: insert above/below · D D: delete · M/Y: Markdown/Python · Z: undo structure · ↑/↓: select cell.';shortcuts.body.append(shortcutsText);
kit.mountMobileTabs({panels:[{label:'Notebook',panel:$('notebook-pane')},{label:'Outline',panel:$('outline-pane')},{label:'Input',panel:$('input-pane')}],container:$('workspace'),breakpoint:761});
async function openAi(cell){try{if(!aiUI)aiUI=await mountAi({getSnapshot:snapshot,getFingerprint:fingerprint,container:shell.drawer.body,status,getSelected:withIndex=>{const selected=model.cells.find(c=>c.id===cells.selected);return withIndex?{index:model.cells.indexOf(selected)+1}:selected;},onApply:doc=>{model.saveUndo();scheduler.stop('AI change accepted — use Run to execute.');model.editSource(doc.src);model.settings={...doc.notebook};cells.render();syncSettings();syncSource();changed(undefined,{run:false});}});aiUI?.open(cell);}catch(error){status(error.message);}}
async function openLocation(){try{
 const intent=urlState.parse(location.href);
 if(intent.kind==='source')load(intent.doc);
 else if(intent.kind==='example'){const example=examples.find(item=>item.id===intent.id);if(!example)throw Error('Unknown example.');load({src:example.src,notebook:example.settings});urlState.write(snapshot());}
 else if(intent.kind==='cid'){await hashbinPanel.load(intent.cid);}
 else if(intent.kind==='publish'){const result=await hashbinPanel.published(location.hash);if(result?.error)history.replaceState(null,'',urlState.build(snapshot()).href);}
 if(!intent.run){model.settings.autorun=false;syncSettings();}
 const suggested=new URL(location.href).searchParams.get('open');if(suggested){urlInput.value=suggested;openURLDialog.open();status('A link suggests a notebook URL. Click Fetch notebook to download it.');}
 if(model.settings.autorun&&!suggested)void scheduler.run({automatic:true});
 const selected=new URL(location.href).searchParams.get('cell');if(selected&&cells.nodes.has(selected)){cells.select(selected);cells.nodes.get(selected).node.scrollIntoView();}
}catch(error){status(error.message);}}
let callback=false;try{callback=handleAiCallback();}catch(error){callback=true;status(error.message);}
if(!callback)await openLocation();cells.render();syncSettings();outline();document.body.dataset.ready='true';
window.addEventListener('popstate',openLocation);window.addEventListener('hashchange',openLocation);
globalThis.NotebookOnline={model,cells,snapshot,load,importText,select:id=>cells.select(id),run:runSelected,get editor(){return sourceEditor;},setSource:src=>{model.editSource(src);structure();},urlState,kernels:{python:kernel},scheduler,get ai(){return aiUI;}};
const offline=new kit.OfflineClient({onStatus:result=>{shell.offlineStatus.textContent=result.ready?'Available offline':result.error??'Preparing offline copy…';},onUpdate:()=>{const button=document.createElement('button');button.textContent='Update and reload';button.onclick=()=>{drafts.attempt(snapshot(),true);navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});offline.activateUpdate();};shell.drawer.body.append(button);}});
offline.init().catch(error=>{shell.offlineStatus.textContent=error.message;});
const repair=document.createElement('button');repair.id='offline-repair';repair.textContent='Repair offline copy';repair.onclick=async()=>{repair.disabled=true;try{await offline.repair();}catch(error){status(error.message);}finally{repair.disabled=false;}};shell.drawer.body.append(repair);
const packages=document.createElement('button');packages.id='offline-packages';packages.textContent='Make packages available offline';packages.onclick=async()=>{packages.disabled=true;try{await offline.init();const worker=offline.registration?.active;if(!worker)throw Error('Wait for offline installation to finish, then retry.');const channel=new MessageChannel();channel.port1.onmessage=({data})=>{status(data.error??(data.ready?'Packages are available offline.':`Caching packages… ${data.progress}/${data.total}`));if(data.ready||data.error){channel.port1.close();packages.disabled=false;}};worker.postMessage({type:'cache-packages'},[channel.port2]);}catch(error){status(error.message);packages.disabled=false;}};shell.drawer.body.append(packages);
