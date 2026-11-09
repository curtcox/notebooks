import fs from 'node:fs/promises';import {generateOffline} from '../vendor/fragment-kit-v0.4.3/tools/offline-assets.mjs';import {packagePins} from './package-pins.mjs';
const check=process.argv.includes('--check'),packages=await packagePins(),config=JSON.parse(await fs.readFile('offline.config.json','utf8'));
config.roots??=config.files;
async function files(entry){const stat=await fs.lstat(entry);if(stat.isSymbolicLink())throw Error('Public assets cannot be symlinks.');if(!stat.isDirectory())return [entry];const result=[];for(const name of (await fs.readdir(entry)).sort()){if(name.startsWith('.')||name==='__pycache__'||name.endsWith('.pyc'))continue;result.push(...await files(entry+'/'+name));}return result;}
config.files=(await Promise.all(config.roots.map(files))).flat().sort();
config.remote={...config.remote,...packages.core};config.metadata={...config.metadata,packageHashes:packages.optional};
const text=JSON.stringify(config,null,2)+'\n';if(check){if(text!==await fs.readFile('offline.config.json','utf8'))throw Error('Offline file list or package pins are stale.');}else await fs.writeFile('offline.config.json',text);
console.log((await generateOffline('offline.config.json',check)).version);
