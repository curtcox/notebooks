import {KINDS} from '../model/notebook-markdown.js';
import {renderMarkdown} from './markdown-view.js';
import {htmlFrame, renderOutput} from './output-view.js';
const el=(tag,text,cls)=>{const n=document.createElement(tag);if(text)n.textContent=text;if(cls)n.className=cls;return n;};
export class CellList {
  constructor({container,model,onEdit,onStructure,onRun,onAsk,onWidget}) {
    Object.assign(this,{container,model,onEdit,onStructure,onRun,onAsk,onWidget});this.editors=new Map();this.nodes=new Map();this.lastD=0;
    this.observer=new IntersectionObserver(entries=>{for(const entry of entries){const id=entry.target.dataset.cellId;if(entry.isIntersecting)this.mountEditor(id);else if(this.model.cells.length>50&&this.selected!==id)this.releaseEditor(id);}},{rootMargin:'700px'});
    this.container.addEventListener('keydown',e=>this.key(e));
  }
  render() {
    for(const editor of this.editors.values())editor.destroy();this.editors.clear();this.observer.disconnect();this.nodes.clear();this.container.replaceChildren();
    this.model.cells.forEach((cell,index)=>{
      const node=el('article',null,'cell');node.id=`cell-${cell.id}`;node.dataset.cellId=cell.id;node.tabIndex=0;
      const head=el('div',null,'cell-head'),number=el('span',`${index+1}`,'cell-number'),kind=el('select');kind.setAttribute('aria-label',`Cell ${index+1} kind`);
      KINDS.forEach(value=>{const opt=el('option',value==='r'?'R':value[0].toUpperCase()+value.slice(1));opt.value=value;kind.append(opt);});kind.value=cell.kind;
      kind.onchange=()=>{this.model.setKind(cell.id,kind.value);this.onStructure(cell.id);};
      const run=el('button','▶');run.title='Run cell';run.setAttribute('aria-label',`Run cell ${index+1}`);run.onclick=()=>this.onRun(cell.id);
      const state=el('span',null,'cell-state'),more=el('button','⋯');more.setAttribute('aria-label',`Cell ${index+1} actions`);more.setAttribute('aria-expanded','false');
      const menu=el('div',null,'cell-menu');menu.hidden=true;more.onclick=()=>{menu.hidden=!menu.hidden;more.setAttribute('aria-expanded',String(!menu.hidden));};
      const action=(label,fn)=>{const button=el('button',label);button.onclick=()=>{menu.hidden=true;fn();};menu.append(button);};
      action('Move up',()=>{this.model.move(cell.id,-1);this.onStructure(cell.id);});action('Move down',()=>{this.model.move(cell.id,1);this.onStructure(cell.id);});
      action('Duplicate',()=>{const next=this.model.duplicate(cell.id);this.onStructure(next.id);});action('Delete',()=>{this.model.remove(cell.id);this.onStructure();});
      action(cell.options.disabled?'Enable':'Disable',()=>{cell.options.disabled=!cell.options.disabled;this.model.revision++;this.onStructure(cell.id);});
      action(cell.options['hide-code']?'Show code':'Hide code',()=>{cell.options['hide-code']=!cell.options['hide-code'];this.onStructure(cell.id);});
      action('Clear output',()=>{cell.outputs=[];this.update(cell.id);});action('Insert above',()=>{const next=this.model.insert(index);this.onStructure(next.id);});
      action('Ask AI about cell',()=>this.onAsk?.(cell));action('Copy cell link',()=>{const url=new URL(location.href);url.searchParams.set('cell',cell.id);navigator.clipboard.writeText(url.href).catch(()=>{});});
      const deps=el('div',null,'cell-deps'),editor=el('div',null,'cell-editor'),preview=el('div',null,'cell-preview'),output=el('div',null,'cell-output');
      editor.setAttribute('aria-label',`Cell ${index+1} source`);
      preview.ondblclick=()=>this.edit(cell.id);preview.title='Double-click to edit';
      head.append(number,kind,run,state,more);node.append(head,menu,deps,editor,preview,output);
      node.addEventListener('focusin',()=>this.select(cell.id));node.addEventListener('click',()=>this.select(cell.id));
      node.draggable=true;head.ondragstart=e=>{e.dataTransfer.setData('text/notebook-cell',cell.id);};node.ondragover=e=>e.preventDefault();node.ondrop=e=>{const id=e.dataTransfer.getData('text/notebook-cell');if(!id)return;e.preventDefault();const from=this.model.cells.findIndex(c=>c.id===id);this.model.move(id,index-from);this.onStructure(id);};
      this.nodes.set(cell.id,{node,state,deps,editor,preview,output,number});this.container.append(node);this.update(cell.id);this.observer.observe(node);
    });
    this.select(this.selected&&this.nodes.has(this.selected)?this.selected:this.model.cells[0]?.id);
  }
  mountEditor(id) {
    const cell=this.model.cells.find(c=>c.id===id),view=this.nodes.get(id);if(!cell||!view||this.editors.has(id)||view.editor.hidden)return;
    const editor=ace.edit(view.editor);editor.setTheme('ace/theme/chrome');editor.session.setMode(`ace/mode/${cell.kind==='raw'?'markdown':cell.kind}`);editor.setOptions({minLines:3,maxLines:35,fontSize:14,showPrintMargin:false,useWorker:false,enableBasicAutocompletion:true,enableLiveAutocompletion:false});editor.setValue(cell.source,-1);
    editor.session.on('change',()=>{cell.source=editor.getValue();cell.status='stale';this.model.revision++;this.onEdit(cell.id);});
    editor.commands.addCommand({name:'runCell',bindKey:{win:'Ctrl-Enter',mac:'Command-Enter'},exec:()=>this.onRun(id)});
    editor.commands.addCommand({name:'runAdvance',bindKey:'Shift-Enter',exec:()=>{this.onRun(id);this.advance(id);}});
    editor.commands.addCommand({name:'runInsert',bindKey:'Alt-Enter',exec:()=>{this.onRun(id);const next=this.model.insert(this.model.cells.indexOf(cell)+1);this.onStructure(next.id);this.edit(next.id);}});
    editor.commands.addCommand({name:'commandMode',bindKey:'Esc',exec:()=>{editor.blur();this.finishEdit(id);view.node.focus();}});
    this.editors.set(id,editor);
  }
  releaseEditor(id) {const editor=this.editors.get(id);if(editor){editor.destroy();this.editors.delete(id);const view=this.nodes.get(id);view.editor.textContent=this.model.cells.find(c=>c.id===id)?.source??'';}}
  edit(id) {const view=this.nodes.get(id);if(!view)return;view.editor.hidden=false;view.preview.hidden=true;this.mountEditor(id);this.editors.get(id)?.focus();}
  finishEdit(id) {const cell=this.model.cells.find(c=>c.id===id);if(cell?.kind==='markdown'){this.releaseEditor(id);this.update(id);}}
  select(id) {this.selected=id;for(const [key,{node}]of this.nodes)node.classList.toggle('selected',key===id);}
  advance(id) {const i=this.model.cells.findIndex(c=>c.id===id);if(i===this.model.cells.length-1){const next=this.model.insert(i+1);this.onStructure(next.id);this.edit(next.id);}else{this.select(this.model.cells[i+1].id);this.nodes.get(this.selected)?.node.focus();}}
  update(id) {
    const cell=this.model.cells.find(c=>c.id===id),view=this.nodes.get(id);if(!cell||!view)return;
    view.state.textContent=cell.options.disabled?'disabled':cell.error??cell.status;view.state.classList.toggle('error',Boolean(cell.error)||cell.status==='error');
    view.number.textContent=this.model.settings.mode==='linear'&&cell.executionCount!=null?`[${cell.executionCount}]`:String(this.model.cells.indexOf(cell)+1);
    view.deps.textContent=this.model.settings.mode==='reactive'&&cell.analysis?`uses ${cell.analysis.refs.join(', ')||'—'} · defines ${cell.analysis.defs.join(', ')||'—'}`:'';
    const markdown=cell.kind==='markdown';view.editor.hidden=markdown||cell.options['hide-code']===true||cell.options.echo===false;view.preview.hidden=!markdown;
    if(markdown){if(/<\/?[a-z][^>]*>/i.test(cell.source)){const html=globalThis.markdownit({html:true}).render(cell.source);view.preview.replaceChildren(htmlFrame(html));}else renderMarkdown(view.preview,cell.source);}
    view.output.replaceChildren();for(const output of cell.outputs??[])renderOutput(view.output,output,{widget:(container,spec)=>this.onWidget?.(container,spec)});
  }
  key(e) {
    if(e.target.closest('.ace_editor,input,textarea,select,button'))return;
    const cell=this.model.cells.find(c=>c.id===this.selected);if(!cell)return;
    const i=this.model.cells.indexOf(cell),key=e.key.toLowerCase();
    if(key==='enter'){e.preventDefault();if(e.shiftKey){this.onRun(cell.id);this.advance(cell.id);}else if(e.ctrlKey||e.metaKey)this.onRun(cell.id);else this.edit(cell.id);}
    else if(key==='a'||key==='b'){e.preventDefault();const next=this.model.insert(i+(key==='b'?1:0));this.onStructure(next.id);}
    else if(key==='d'){if(Date.now()-this.lastD<500){this.model.remove(cell.id);this.onStructure();}this.lastD=Date.now();}
    else if(key==='z'){this.model.undo();this.onStructure();}
    else if(key==='m'||key==='y'){this.model.setKind(cell.id,key==='m'?'markdown':'python');this.onStructure(cell.id);}
    else if(key==='arrowdown'||key==='arrowup'){e.preventDefault();this.select(this.model.cells[Math.max(0,Math.min(this.model.cells.length-1,i+(key==='arrowdown'?1:-1)))].id);this.nodes.get(this.selected).node.focus();}
  }
}
