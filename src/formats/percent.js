import {cell} from '../model/notebook-markdown.js';import {report} from './report.js';
export function importPercent(source){
 const r=report('Jupytext percent .py'),cells=[];let current=null;
 const header=[];
 for(const line of source.replaceAll('\r\n','\n').split('\n')){
  const match=/^# %%(?:\s+\[(markdown|raw)\])?(?:\s+(.*))?$/.exec(line);
  if(match){if(current)cells.push(current);const options={};for(const m of (match[2]??'').matchAll(/([\w-]+)=("(?:[^"\\]|\\.)*"|'[^']*'|\[[^\]]*\]|\S+)/g)){try{options[m[1]]=JSON.parse(m[2].replace(/^'|'$/g,'"'));}catch{options[m[1]]=m[2];}}current=cell(match[1]??'python','',options);current.lines=[];}
  else if(current)current.lines.push(line);else header.push(line);
 }
 if(current)cells.push(current);
 for(const c of cells){c.source=c.lines.join('\n').replace(/^\n+|\n+$/g,'');delete c.lines;if(['markdown','raw'].includes(c.kind))c.source=c.source.split('\n').map(line=>line.replace(/^# ?/,'')).join('\n');else{c.source=c.source.replace(/^# (%%(?:sql|R).*|%\w+.*)$/gm,'$1');if(/^%%(?:sql|R)\b/.test(c.source)){c.kind=c.source.startsWith('%%R')?'r':'sql';c.source=c.source.split('\n').slice(1).join('\n');}}}
 const mode=/#\s+notebook-online-mode: (linear|reactive)/.exec(header.join('\n'))?.[1]??'linear';
 if(!cells.length)cells.push(cell('python',source));r.kept.push('Source and percent cell metadata.');if(header.some(line=>line.trim()&&!line.startsWith('# notebook-online-')))r.dropped.push('Jupytext header retained only by the source file; unknown header fields are not mapped.');
 return {cells,frontMatter:'',settings:{mode,autorun:false,stdin:''},report:r};
}
export function exportPercent(model){
 const r=report('Jupytext percent .py');r.kept.push('Source, cell kinds and mode.');
 if(model.cells.some(c=>c.id||c.options.name))r.dropped.push('Cell ids and marimo function names.');if(model.cells.some(c=>c.outputs?.length))r.dropped.push('Outputs.');if(model.frontMatter||Object.keys(model.metadata??{}).length)r.dropped.push('Notebook/front-matter metadata.');if(model.cells.some(c=>Object.keys(c.attachments??{}).length))r.converted.push('Attachments inlined as data URLs.');
 return {source:`# ---\n# jupyter:\n#   jupytext:\n#     text_representation:\n#       extension: .py\n#       format_name: percent\n#       format_version: '1.3'\n#   notebook-online-mode: ${model.settings.mode}\n# ---\n\n`+model.cells.map(c=>{const opts=Object.entries(c.options??{}).filter(([k])=>!['id','name'].includes(k)).map(([k,v])=>`${k}=${JSON.stringify(v)}`).join(' ');const marker='# %%'+(['markdown','raw'].includes(c.kind)?` [${c.kind}]`:'')+(opts?' '+opts:'');let src=c.source;if(['markdown','raw'].includes(c.kind))src=src.split('\n').map(line=>'# '+line).join('\n');else if(c.kind==='sql'||c.kind==='r')src='# %%'+(c.kind==='r'?'R':'sql')+'\n'+src;return marker+'\n'+src;}).join('\n\n')+'\n',extension:'py',report:r};
}
