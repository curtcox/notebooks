/** Stage only the public, verified offline allowlist; never publish test environments or Git state. */
import fs from 'node:fs/promises';import path from 'node:path';import vm from 'node:vm';
const root=process.cwd(),out=path.resolve(process.argv[2]??'_site');
if(!out.startsWith(root+path.sep)&&!out.startsWith('/private/tmp/'))throw Error('Stage inside this checkout or a task temporary directory.');
if(out===root)throw Error('Cannot stage over source.');
const context={};vm.runInNewContext(await fs.readFile('offline-assets.js','utf8'),context);const manifest=context.OfflineAssets;
if(!manifest?.version?.startsWith('notebookonline-'))throw Error('Invalid offline manifest.');
await fs.mkdir(out,{recursive:true});
for(const file of [...manifest.assets.filter(f=>!f.startsWith('https://')),'offline-assets.js']){if(file.split('/').some(part=>part==='..'||part.startsWith('.')))throw Error('Invalid public asset.');const dest=path.resolve(out,file);if(!dest.startsWith(out+path.sep))throw Error('Invalid public path.');await fs.mkdir(path.dirname(dest),{recursive:true});await fs.copyFile(file,dest);}
await fs.writeFile(path.join(out,'.nojekyll'),'');console.log('Staged public Notebook Online assets.');
