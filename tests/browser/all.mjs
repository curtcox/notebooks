import {chromium,firefox,webkit,expect} from '@playwright/test';import assert from 'node:assert/strict';import fs from 'node:fs/promises';import {examples} from '../../src/examples.js';import {mockAiResponse} from '../../vendor/fragment-kit-v0.4.3/testing/fixtures/mock-ai.mjs';
const browser=await ({chromium,firefox,webkit}[process.env.BROWSER??'chromium']).launch({headless:true});
const page=await browser.newPage({viewport:{width:1440,height:950},serviceWorkers:'block'});page.setDefaultTimeout(60000);const errors=[];page.on('pageerror',e=>errors.push(e.message));
const code=source=>'```{python}\n'+source+'\n```\n';
const source=src=>page.evaluate(src=>NotebookOnline.setSource(src),src);
const run=()=>page.evaluate(()=>NotebookOnline.scheduler.run());
try{
 await fs.mkdir('test-results',{recursive:true});
 await page.goto('http://127.0.0.1:8000/?run=0');await page.waitForSelector('body[data-ready="true"]');
 assert.equal(await page.locator('.cell').count(),4);await page.screenshot({path:'test-results/desktop.png',fullPage:true});
 await page.locator('#add-cell').click();await page.locator('#add-cell-dialog').getByRole('button',{name:'Python',exact:true}).click();assert.equal(await page.locator('.cell').count(),5);
 await source('# Browser test\n\n'+code('x=2'));assert.equal(await page.locator('.cell').count(),2);
 await page.locator('#share-open').click();await page.waitForSelector('#share-link');const href=await page.locator('#share-link').inputValue();assert.ok(href.includes('#v1.'));await page.keyboard.press('Escape');
 await page.locator('#qr-open').click();assert.ok(await page.locator('#qr-code svg').count());await page.keyboard.press('Escape');
 // All imports stay idle and Jupyter outputs are explicitly marked as imported.
 const notebook={nbformat:4,nbformat_minor:5,metadata:{},cells:[{cell_type:'code',id:'imported',source:'21*2',metadata:{},execution_count:1,outputs:[{output_type:'execute_result',data:{'text/plain':'42'},metadata:{},execution_count:1}]}]};
 await page.locator('#file-open').setInputFiles({name:'example.ipynb',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(notebook))});
 await expect(page.locator('.imported')).toBeVisible();assert.equal(await page.locator('#autorun').isChecked(),false);assert.equal(await page.evaluate(()=>NotebookOnline.model.settings.mode),'linear');
 await page.locator('#download').click();const pendingDownload=page.waitForEvent('download');await page.locator('#download-ipynb').click();const download=await pendingDownload;const saved=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(saved.nbformat_minor,5);assert.equal(saved.cells[0].outputs[0].data['text/plain'],'42');
 // Renderer regressions: malicious HTML remains in an empty-sandbox frame; sanitizer strips executable URLs.
 await source('<img src="x" onerror="window.__unsafe=1">');assert.equal(await page.locator('.cell-preview iframe').getAttribute('sandbox'),'');assert.equal(await page.evaluate(()=>window.__unsafe),undefined);
 assert.equal(await page.evaluate(async()=>{const {sanitize}=await import('./src/ui/markdown-view.js');const body=sanitize('<a href="javascript:alert(1)" onclick="x()">bad</a><script>x()</script>');return body.querySelector('a').hasAttribute('href')||body.querySelector('a').hasAttribute('onclick')||Boolean(body.querySelector('script'));}),false);
 if(process.env.TEST_PACKAGES==='1'){
  await page.evaluate(()=>{NotebookOnline.model.settings.mode='reactive';});await source(code('x=21')+'\n'+code('x*2'));await run();
  await expect(page.locator('.cell-output').last()).toHaveText('42');
  // Editing an ancestor reruns its descendants.
  await page.evaluate(()=>{NotebookOnline.model.settings.autorun=true;const c=NotebookOnline.model.cells[0];c.source='x=3';NotebookOnline.model.revision++;NotebookOnline.cells.onEdit(c.id);});
  await expect(page.locator('.cell-output').last()).toHaveText('6',{timeout:60000});
  // Native widget updates only rerun referencing cells.
  await page.evaluate(()=>{NotebookOnline.model.settings.autorun=false;});
  await source(code('import marimo as mo\nslider=mo.ui.slider(0,10,value=2,label="Count")\nslider')+'\n'+code('slider.value*2'));await run();
  await expect(page.locator('.cell-output').last()).toHaveText('4');
  await page.locator('input[type=range]').evaluate(input=>{input.value='7';input.dispatchEvent(new Event('change',{bubbles:true}));});await expect(page.locator('.cell-output').last()).toHaveText('14');
  // Real SQL sees a dataframe and binds its result for the following Python cell.
  await source(code('import pandas as pd\ndf=pd.DataFrame({"x":[1,2,3]})')+'\n```{sql}\n#| output: totals\nselect sum(x) as total from df\n```\n\n'+code('int(totals.iloc[0]["total"])'));await run();await expect(page.locator('.cell-output').last()).toHaveText('6');
  // Linear mode tolerates redefinition and keeps execution counts.
  await page.evaluate(()=>{NotebookOnline.scheduler.stop();NotebookOnline.model.settings.mode='linear';});await source(code('count=0')+'\n'+code('count+=1\ncount'));await run();assert.equal(await page.evaluate(()=>NotebookOnline.model.cells[1].executionCount),2);await page.evaluate(()=>NotebookOnline.run(NotebookOnline.model.cells[1].id));await expect(page.locator('.cell-output').last()).toHaveText('2');
  // Stop kills an infinite loop and the next run gets a usable kernel.
  await source(code('while True: pass'));await page.evaluate(()=>{void NotebookOnline.scheduler.run();});await page.waitForFunction(()=>NotebookOnline.model.cells[0].status==='running');await page.locator('#stop').click();assert.equal(await page.evaluate(()=>NotebookOnline.scheduler.busy),false);await source(code('1+1'));await run();await expect(page.locator('.cell-output').last()).toHaveText('2');
  await source(code('40+2'));await page.evaluate(()=>NotebookOnline.cells.edit(NotebookOnline.model.cells[0].id));await page.keyboard.press('Shift+Enter');await expect(page.locator('.cell-output').first()).toHaveText('42');await expect(page.locator('.cell')).toHaveCount(2);assert.equal(await page.evaluate(()=>NotebookOnline.model.cells[0].status),'ok');
  // Notebook code observes an opaque worker without storage or nested-worker capabilities.
  await source(code('import js\nprint(js.location.origin)\nprint(js.indexedDB, js.caches, js.Worker, js.importScripts)'));await run();const isolation=await page.locator('.cell-output').textContent();assert.ok(isolation.includes('null'),isolation);assert.ok(isolation.includes('None'),isolation);
 }
 // AI provider is a deterministic mock; accepting a proposal must not run it.
 await source('# Hello\n');await page.route('https://api.openai.com/v1/chat/completions',async route=>{const response=mockAiResponse(route.request().postDataJSON());await route.fulfill({status:200,contentType:response.headers.get('Content-Type'),body:await response.text()});});
 await page.locator('#ask-open').click();await expect(page.getByLabel('Describe a change')).toBeVisible();await page.keyboard.press('Escape');await page.locator('.fk-more').click();await page.getByRole('button',{name:'AI settings',exact:true}).click();
 const settings=page.locator('#ai-settings');await settings.getByLabel('Provider',{exact:true}).selectOption('openai');await settings.getByLabel('API key',{exact:true}).fill('probe-notebook-key-do-not-store');await settings.getByRole('button',{name:'Connect key',exact:true}).click();for(const period of ['total','day','month'])await settings.getByLabel(period+' spending cap').fill('1');await settings.getByRole('button',{name:'Set spending caps'}).click();await settings.getByRole('button',{name:'Close',exact:true}).click();await page.locator('#fk-more-drawer .fk-close').click();
 await page.locator('#ask-open').click();await page.getByLabel('Change model').selectOption('openai:gpt-4.1-mini-2025-04-14');await page.getByLabel('Describe a change').fill('uppercase');await page.getByLabel('Allow sending this document',{exact:true}).check();await page.locator('#ai-send').click();await expect(page.locator('#ai-accept')).toBeVisible();assert.equal(await page.evaluate(()=>NotebookOnline.snapshot().src),'# Hello\n');await page.locator('#ai-accept').click();await expect.poll(()=>page.evaluate(()=>NotebookOnline.snapshot().src),{timeout:60000}).toBe('# HELLO\n');assert.equal(await page.evaluate(()=>NotebookOnline.scheduler.busy),false);await page.getByRole('button',{name:'Undo AI change'}).click();assert.equal(await page.evaluate(()=>NotebookOnline.snapshot().src),'# Hello\n');await page.keyboard.press('Escape');
 const leaked=await page.evaluate(()=>[localStorage,sessionStorage].some(storage=>Array.from({length:storage.length},(_,i)=>storage.getItem(storage.key(i))).join('').includes('probe-notebook-key-do-not-store')));assert.equal(leaked,false);
 // Large notebooks keep Ace instances near the visible viewport.
 await source(Array.from({length:200},(_,i)=>code('x'+i+'='+i)).join('\n'));await page.waitForTimeout(300);assert.equal(await page.locator('.cell').count(),200);assert.ok(await page.evaluate(()=>NotebookOnline.cells.editors.size)<50);
 await source('# On a small screen\n\n'+code('x=2'));await page.setViewportSize({width:360,height:780});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('[role=tab]').count(),3);await page.screenshot({path:'test-results/mobile.png',fullPage:true});
 if(process.env.FULL_GALLERY==='1'){for(const example of examples){await page.goto('http://127.0.0.1:8000/?run=0&example='+example.id);await page.waitForSelector('body[data-ready="true"]');await expect(page.locator('#title')).toHaveText(example.title);}}
 assert.deepEqual(errors,[]);console.log('Browser notebook execution, imports, exports, AI, isolation and mobile acceptance passed.');
}finally{await browser.close();}
