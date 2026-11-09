import {kit,config,urlState} from './fragment-config.mjs';import {examples} from './examples.js';
kit.createShell({config:{...config,docs:new URL('docs/',location.href).href,gallery:location.href},actions:[{label:'New notebook',onClick:()=>location.href='./'}]});
const catalog=examples.map(e=>({...e,cover:'gallery/previews/'+e.id+'.svg',document:{src:e.src,notebook:e.settings}}));
kit.mountGallery({container:document.getElementById('gallery'),catalog,urlState:{build:doc=>urlState.build(doc,{url:new URL('./',location.href).href})}});
const guides=()=>{for(const card of document.querySelectorAll('.fk-gallery-card')){if(card.querySelector('[data-guide]'))continue;const example=examples.find(e=>e.title===card.querySelector('h2')?.textContent);if(!example)continue;const guide=document.createElement('a');guide.dataset.guide='true';guide.textContent='Read the guide';guide.href=`docs/${example.guide}.html`;card.append(guide);}};
new MutationObserver(guides).observe(document.querySelector('.fk-gallery-grid'),{childList:true});guides();
