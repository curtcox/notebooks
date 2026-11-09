export const PYODIDE_URL='https://cdn.jsdelivr.net/pyodide/v314.0.7/full/';
let source;
export async function createPythonSandbox() {
  const {createSandbox}=await import('../../vendor/fragment-kit-v0.4.3/vendor/hashbin-sdk-v0.4.0.mjs');
  source??=fetch(new URL('./python-worker.js',import.meta.url)).then(r=>{if(!r.ok)throw Error('Python worker download failed.');return r.text();}).catch(error=>{source=null;throw error;});
  const base=new URL('../',import.meta.url).href;
  return createSandbox({source:await source,origin:'opaque',base,proxy:[PYODIDE_URL,new URL('py/',base).href]});
}
