/* Optional package bytes are separate from the atomic core and verified on every read. */
(()=>{
const hashes=self.OfflineAssets.packageHashes??{},cacheName='notebookonline-packages-v1';
const hex=buffer=>Array.from(new Uint8Array(buffer),b=>b.toString(16).padStart(2,'0')).join('');
async function checked(response,url){if(!response?.ok)return null;const body=await response.arrayBuffer();if(hex(await crypto.subtle.digest('SHA-256',body))!==hashes[url])return null;return new Response(body,{status:200,headers:{'Content-Type':'application/octet-stream'}});}
async function get(url){const cache=await caches.open(cacheName),stored=await checked(await cache.match(url),url);if(stored)return stored;await cache.delete(url);const response=await checked(await fetch(url,{cache:'reload'}),url);if(!response)throw Error('Package did not match the pinned release: '+url);await cache.put(url,response.clone());return response;}
self.addEventListener('fetch',event=>{if(event.request.method==='GET'&&hashes[event.request.url]&&!self.OfflineAssets.hashes[event.request.url])event.respondWith(get(event.request.url));});
self.FragmentKitOfflineConfig={extraCaches:[cacheName],onMessage(event){if(event.data?.type!=='cache-packages')return;return (async()=>{let done=0;const urls=Object.keys(hashes);try{for(const url of urls){await get(url);event.ports[0]?.postMessage({progress:++done,total:urls.length});}event.ports[0]?.postMessage({ready:true,total:urls.length});}catch(error){event.ports[0]?.postMessage({error:error.message});}})();}};
})();
