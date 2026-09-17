const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
 const browser = await chromium.launch({channel:'chrome',headless:true});
 try {
  for (const width of [1440,375]) {
   const page = await browser.newPage({viewport:{width,height:900}});
   const errors=[];page.on('pageerror',e=>errors.push(e.message));
   await page.goto('http://localhost:3020/?intro=1');
   await page.waitForFunction(()=>document.querySelector('.microscope-model')?.dataset.phase==='ready');
   await page.waitForTimeout(900);
   await page.screenshot({path:`C:/Users/ayada/AppData/Local/Temp/scope-final-${width}.png`});
   await page.evaluate(()=>{window.phases=[];const el=document.querySelector('.microscope-model');new MutationObserver(()=>window.phases.push(el.dataset.phase)).observe(el,{attributes:true,attributeFilter:['data-phase']});});
   await page.locator('.gate-enter').click();
   await page.locator('dialog').waitFor({state:'detached',timeout:45000});
   const phases=await page.evaluate(()=>window.phases);
   for(const phase of ['droplet','landed','approach','entering'])assert(phases.includes(phase),`${width}: missing ${phase}: ${phases}`);
   assert.equal(new URL(page.url()).hash,'');
   await page.locator('#tank-title').waitFor({state:'visible'});
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}: ${phases.join(' -> ')} -> homepage, no focus outline, no page errors`);
   await page.close();
  }
  const page=await browser.newPage({reducedMotion:'reduce'});
  await page.goto('http://localhost:3020/?intro=1');await page.locator('dialog[open]').waitFor();
  await page.keyboard.press('Escape');await page.locator('dialog').waitFor({state:'detached'});
  console.log('PASS reduced-motion Escape');
 } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
