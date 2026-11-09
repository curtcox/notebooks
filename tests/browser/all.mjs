import {chromium,firefox,webkit} from '@playwright/test';import assert from 'node:assert/strict';
const browser=await ({chromium,firefox,webkit}[process.env.BROWSER??'chromium']).launch({headless:true});
const page=await browser.newPage({viewport:{width:1280,height:900},serviceWorkers:'block'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:8000/?run=0');await page.waitForSelector('body[data-ready="true"]');
 assert.equal(await page.locator('.cell').count(),4);await page.locator('#add-cell').click();assert.equal(await page.locator('.cell').count(),5);
 await page.evaluate(()=>NotebookOnline.setSource('# Browser test\n\n```{python}\nx=2\n```\n'));assert.equal(await page.locator('.cell').count(),2);
 await page.locator('#share-open').click();await page.waitForSelector('#share-link');const href=await page.locator('#share-link').inputValue();assert.ok(href.includes('#v1.'));await page.keyboard.press('Escape');
 await page.locator('#qr-open').click();assert.ok(await page.locator('#qr-code svg').count());await page.keyboard.press('Escape');
 await page.setViewportSize({width:360,height:780});await page.waitForTimeout(100);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('[role=tab]').count(),3);
 assert.deepEqual(errors,[]);console.log('Browser editor, sharing, QR and 360px layout passed.');
 await page.screenshot({path:'test-results/editor.png',fullPage:true});
}finally{await browser.close();}
