import {test} from '@playwright/test';
test.beforeEach(()=>test.setTimeout(120000));
export default {
 ready:'body[data-ready="true"]',editor:'#notebook-pane',status:'#status',draftKey:'notebookonline:work',more:'.fk-more',
 share:'#share-open',qr:'#qr-open',tabs:['Notebook','Outline'],example:'welcome',cachePrefix:'notebookonline-',offlineAsset:'src/app.css',
 kitURL:'./vendor/fragment-kit-v0.4.3/src/index.js',source:text=>`# ${text.replaceAll('\n','\n\n')}\n`,
 getSource:page=>page.evaluate(()=>NotebookOnline.snapshot().src),getDocument:page=>page.evaluate(()=>NotebookOnline.snapshot()),
 edit:(page,src)=>page.evaluate(src=>NotebookOnline.setSource(src),src),
 openMore:async page=>{if(!await page.locator('#fk-more-drawer').isVisible())await page.locator('.fk-more').click();},
 configureHashBin:async(context,clientId)=>context.route('**/',async route=>{const response=await route.fetch();await route.fulfill({response,body:(await response.text()).replace(/name="hashbin-client-id" content="[^"]*"/,`name="hashbin-client-id" content="${clientId}"`)});}),
 build:(page,doc,canonical=false)=>page.evaluate(async({doc,canonical})=>{const{urlState,config}=await import('./src/fragment-config.mjs');return urlState.build(doc,canonical?{url:config.canonicalOrigin}:{}).href;},{doc,canonical})
};
