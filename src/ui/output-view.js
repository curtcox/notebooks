import {renderMarkdown} from './markdown-view.js';
export const MAX_OUTPUT = 1024 * 1024;
export function htmlFrame(html) {
  const frame=document.createElement('iframe');frame.setAttribute('sandbox','');frame.title='Isolated HTML output';frame.referrerPolicy='no-referrer';
  frame.srcdoc=`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'; font-src data:; base-uri 'none'; form-action 'none'"><style>body{font:14px system-ui;overflow-wrap:anywhere}table{border-collapse:collapse}td,th{padding:5px;border:1px solid #ddd}img,svg{max-width:100%}</style>${html.slice(0,MAX_OUTPUT)}`;
  return frame;
}
export function renderOutput(container, output, {widget} = {}) {
  if(output.imported){const note=document.createElement('div');note.className='imported';note.textContent='Imported (not yet run)';container.append(note);}
  const data=output.data??{};
  if(output.output_type==='clear_output'){container.replaceChildren();return;}
  if(output.output_type==='stream'||output.type==='text') {const pre=document.createElement('pre');pre.className=output.name??output.stream??'stdout';pre.textContent=String(output.text??'').slice(0,MAX_OUTPUT);container.append(pre);return;}
  if(output.output_type==='error'){const pre=document.createElement('pre');pre.className='stderr';for(const line of (output.traceback??[`${output.ename}: ${output.evalue}`]).join('\n').slice(0,MAX_OUTPUT).split('\n')){const match=/File "cell-([^"]+)\.py", line (\d+)/.exec(line);if(match){const a=document.createElement('a');a.textContent=line;a.href='#cell-'+match[1];a.onclick=e=>{e.preventDefault();container.dispatchEvent(new CustomEvent('cell-line',{bubbles:true,detail:{id:match[1],line:Number(match[2])}}));};pre.append(a,document.createTextNode('\n'));}else pre.append(document.createTextNode(line+'\n'));}container.append(pre);return;}
  const spec=data['application/vnd.notebook-online.widget+json'];if(spec&&widget){widget(container,spec);return;}
  if(typeof data['text/html']==='string'){container.append(htmlFrame(data['text/html']));return;}
  for(const mime of ['image/svg+xml','image/png','image/jpeg'])if(typeof data[mime]==='string'&&data[mime].length<8*MAX_OUTPUT){const img=document.createElement('img');img.alt='Cell output';img.src=mime==='image/svg+xml'?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(data[mime]):`data:${mime};base64,${data[mime]}`;const link=document.createElement('a');link.href=img.src;link.download='cell-output.'+(mime==='image/svg+xml'?'svg':mime==='image/png'?'png':'jpg');link.textContent='Download image';container.append(img,link);return;}
  if(typeof data['text/markdown']==='string'){const div=document.createElement('div');renderMarkdown(div,data['text/markdown']);container.append(div);return;}
  if(typeof data['text/latex']==='string'){const div=document.createElement('div');globalThis.katex.render(data['text/latex'].replace(/^\$+|\$+$/g,''),div,{trust:false,throwOnError:false,displayMode:true});container.append(div);return;}
  if(data['application/json']!==undefined){const details=document.createElement('details'),summary=document.createElement('summary'),pre=document.createElement('pre');summary.textContent='JSON';pre.textContent=JSON.stringify(data['application/json'],null,2).slice(0,MAX_OUTPUT);details.append(summary,pre);container.append(details);return;}
  const pre=document.createElement('pre');pre.textContent=String(data['text/plain']??`Unsupported output: ${Object.keys(data).join(', ')}`).slice(0,MAX_OUTPUT);container.append(pre);
}
