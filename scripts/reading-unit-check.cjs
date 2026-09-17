const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage();
    let posts = 0;
    // Explicit test fixtures, not live environmental measurements.
    await page.route('**/api/**', route => {
      if (route.request().method() === 'POST') { posts++; return route.abort(); }
      const path = new URL(route.request().url()).pathname;
      const body = path === '/api/contaminants' ? [
        {id:'qa-legal',name:'QA legal unit',legalLimitUnit:'ppt',healthGuidelineUnit:'mg/L'},
        {id:'qa-health',name:'QA guideline unit',legalLimitUnit:null,healthGuidelineUnit:'particles/L'},
        {id:'qa-default',name:'QA default unit',legalLimitUnit:null,healthGuidelineUnit:null},
      ] : [];
      return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(body)});
    });
    await page.goto((process.env.QA_URL || 'http://localhost:3020/')+'#submit');
    await page.locator('#rname').fill('Unsaved test name');
    for (const [name, unit] of [['QA legal unit','ppt'],['QA guideline unit','particles/L'],['QA default unit','ppb']]) {
      await page.locator('#rcontam').click();
      await page.getByRole('option',{name,exact:true}).click();
      assert.equal(await page.locator('#runit').inputValue(),unit);
      assert.equal(await page.locator('#rname').inputValue(),'Unsaved test name');
    }
    await page.locator('#runit').fill('custom');
    await page.locator('#rloc').fill('Unsaved location');
    assert.equal(await page.locator('#runit').inputValue(),'custom');
    assert.equal(posts,0);
    console.log('PASS: fixture-based legal/guideline/default units, other fields preserved, manual unit retained; no submissions');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
