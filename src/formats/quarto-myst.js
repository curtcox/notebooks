import {parse,serialize} from '../model/notebook-markdown.js';import {report} from './report.js';
export function frontSettings(frontMatter){return {mode:/^notebook-online:\s*\n(?:[ \t]+[^\n]*\n)*?[ \t]+mode:\s*(linear|reactive)\b/m.exec(frontMatter)?.[1]??'reactive',autorun:false,stdin:''};}
export function importQuarto(source,{myst=false}={}){
 const r=report(myst?'MyST Markdown':'Quarto / Notebook Markdown');
 if(myst){source=source.replace(/^\+\+\+\s*$/gm,'<!-- cell -->').replace(/^(`{3,})\{code-cell\}\s*(python|r|sql)\s*\n((?::[^\n]*\n)*)/gm,(_,fence,kind,options)=>`${fence}{${kind}}\n`+options.replace(/^:([\w-]+):\s*(.*)$/gm,'#| $1: $2'));r.converted.push('MyST directives/options and cell breaks converted to Notebook Markdown.');}
 const model=parse(source);r.kept.push('Source, cell options and unknown YAML front matter.');return {...model,settings:frontSettings(model.frontMatter),report:r};
}
export function exportQuarto(model,{myst=false}={}){
 const r=report(myst?'MyST Markdown':'Quarto .qmd');let front=model.frontMatter??'';
 if(front){if(/^notebook-online:/m.test(front)){if(/^  mode:/m.test(front))front=front.replace(/^  mode:.*$/m,`  mode: ${model.settings.mode}`);else front=front.replace(/^notebook-online:.*$/m,`notebook-online:\n  mode: ${model.settings.mode}`);}else front=front.replace(/\n(?:---|\.\.\.)\s*$/,`\nnotebook-online:\n  mode: ${model.settings.mode}\n---`);}else front=`---\nnotebook-online:\n  mode: ${model.settings.mode}\n---`;
 let source=serialize({...model,frontMatter:front});
 if(myst){source=source.replace(/^(`{3,})\{(python|r|sql)\}\n((?:#\|[^\n]*\n)*)/gm,(_,fence,kind,opts)=>`${fence}{code-cell} ${kind}\n`+opts.replace(/^#\|\s*([\w-]+):\s*(.*)$/gm,':$1: $2')).replace(/^<!-- cell -->$/gm,'+++');}
 r.kept.push('Source, cell options, mode and front matter.');if(model.cells.some(c=>c.outputs?.length))r.dropped.push('Outputs.');if(model.cells.some(c=>Object.keys(c.attachments??{}).length))r.converted.push('Attachments inlined as data URLs.');if(Object.keys(model.metadata??{}).length)r.dropped.push('Jupyter-specific metadata.');if(model.settings.stdin)r.dropped.push('Program input (use a share link or .ipynb to retain it).');
 return {source,report:r,extension:myst?'md':'qmd'};
}
