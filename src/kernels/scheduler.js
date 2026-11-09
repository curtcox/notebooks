/** Build a language-local graph; disabled cells do not define names. */
export function buildGraph(cells, analyses) {
 const nodes=new Map(),owners=new Map(),errors=new Map();
 cells.forEach((cell,i)=>{if(!['python','sql','r'].includes(cell.kind)||cell.options?.disabled)return;const analysis=analyses[i]??{defs:[],refs:[],deletes:[]};nodes.set(cell.id,{cell,analysis,parents:new Set(),children:new Set()});if(analysis.error)errors.set(cell.id,analysis.error);for(const name of analysis.defs){const key=`${cell.kind==='r'?'r':'python'}:${name}`;if(!owners.has(key))owners.set(key,[]);owners.get(key).push(cell.id);}});
 for(const [name,ids]of owners)if(ids.length>1)for(const id of ids)errors.set(id,`Multiple definitions: ${name.split(':')[1]}`);
 for(const [id,node]of nodes){const prefix=node.cell.kind==='r'?'r':'python';for(const ref of node.analysis.refs)for(const owner of owners.get(`${prefix}:${ref}`)??[]){if(owner===id)continue;node.parents.add(owner);nodes.get(owner).children.add(id);}for(const name of node.analysis.deletes??[])if((owners.get(`${prefix}:${name}`)??[]).some(owner=>owner!==id))errors.set(id,`Cannot delete ${name}: defined by another cell.`);if(node.analysis.dynamic){for(const [otherId,other]of nodes){if(otherId===id)break;if((other.cell.kind==='r')===(node.cell.kind==='r')){node.parents.add(otherId);other.children.add(id);}}}}
 const indegree=new Map([...nodes].map(([id,node])=>[id,node.parents.size])),queue=[...nodes.keys()].filter(id=>!indegree.get(id)),order=[];
 while(queue.length){const id=queue.shift();order.push(id);for(const child of nodes.get(id).children){indegree.set(child,indegree.get(child)-1);if(indegree.get(child)===0)queue.push(child);}}
 for(const id of nodes.keys())if(!order.includes(id))errors.set(id,'Dependency cycle (or blocked by a cycle).');
 return {nodes,owners,errors,order};
}
export function descendants(graph,ids){const result=new Set(ids);for(const id of result)for(const child of graph.nodes.get(id)?.children??[])result.add(child);return result;}
export class Scheduler {
 constructor({model,kernel,onChange=()=>{},onStatus=()=>{},timers=globalThis}){Object.assign(this,{model,kernel,onChange,onStatus,timers});this.version=0;this.previousDefs=new Map();this.graph={nodes:new Map(),errors:new Map(),order:[]};this.busy=false;this.stateEvents=new Set();this.editedAffected=new Set();}
 async analyze(){const revision=this.model.revision,cells=[...this.model.cells];const analyses=cells.some(c=>['python','sql'].includes(c.kind))?await this.kernel.analyze(cells):cells.map(()=>({defs:[],refs:[],deletes:[]}));if(revision!==this.model.revision)throw Error('Notebook changed during analysis.');this.graph=buildGraph(cells,analyses);cells.forEach((cell,i)=>{cell.analysis=analyses[i];cell.error=this.model.settings.mode==='reactive'?this.graph.errors.get(cell.id):undefined;if(cell.error)cell.status='error';this.onChange(cell.id);});return this.graph;}
 mark(ids){for(const id of descendants(this.graph,ids)){const cell=this.model.cells.find(c=>c.id===id);if(cell){cell.status='stale';this.onChange(id);}}}
 edit(id,{auto=true}={}){this.timers.clearTimeout(this.debounce);this.version++;if(this.busy)this.stop('Notebook changed — kernel restarted.');if(id){for(const affected of descendants(this.graph,[id]))this.editedAffected.add(affected);this.mark([id]);}this.debounce=this.timers.setTimeout(()=>{this.refresh(id,auto).catch(error=>this.onStatus(error.message));},750);}
 async refresh(id,auto){await this.analyze();const ids=id?[...new Set([id,...this.editedAffected])]:this.model.cells.filter(c=>['python','sql','r'].includes(c.kind)).map(c=>c.id);this.editedAffected.clear();this.mark(ids);if(auto&&this.model.settings.mode==='reactive'&&this.model.settings.autorun)await this.run({ids,automatic:true,analyzed:true});}
 async run({ids=null,automatic=false,analyzed=false,descendantsOnly=false}={}){
  this.timers.clearTimeout(this.debounce);if(this.busy){this.onStatus('A batch is already running. Use Stop to restart.');return;}
  const version=++this.version;this.busy=true;this.onStatus('Preparing notebook…');
  try{
   if(!analyzed)await this.analyze();if(version!==this.version)return;
   const reactive=this.model.settings.mode==='reactive',selected=ids?new Set(ids):null;
   if(reactive&&selected&&!descendantsOnly){for(const affected of this.editedAffected)selected.add(affected);this.editedAffected.clear();}
   let wanted=selected?(reactive?descendants(this.graph,selected):selected):new Set(this.model.cells.map(c=>c.id));
   // A manual reactive run first resolves stale/missing ancestors, then descendants.
   if(reactive&&selected&&!descendantsOnly){const visit=id=>{for(const parent of this.graph.nodes.get(id)?.parents??[]){const c=this.model.cells.find(c=>c.id===parent);if(c&&c.status!=='ok'&&!wanted.has(parent)){wanted.add(parent);visit(parent);}}};for(const id of [...wanted])visit(id);}
   if(descendantsOnly&&selected)for(const id of selected)wanted.delete(id);
   const list=reactive?this.graph.order.map(id=>this.graph.nodes.get(id).cell):this.model.cells;
   if(!ids||!this.previousDefs.size)await this.kernel.resetInput(this.model.settings.stdin);
   // Deletions remove their old definitions even when no surviving cell references them.
   for(const [oldId,names]of this.previousDefs)if(!this.model.cells.some(c=>c.id===oldId&&['python','sql'].includes(c.kind)&&!c.options.disabled)){await this.kernel.deleteNames(names);this.previousDefs.delete(oldId);}
   if(reactive)await this.kernel.deleteNames([...new Set([...wanted].flatMap(id=>this.previousDefs.get(id)??[]))]);
   const failed=new Set(this.graph.errors.keys());
   this.automatic=automatic;this.elapsed=0;
   for(const cell of list){
    if(version!==this.version)return;if(!wanted.has(cell.id)||!['python','sql','r'].includes(cell.kind)||cell.options.disabled)continue;
    if(cell.kind==='r'){cell.status='disabled';cell.error='R requires approval in this build.';failed.add(cell.id);this.onChange(cell.id);continue;}
    if(reactive&&(this.graph.errors.has(cell.id)||[...this.graph.nodes.get(cell.id).parents].some(p=>failed.has(p)))){cell.status='stale';cell.error=this.graph.errors.get(cell.id)??'Stale (ancestor error or stopped)';failed.add(cell.id);this.onChange(cell.id);continue;}
    cell.outputs=[];cell.error=null;cell.status='queued';this.current=cell;this.onChange(cell.id);
    const defs=this.previousDefs.get(cell.id)??[];
    const result=await this.kernel.run(cell,{reactive,delete:defs});
    this.clearLimit();if(version!==this.version)return;
    cell.executionCount=result.executionCount;cell.status=result.ok?(result.stopped?'stopped':'ok'):'error';cell.error=result.error;this.previousDefs.set(cell.id,cell.analysis?.defs??[]);if(!result.ok||result.stopped)failed.add(cell.id);this.onChange(cell.id);
    if(!reactive&&cell.analysis){for(const other of this.model.cells)if(other!==cell&&other.analysis?.refs.some(ref=>cell.analysis.defs.includes(ref))&&other.status==='ok'){other.status='possibly stale';this.onChange(other.id);}}
   }
   this.onStatus('Ready');
  }catch(error){if(version===this.version){if(this.current){this.current.status='error';this.current.error=error.message;this.onChange(this.current.id);}this.onStatus(error.message);}}
  finally{if(version===this.version){this.clearLimit();this.current=null;this.busy=false;this.automatic=false;}}
 }
 running(){this.current.status='running';this.onChange(this.current.id);if(this.automatic){this.started=Date.now();this.limit=this.timers.setTimeout(()=>this.stop('Stopped after 5 s of automatic execution. Use Run all for an unlimited manual run.'),Math.max(1,5000-this.elapsed));}}
 clearLimit(){if(this.started){this.elapsed+=Date.now()-this.started;this.started=null;}this.timers.clearTimeout(this.limit);}
 stop(reason='Kernel restarted — outputs are from the previous kernel.'){this.version++;this.timers.clearTimeout(this.debounce);this.clearLimit();this.kernel.kill(reason);this.busy=false;this.current=null;this.previousDefs.clear();for(const cell of this.model.cells)if(['python','sql','r'].includes(cell.kind)){cell.status=this.model.settings.mode==='reactive'?'stale':'previous kernel';this.onChange(cell.id);}this.onStatus(reason);}
 async widget(owner){await this.analyze();if(this.model.settings.mode==='reactive')await this.run({ids:[owner],descendantsOnly:true,analyzed:true});}
}
