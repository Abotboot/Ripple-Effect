const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const base = process.env.QA_URL || 'http://localhost:3020/';
    for (const route of ['about','faq','sources','partners']) {
      await page.goto(base+'#'+route);
      const titles = {about:'A Ripple Effect Initiative',faq:'Questions, answered',sources:'Integrated data sources',partners:'Partners & sponsors'};
      await page.getByRole('heading',{name:titles[route],exact:true}).waitFor();
      const root = page.locator('.editorial-page');
      assert.equal(await root.count(),1,`${route}: missing editorial wrapper`);
      assert.match(await root.locator('h1').evaluate(e=>getComputedStyle(e).fontFamily),/Cormorant/i);
      assert.equal(await root.evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(5, 8, 10)');
      await page.waitForTimeout(600);
      await page.screenshot({path:`C:/Users/ayada/AppData/Local/Temp/info-${route}-desktop.png`});
      for (const width of [320,375,768]) {
        await page.setViewportSize({width,height:800});
        assert.equal(await root.evaluate(e=>e.scrollWidth<=document.documentElement.clientWidth),true,`${route}: fits ${width}px`);
      }
      await page.setViewportSize({width:375,height:800});
      await page.screenshot({path:`C:/Users/ayada/AppData/Local/Temp/info-${route}-mobile.png`});
      await page.setViewportSize({width:1440,height:1000});
      console.log(`PASS: ${route} editorial font, dark surface, mobile bounds`);
    }
    await page.goto(base+'#faq');
    const input=page.getByPlaceholder('Search questions...');
    await input.fill('zz-no-match-qa');
    await page.getByText(/No questions match/).waitFor();
    await input.fill('');
    const trigger=page.locator('[data-slot="accordion-trigger"]').first();
    await trigger.click();
    assert.equal(await trigger.getAttribute('aria-expanded'),'true');
    await trigger.focus();
    await page.keyboard.press('Enter');
    assert.equal(await trigger.getAttribute('aria-expanded'),'false');
    console.log('PASS: FAQ search and keyboard accordion');
    await page.locator('header button[aria-label="Switch to light mode"]').click();
    assert.equal(await page.locator('.editorial-page h1').evaluate(e=>getComputedStyle(e).color),'rgb(220, 235, 229)');
    await page.goto(base+'#sources');
    await page.getByRole('heading',{name:'Integrated data sources',exact:true}).waitFor();
    const links=page.locator('.editorial-page [data-slot="card"] a[href^="https://"]');
    assert.ok(await links.count()>3);
    await links.first().scrollIntoViewIfNeeded();
    await links.first().click({trial:true});
    await page.goto(base+'#partners');
    await page.getByRole('button',{name:'Contact us',exact:true}).click();
    await page.getByRole('heading',{name:'A Ripple Effect Initiative',exact:true}).waitFor();
    console.log('PASS: light-theme heading, source link actionable, partner Contact navigation');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1});
