import fs from 'node:fs/promises';import {Notebook} from '../src/model/notebook.js';import {exportIpynb} from '../src/formats/ipynb.js';import {exportPercent} from '../src/formats/percent.js';
const model=new Notebook({src:'# Cross-tool fixture\n\n```{python}\nx = 21\n```\n\n```{python}\nx * 2\n```\n',notebook:{mode:'reactive'}});
await fs.mkdir('test-results/formats',{recursive:true});await fs.writeFile('test-results/formats/notebook.ipynb',exportIpynb(model).source);await fs.writeFile('test-results/formats/percent.py',exportPercent(model).source);
