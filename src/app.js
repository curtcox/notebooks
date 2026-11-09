import {kit,config,type,urlState} from './fragment-config.mjs';
import {Notebook} from './model/notebook.js';
import {serialize} from './model/notebook-markdown.js';
import {CellList} from './ui/cell-list.js';
import {examples} from './examples.js';
const $=id=>document.getElementById(id),status=text=>{$('status').textContent=text;};
export const model=new Notebook({src:examples[0].src});
let sourceEditor,sourceMode=false,sourceTimer,savedCID=null;
const drafts=new kit.LocalDrafts({storage:kit.createStorage({prefix:config.storagePrefix}),key:'work',serialize:doc=>urlState.documents.serialize(doc),parse:text=>urlState.documents.parse(text)});
const snapshot=()=>model.snapshot();
function changed(id,{run=true}={}) {savedCID=null;drafts.attempt(snapshot(),true);urlState.write(snapshot());outline();if(id)cells.update(id);}
function structure(id){cells.render();if(id)cells.select(id);changed(id);}
function load(doc,{imported=false}={}){model.load(doc);if(imported)model.settings.autorun=false;drafts.opened();cells.render();syncSettings();outline();if(sourceEditor)sourceEditor.setValue(serialize(model),-1);}
function outline(){const nav=$('outline');nav.replaceChildren();let title='Untitled notebook';for(const cell of model.cells){if(cell.kind==='markdown')for(const match of cell.source.matchAll(/^(#{1,6})\s+(.+)$/gm)){if(title==='Untitled notebook')title=match[2];const a=document.createElement('a');a.textContent=(cell.error?'⚠ ':'')+match[2];a.href=`#cell-${cell.id}`;a.style.paddingLeft=`${(match[1].length-1)*8}px`;a.onclick=e=>{e.preventDefault();cells.select(cell.id);cells.nodes.get(cell.id).node.scrollIntoView({behavior:'smooth'});};nav.append(a);}}$('title').textContent=title;document.title=`${title} · Notebook Online`;}
const cells=new CellList({container:$('cells'),model,onEdit:changed,onStructure:structure,onRun:()=>status('Python execution is being installed.'),onAsk:()=>status('AI assistance is being installed.')});
const shell=kit.createShell({config,actions:[
  {id:'run',label:'▶ Run',onClick:()=>cells.onRun(cells.selected)},
  {id:'run-all',label:'Run all',onClick:()=>status('Python execution is being installed.')},
  {id:'stop',label:'Stop',onClick:()=>status('Ready')},
  {id:'restart',label:'Restart',extra:true,onClick:()=>status('Ready')},
  {id:'add-cell',label:'+ Cell',onClick:()=>{const next=model.insert(model.cells.length);structure(next.id);cells.edit(next.id);}},
  {id:'open',label:'Open',extra:true,onClick:()=>$('file-open').click()},
  {id:'download',label:'Download',extra:true,onClick:()=>kit.download(new Blob([serialize(model)],{type:'text/markdown'}),'notebook.qmd')},
  {id:'share-open',label:'Share',onClick:()=>share.open()},
  {id:'qr-open',label:'QR',extra:true,onClick:()=>qr.open(savedCID?urlState.link(location.href,savedCID):urlState.build(snapshot()).href)},
  {id:'source-toggle',label:'Source',extra:true,onClick:()=>toggleSource()},
  {id:'undo',label:'Undo structure',extra:true,onClick:()=>{model.undo();structure();}}
]});
$('run').classList.add('primary');$('stop').disabled=true;
const mode=document.createElement('select');mode.id='mode';mode.setAttribute('aria-label','Execution mode');mode.innerHTML='<option value="reactive">Reactive</option><option value="linear">Linear</option>';
mode.onchange=()=>{if(!confirm('Changing execution mode restarts the kernel. Continue?')){mode.value=model.settings.mode;return;}model.settings.mode=mode.value;model.settings.autorun=mode.value==='reactive';model.revision++;syncSettings();structure();};
const auto=document.createElement('input');auto.type='checkbox';auto.id='autorun';const autoLabel=document.createElement('label');autoLabel.append(auto,document.createTextNode('Auto-run'));auto.onchange=()=>{model.settings.autorun=auto.checked;changed();};shell.toolbar.insertBefore(mode,$('add-cell'));shell.toolbar.insertBefore(autoLabel,$('add-cell'));
function syncSettings(){mode.value=model.settings.mode;auto.checked=model.settings.autorun;$('mode-badge').textContent=mode.value==='reactive'?'Reactive':'Linear';$('stdin').value=model.settings.stdin;}
$('stdin').oninput=()=>{model.settings.stdin=$('stdin').value;changed();};
const share=kit.createShareDialog({urlState,getSnapshot:snapshot});
const qr=kit.createQrDialog({config,urlState,onLoad:async intent=>{if(intent.kind==='cid')status('HashBin integration is being installed.');else load(intent.doc??intent.intent?.doc);}});
drafts.mount(shell.drawer.body,doc=>{load(doc);changed();});
const save=document.createElement('button');save.id='hashbin-save';save.textContent='Save to HashBin';save.disabled=true;save.title='Saving requires the owner to register Notebook Online with HashBin.';shell.drawer.body.append(save);
const note=document.createElement('p');note.textContent='HashBin saving will be available after app registration. R execution requires approval in this build.';shell.drawer.body.append(note);
for(const [label,href]of [['Python docs ↗','https://docs.python.org/3/'],['Pyodide packages ↗','https://pyodide.org/en/stable/usage/packages-in-pyodide.html'],['R docs ↗','https://cran.r-project.org/manuals.html'],['DuckDB SQL ↗','https://duckdb.org/docs/stable/sql/introduction'],['marimo docs ↗','https://docs.marimo.io/'],['Jupyter docs ↗','https://docs.jupyter.org/']]){const a=document.createElement('a');a.textContent=label;a.href=href;a.target='_blank';a.rel='noopener noreferrer';shell.drawer.body.append(a);}
function toggleSource(){sourceMode=!sourceMode;$('source-pane').hidden=!sourceMode;$('cells').hidden=sourceMode;$('append-cell').hidden=sourceMode;if(sourceMode){if(!sourceEditor){sourceEditor=ace.edit('source-editor');sourceEditor.session.setMode('ace/mode/markdown');sourceEditor.setOptions({showPrintMargin:false,useWorker:false,fontSize:14});sourceEditor.on('change',()=>{clearTimeout(sourceTimer);sourceTimer=setTimeout(()=>{if(!sourceMode)return;model.editSource(sourceEditor.getValue());cells.render();changed();},750);});}sourceEditor.setValue(serialize(model),-1);sourceEditor.focus();}else{clearTimeout(sourceTimer);model.editSource(sourceEditor.getValue());structure();}}
$('append-cell').onclick=()=>$('add-cell').click();
$('file-open').onchange=async()=>{const file=$('file-open').files[0];if(file){if(file.size>5*1024*1024){status('File exceeds the 5 MiB limit.');return;}load({src:await file.text()},{imported:true});status('Imported source. Auto-run is off.');}$('file-open').value='';};
kit.mountMobileTabs({panels:[{label:'Notebook',panel:$('notebook-pane')},{label:'Outline',panel:$('outline-pane')},{label:'Input',panel:$('input-pane')}],container:$('workspace'),breakpoint:761});
async function openLocation(){try{const intent=urlState.parse(location.href);if(intent.kind==='source')load(intent.doc);else if(intent.kind==='example'){const example=examples.find(item=>item.id===intent.id);if(example)load({src:example.src});else status('Unknown example.');}else if(intent.kind==='cid')status('HashBin integration is being installed.');if(!intent.run){model.settings.autorun=false;syncSettings();}}catch(error){status(error.message);}}
await openLocation();cells.render();syncSettings();outline();document.body.dataset.ready='true';
window.addEventListener('popstate',openLocation);window.addEventListener('hashchange',openLocation);
globalThis.NotebookOnline={model,cells,snapshot,load,select:id=>cells.select(id),run:id=>cells.onRun(id),get editor(){return sourceEditor;},setSource:src=>{model.editSource(src);structure();},urlState};
const offline=new kit.OfflineClient({onStatus:result=>{shell.offlineStatus.textContent=result.ready?'Available offline':result.error??'Preparing offline copy…';},onUpdate:()=>{const button=document.createElement('button');button.textContent='Update and reload';button.onclick=()=>{drafts.attempt(snapshot(),true);offline.activateUpdate();navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});};shell.drawer.body.append(button);}});
offline.init().catch(error=>{shell.offlineStatus.textContent=error.message;});
