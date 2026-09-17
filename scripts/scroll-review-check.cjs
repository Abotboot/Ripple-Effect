const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    for (const width of [1440, 375]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto('http://localhost:3020/');
      const number = page.locator('.particle-number > span').first();
      await number.scrollIntoViewIfNeeded();
      await page.waitForFunction(() => document.querySelector('.particle-number > span')?.textContent === '240,000');
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(400);
      assert.equal(await number.textContent(), '240,000');
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(400);
      assert.equal(await number.textContent(), '240,000');
      assert.equal(await page.locator('.tank-cross').count(), 0);
      await page.goto('http://localhost:3020/#submit');
      await page.locator('input').first().waitFor();
      const rounded = await page.locator('[data-slot=button], [data-slot=input], [data-slot=card], [data-slot=select-trigger]').evaluateAll(els => els.filter(e => e.getBoundingClientRect().width && getComputedStyle(e).borderTopLeftRadius !== '0px').map(e => e.outerHTML.slice(0, 120)));
      assert.deepEqual(rounded, []);
      console.log(`PASS ${width}px: count settles and stays at 240,000, empty plus removed, controls square`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
