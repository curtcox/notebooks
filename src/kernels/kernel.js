/** Requests and output events are scoped to one generation. Killing rejects every pending operation. */
export class Kernel {
 constructor({factory,onEvent=()=>{},timers=globalThis}){Object.assign(this,{factory,onEvent,timers});this.pending=new Map();this.generation=0;this.counter=0;}
 async start(){if(this.worker)return this.ready;if(this.starting)return this.starting;const generation=this.generation;this.starting=(async()=>{const worker=await this.factory();if(generation!==this.generation){worker.terminate();throw Error('Kernel restarted.');}this.worker=worker;this.ready=new Promise((resolve,reject)=>{this.bootReject=reject;worker.onmessage=({data})=>{if(generation!==this.generation)return;if(data.type==='ready'){resolve();this.bootReject=null;}else if(data.type==='fatal'){reject(Error(data.error));this.kill(data.error);}else if(data.type==='result'){const request=this.pending.get(data.request);if(request){this.pending.delete(data.request);data.error?request.reject(Error(data.error)):request.resolve(data.result);}}this.onEvent({...data,generation});};worker.onerror=event=>this.kill(event.message??'Kernel failed.');});return this.ready;})();try{return await this.starting;}catch(error){this.starting=null;throw error;}}
 async request(action,data={}){await this.start();const request=++this.counter;return new Promise((resolve,reject)=>{this.pending.set(request,{resolve,reject});this.worker.postMessage({action,...data,request});});}
 kill(reason='Kernel restarted.'){this.generation++;this.worker?.terminate();this.worker=null;this.starting=null;this.bootReject?.(Error(reason));this.bootReject=null;for(const request of this.pending.values())request.reject(Error(reason));this.pending.clear();this.onEvent({type:'stopped',text:reason,generation:this.generation});}
 run(cell,{reactive=false,delete:defs=[]}={}){return this.request('run',{id:cell.id,source:cell.source,kind:cell.kind,output:cell.options?.output??'_df',reactive,delete:defs});}
 analyze(cells){return this.request('analyze',{cells:cells.map(({id,kind,source,options})=>({id,kind,source,options}))});}
 resetInput(stdin){return this.request('input',{stdin});}
 deleteNames(names){return names.length?this.request('delete',{names}):Promise.resolve();}
 widget(widgetId,value){return this.request('widget',{widgetId,value});}
 dispose(){this.kill('Kernel disposed.');}
}
