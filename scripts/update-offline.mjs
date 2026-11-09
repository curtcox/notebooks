import fs from 'node:fs/promises';import {generateOffline} from '../vendor/fragment-kit-v0.4.3/tools/offline-assets.mjs';import {packagePins} from './package-pins.mjs';
const check=process.argv.includes('--check'),packages=await packagePins(),config=JSON.parse(await fs.readFile('offline.config.json','utf8'));
config.remote={...config.remote,...packages.core};config.metadata={...config.metadata,packageHashes:packages.optional};
const text=JSON.stringify(config,null,2)+'\n';if(check){if(text!==await fs.readFile('offline.config.json','utf8'))throw Error('Offline package pins are stale.');}else await fs.writeFile('offline.config.json',text);
console.log((await generateOffline('offline.config.json',check)).version);
