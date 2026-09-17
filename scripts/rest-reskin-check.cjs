const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const base = process.env.QA_URL || 'http://localhost:3020/';
    const titles = {
      map: 'Water utilities across America',
      microplastics: 'Microplastics in our freshwater',
      reports: 'Report what you see in your water',
      donate: 'Fund the microplastics identifier',
    };
    for (const route of ['map','microplastics','reports','donate']) {
      await page.goto(base+'#'+route);
      await page.getByRole('heading',{name:titles[route]}).waitFor();
      const root = page.locator('.editorial-page');
      assert.equal(await root.count(),1,`${route}: missing editorial wrapper`);
      assert.match(await root.locator('h1').evaluate(e=>getComputedStyle(e).fontFamily),/Cormorant/i);
      assert.equal(await root.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(5, 8, 10)');
      await page.waitForTimeout(600);
      await page.screenshot({path:`C:/Users/ayada/AppData/Local/Temp/rest-${route}-desktop.png`});
      for (const width of [320,375,768]) {
        await page.setViewportSize({width,height:800});
        await page.waitForTimeout(250);
        assert.equal(await root.evaluate(e=>e.scrollWidth<=document.documentElement.clientWidth),true,`${route}: fits ${width}px`);
      }
      await page.setViewportSize({width:375,height:800});
      await page.screenshot({path:`C:/Users/ayada/AppData/Local/Temp/rest-${route}-mobile.png`});
      await page.setViewportSize({width:1440,height:1000});
      console.log(`PASS: ${route} editorial font, dark surface, mobile bounds`);
    }
    await page.goto(base+'#donate');
    await page.getByRole('heading',{name:titles.donate}).waitFor();
    const donatePage = page.locator('.editorial-page');
    const destination='https://hcb.hackclub.com/donations/start/a-ripple-effect-initiative-arei';
    assert.equal(await donatePage.locator('iframe[name=donateFrame]').getAttribute('src'),destination);
    const link=donatePage.getByRole('link',{name:'Donate securely via HCB'});
    assert.equal(await link.getAttribute('href'),destination);
    await link.click({trial:true});
    console.log('PASS: HCB iframe URL and external donation link retained (no payment attempted)');
    await page.goto(base+'#reports');
    await page.getByRole('heading',{name:titles.reports}).waitFor();
    await page.getByRole('textbox').first().fill('QA local only');
    console.log('PASS: report form keyboard input');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
