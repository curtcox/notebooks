import fs from 'node:fs/promises';
export async function examplesSource(){const catalog=JSON.parse(await fs.readFile('examples/catalog.json','utf8'));const examples=await Promise.all(catalog.map(async item=>({...item,src:await fs.readFile('examples/'+item.file,'utf8')})));return '// Generated from examples/catalog.json and examples/*.qmd.\nexport const examples='+JSON.stringify(examples,null,2)+';\n';}
if(process.argv[1]?.endsWith('/examples.mjs'))await fs.writeFile('src/examples.js',await examplesSource());
