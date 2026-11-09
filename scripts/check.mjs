import {execFileSync} from 'node:child_process';import fs from 'node:fs/promises';
import {verifyManifest} from '../vendor/fragment-kit-v0.4.3/tools/vendor-sync.mjs';
import {generateOffline} from '../vendor/fragment-kit-v0.4.3/tools/offline-assets.mjs';
async function walk(dir){return (await Promise.all((await fs.readdir(dir,{withFileTypes:true})).filter(e=>e.name!=='__pycache__').map(e=>e.isDirectory()?walk(dir+'/'+e.name):[dir+'/'+e.name]))).flat();}
for(const file of [...await walk('src'),...await walk('scripts'),...await walk('tests')].filter(f=>/\.(js|mjs|cjs)$/.test(f)))execFileSync(process.execPath,['--check',file]);
await verifyManifest('vendor/fragment-kit-v0.4.3');if(await fs.stat('offline.config.json').catch(()=>null))await generateOffline('offline.config.json',true);
for(const script of ['scripts/update-offline.mjs','scripts/render-docs.mjs','scripts/render-gallery.mjs'])execFileSync(process.execPath,[script,'--check'],{stdio:'inherit'});
console.log('Syntax, vendor integrity, offline pins, docs and gallery verified.');
