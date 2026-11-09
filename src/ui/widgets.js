import {renderMarkdown} from './markdown-view.js';import {htmlFrame} from './output-view.js';
const KINDS=new Set(['slider','range_slider','number','text','text_area','checkbox','switch','dropdown','radio','multiselect','button','run_button','date','table','array','dictionary','form','hstack','vstack','callout','accordion','tabs','markdown','html','text']);
export function validateSpec(spec,depth=0){
 if(!spec||typeof spec!=='object'||Array.isArray(spec)||!KINDS.has(spec.kind)||depth>8)throw Error('Unsupported widget specification.');
 if(spec.id!==undefined&&(typeof spec.id!=='string'||spec.id.length>160))throw Error('Invalid widget id.');
 if(spec.labels!==undefined&&(!Array.isArray(spec.labels)||spec.labels.length>100||spec.labels.some(x=>typeof x!=='string'||x.length>65536)))throw Error('Invalid layout labels.');
 for(const key of ['label','text'])if(spec[key]!==undefined&&(typeof spec[key]!=='string'||spec[key].length>65536))throw Error('Widget text exceeds its limit.');
 for(const key of ['min','max','step'])if(spec[key]!=null&&(!Number.isFinite(spec[key])||Math.abs(spec[key])>1e15))throw Error('Invalid widget numeric bounds.');
 if(spec.min!=null&&spec.max!=null&&spec.min>spec.max||spec.step!=null&&spec.step<=0)throw Error('Invalid widget range.');
 if(spec.options!==undefined&&(!Array.isArray(spec.options)||spec.options.length>1000||spec.options.some(x=>!['string','number','boolean'].includes(typeof x)||String(x).length>65536)))throw Error('Invalid widget options.');
 if(spec.children!==undefined&&(!Array.isArray(spec.children)||spec.children.length>100))throw Error('Too many widget children.');
 for(const child of spec.children??[])validateSpec(child,depth+1);
 if(JSON.stringify(spec.value??null).length>65536)throw Error('Widget value exceeds its limit.');
 return spec;
}
export function renderWidget(container,input,onChange){
 let spec;try{spec=validateSpec(input);}catch(error){const p=document.createElement('p');p.textContent=error.message;container.append(p);return;}
 const div=document.createElement('div');div.className=`widget widget-${spec.kind}`;container.append(div);
 const send=value=>{if(spec.id)onChange(spec.id,value);};
 if(['markdown','html','text'].includes(spec.kind)){
  if(spec.kind==='text'){div.textContent=spec.text??'';return;}
  if(spec.kind==='html'){div.append(htmlFrame(spec.text??''));return;}
  const text=spec.text??'',widgets=new Map((spec.children??[]).map(child=>[child.id,child]));let last=0;
  for(const match of text.matchAll(/\[\[nb-widget:([^\]]+)\]\]/g)){const chunk=document.createElement('div');renderMarkdown(chunk,text.slice(last,match.index));div.append(chunk);const child=widgets.get(match[1]);if(child)renderWidget(div,child,onChange);last=match.index+match[0].length;}
  const rest=document.createElement('div');renderMarkdown(rest,text.slice(last));div.append(rest);return;
 }
 if(['hstack','vstack','callout','accordion','tabs','array','dictionary','form'].includes(spec.kind)){
  if(spec.label){const title=document.createElement('strong');title.textContent=spec.label;div.append(title);}
  const values=(spec.children??[]).map(c=>c.value);
  if(spec.kind==='tabs'){
   const nav=document.createElement('nav'),panels=[];nav.setAttribute('aria-label','Output tabs');div.append(nav);
   for(const [index,child]of (spec.children??[]).entries()){const button=document.createElement('button'),panel=document.createElement('section');button.textContent=spec.labels?.[index]??`Tab ${index+1}`;panel.hidden=index!==0;button.setAttribute('aria-pressed',String(index===0));button.onclick=()=>{panels.forEach((p,i)=>p.hidden=i!==index);for(const [i,b]of [...nav.children].entries())b.setAttribute('aria-pressed',String(i===index));};nav.append(button);panels.push(panel);div.append(panel);renderWidget(panel,child,onChange);}return;
  }
  if(spec.kind==='accordion'){for(const [index,child]of (spec.children??[]).entries()){const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent=spec.labels?.[index]??`Section ${index+1}`;details.append(summary);div.append(details);renderWidget(details,child,onChange);}return;}
  for(const [index,child]of (spec.children??[]).entries())renderWidget(div,child,(id,value)=>{values[index]=value;if(spec.kind!=='form')onChange(id,value);});
  if(spec.kind==='form'){const button=document.createElement('button');button.textContent=spec.label||'Submit';button.onclick=()=>send(values.length===1?values[0]:values);div.append(button);}return;
 }
 const label=document.createElement('label');label.textContent=spec.label||spec.kind;div.append(label);let control;
 const setBounds=node=>{for(const key of ['min','max','step'])if(spec[key]!=null)node[key]=spec[key];};
 switch(spec.kind){
 case 'button':case 'run_button':control=document.createElement('button');control.textContent=spec.label||'Run';control.onclick=()=>send(spec.kind==='run_button'?true:Number(spec.value??0)+1);break;
 case 'radio':{control=document.createElement('div');control.setAttribute('role','radiogroup');for(const [i,value]of (spec.options??[]).entries()){const row=document.createElement('label'),radio=document.createElement('input');radio.type='radio';radio.name=spec.id;radio.value=i;radio.checked=spec.value===value;radio.onchange=()=>send(value);row.append(radio,document.createTextNode(String(value)));control.append(row);}break;}
 case 'dropdown':case 'multiselect':case 'table':control=document.createElement('select');control.multiple=['multiselect','table'].includes(spec.kind);for(const [i,value]of (spec.options??[]).entries()){const option=document.createElement('option');option.value=String(i);option.textContent=String(value);option.selected=control.multiple?(spec.value??[]).includes(spec.kind==='table'?i:value):spec.value===value;control.append(option);}control.onchange=()=>send(control.multiple?[...control.selectedOptions].map(o=>spec.kind==='table'?Number(o.value):spec.options[Number(o.value)]):spec.options[Number(control.value)]);break;
 case 'text_area':control=document.createElement('textarea');control.value=String(spec.value??'');control.maxLength=65536;control.onchange=()=>send(control.value);break;
 case 'range_slider':{control=document.createElement('div');const values=Array.isArray(spec.value)?spec.value:[spec.min,spec.max];values.forEach((value,i)=>{const range=document.createElement('input');range.type='range';setBounds(range);range.value=value;range.setAttribute('aria-label',`${spec.label||'Range'} ${i?'end':'start'}`);range.onchange=()=>{values[i]=Number(range.value);if(values[0]<=values[1])send([...values]);};control.append(range);});break;}
 default:control=document.createElement('input');control.type=({slider:'range',number:'number',checkbox:'checkbox',switch:'checkbox',date:'date'})[spec.kind]??'text';setBounds(control);if(control.type==='checkbox')control.checked=Boolean(spec.value);else control.value=String(spec.value??'');control.maxLength=65536;control.onchange=()=>send(control.type==='checkbox'?control.checked:['range','number'].includes(control.type)?Number(control.value):control.value);
 }
 if(spec.id){control.id=`widget-${spec.id.replaceAll(':','-')}`;label.htmlFor=control.id;control.dataset.widgetId=spec.id;}div.append(control);
 if(spec.kind==='slider'){const out=document.createElement('output');out.textContent=String(spec.value);control.oninput=()=>{out.textContent=control.value;};div.append(out);}
}
