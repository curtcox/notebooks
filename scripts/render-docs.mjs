import fs from 'node:fs/promises';import MarkdownIt from 'markdown-it';import {createHash} from 'node:crypto';
const md=new MarkdownIt({html:false,linkify:true});const check=process.argv.includes('--check');
for(const file of (await fs.readdir('docs')).filter(f=>f.endsWith('.md'))){const source=await fs.readFile('docs/'+file,'utf8'),title=/^# (.+)$/m.exec(source)?.[1]??file;
 const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'self'; style-src 'self'; img-src 'self' data:; object-src 'none'; base-uri 'self'"><title>${md.utils.escapeHtml(title)} · Notebook Online</title><link rel="icon" href="../icon.svg"><link rel="stylesheet" href="../src/app.css"></head><body><nav class="guide"><a href="../">Notebook Online</a> · <a href="index.html">Notebook guide</a> · <a href="../gallery.html">Sample gallery</a></nav><main class="guide">${md.render(source)}</main><!-- source:${createHash('sha256').update(source).digest('hex')} --></body></html>\n`;
 const target='docs/'+file.replace(/\.md$/,'.html');if(check){if(await fs.readFile(target,'utf8')!==html)throw Error('Stale docs: '+file);}else await fs.writeFile(target,html);
}
console.log(check?'Docs are current.':'Docs rendered.');
