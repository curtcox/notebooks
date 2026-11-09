import {cell,newId} from '../model/notebook-markdown.js';import {report} from './report.js';
const text=value=>Array.isArray(value)?value.join(''):typeof value==='string'?value:'';
const clone=value=>structuredClone(value??{});
export function importIpynb(input){
 const value=typeof input==='string'?JSON.parse(input):input,r=report('Jupyter .ipynb');
 if(value.nbformat!==4||!Array.isArray(value.cells))throw Error('Only Jupyter nbformat 4 notebooks are supported. Convert nbformat 3 with Jupyter first.');
 const metadata=clone(value.metadata),settings={mode:metadata.notebook_online?.mode??'linear',autorun:false,stdin:metadata.notebook_online?.stdin??''};
 const rOnly=metadata.kernelspec?.language?.toLowerCase()==='r'||metadata.kernelspec?.name==='ir';
 const dropOutputs=new TextEncoder().encode(JSON.stringify(value)).length>5*1024*1024;
 const cells=value.cells.map((source,index)=>{
  if(!['code','markdown','raw'].includes(source.cell_type))throw Error(`Unknown cell type at cell ${index+1}.`);
  let kind=source.cell_type==='code'?(rOnly?'r':'python'):source.cell_type,src=text(source.source);
  if(kind==='python'&&/^%%(?:sql|R)(?:\s|$)/.test(src)){kind=src.startsWith('%%R')?'r':'sql';src=src.split('\n').slice(1).join('\n');r.converted.push(`Cell ${index+1}: magic converted to ${kind}.`);}
  const id=/^[a-zA-Z0-9_-]{1,64}$/.test(source.id??'')?source.id:newId();
  const options={id,...(source.metadata?.notebook_online?.options??{})};
  const next=cell(kind,src,options);next.metadata=clone(source.metadata);next.attachments=clone(source.attachments);next.executionCount=source.execution_count??null;
  next.outputs=dropOutputs?[]:(Array.isArray(source.outputs)?clone(source.outputs).map(output=>({...output,imported:true,data:output.data?Object.fromEntries(Object.entries(output.data).map(([mime,value])=>[mime,mime==='application/json'?value:text(value)])):undefined,text:output.text!==undefined?text(output.text):undefined})):[]);
  if(kind==='markdown'&&source.attachments){for(const [name,bundle]of Object.entries(source.attachments)){const entry=Object.entries(bundle).find(([mime])=>['image/png','image/jpeg','image/gif','image/webp'].includes(mime));if(entry)next.source=next.source.replaceAll('attachment:'+name,`data:${entry[0]};base64,${text(entry[1])}`);}next.originalSource=src;}
  return next;
 });
 r.kept.push('Cell kinds, ids, unknown notebook/cell metadata and attachments.');if(dropOutputs)r.dropped.push('Embedded outputs omitted because the import exceeds 5 MiB.');else if(cells.some(c=>c.outputs.length))r.kept.push('Outputs displayed as imported (not yet run).');r.converted.push('Auto-run off for imported code.');
 return {cells,frontMatter:'',metadata,settings,report:r};
}
export function exportIpynb(model,{outputs=true}={}){
 const r=report('Jupyter .ipynb'),code=model.cells.filter(c=>!['markdown','raw'].includes(c.kind)),rOnly=code.length>0&&code.every(c=>c.kind==='r');
 const metadata={...clone(model.metadata),kernelspec:rOnly?{name:'ir',display_name:'R',language:'R'}:{name:'python3',display_name:'Python 3 (Pyodide)',language:'python'},language_info:{name:rOnly?'R':'python'},notebook_online:{mode:model.settings.mode,autorun:model.settings.autorun,stdin:model.settings.stdin}};
 const cells=model.cells.map(c=>{
  const source=c.originalSource&&c.attachments&&Object.keys(c.attachments).length?c.originalSource:c.source;
  const base={cell_type:['markdown','raw'].includes(c.kind)?c.kind:'code',id:/^[a-zA-Z0-9_-]{1,64}$/.test(c.id)?c.id:newId(),metadata:{...clone(c.metadata),notebook_online:{options:clone(c.options)}},source};
  if(c.kind==='markdown'&&c.attachments&&Object.keys(c.attachments).length)base.attachments=clone(c.attachments);
  if(base.cell_type==='code'){
   if(c.kind==='sql')base.source='%%sql'+(c.options.output?' '+c.options.output:'')+'\n'+source;else if(c.kind==='r'&&!rOnly)base.source='%%R\n'+source;
   base.execution_count=c.executionCount??null;base.outputs=outputs?(c.outputs??[]).filter(o=>['stream','display_data','execute_result','error'].includes(o.output_type)).map(o=>{const result=clone(o);delete result.imported;if(result.output_type==='stream')return {output_type:'stream',name:result.name??'stdout',text:text(result.text)};if(result.output_type==='error')return {output_type:'error',ename:result.ename??'Error',evalue:result.evalue??'',traceback:result.traceback??[]};return {output_type:result.output_type,data:result.data??{},metadata:result.metadata??{},...(result.output_type==='execute_result'?{execution_count:base.execution_count}:{}),...(result.transient?{transient:result.transient}:{})};}):[];
  }
  return base;
 });
 r.kept.push('Source, cell ids, metadata, settings and attachments.');if(outputs)r.kept.push('Current outputs.');else r.dropped.push('Outputs omitted by request.');if(model.frontMatter)r.dropped.push('Quarto front matter is not represented in .ipynb.');
 return {source:JSON.stringify({nbformat:4,nbformat_minor:5,metadata,cells},null,2)+'\n',report:r,extension:'ipynb'};
}
