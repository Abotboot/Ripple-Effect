// Single acceptance for the user's report: bottle realism + new-UI consistency.
// Passes only if WebGL bottle renders (not the old 2D fallback) AND every
// public section carries the tank editorial styling.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const failures = [];
  const check = (name, ok) => { console.log((ok ? 'PASS' : 'FAIL') + ': ' + name); if (!ok) failures.push(name); };
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
    await page.goto(process.env.QA_URL || 'http://localhost:3020/', { waitUntil: 'domcontentloaded' });

    // 1. Bottle: WebGL renderer active, real pixel variation on UV + rotation.
    const stage = page.locator('.specimen-stage');
    await stage.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector('.specimen-stage canvas')?.dataset.rendered === 'macro', null, { timeout: 15000 });
    const canvas = stage.locator('canvas');
    check('bottle uses WebGL (not 2D fallback)', await canvas.evaluate(c => c.dataset.renderer === 'webgl'));
    const macro = await canvas.evaluate(c => c.toDataURL());
    await stage.getByRole('button', { name: 'UV view', exact: true }).click();
    await page.waitForFunction(() => document.querySelector('.specimen-stage canvas')?.dataset.rendered === 'uv', null, { timeout: 15000 });
    const uvShot = await canvas.evaluate(c => c.toDataURL());
    check('UV mode changes rendered bottle pixels', uvShot !== macro);
    await stage.getByRole('slider', { name: 'Rotate specimen' }).focus();
    await page.keyboard.press('ArrowRight');
    await page.waitForFunction(() => document.querySelector('.specimen-stage canvas')?.dataset.angle === '5', null, { timeout: 15000 });
    check('rotation redraws WebGL frame', await canvas.evaluate(c => c.toDataURL()) !== uvShot);
    await page.screenshot({ path: 'C:/Users/ayada/AppData/Local/Temp/acceptance-bottle.png' });

    // 2. New UI: editorial serif + obsidian surface on every public section.
    const sections = {
      about: 'A Ripple Effect Initiative', faq: 'Questions, answered',
      sources: 'Integrated data sources', partners: 'Partners & sponsors',
      map: 'Water utilities across America', microplastics: 'Microplastics in our freshwater',
      reports: 'Report what you see in your water', donate: 'Fund the microplastics identifier',
      privacy: 'Privacy Policy', terms: 'Terms of Service',
    };
    for (const [hash, title] of Object.entries(sections)) {
      await page.goto((process.env.QA_URL || 'http://localhost:3020/') + '#' + hash);
      const heading = page.getByRole('heading', { name: title }).first();
      await heading.waitFor({ timeout: 15000 });
      const styled = await heading.evaluate(e => {
        let el = e;
        while (el && el !== document.body) {
          if (el.classList?.contains('editorial-page')) {
            const bg = getComputedStyle(el).backgroundColor;
            const font = getComputedStyle(e).fontFamily;
            return bg === 'rgb(5, 8, 10)' && /Cormorant/i.test(font);
          }
          el = el.parentElement;
        }
        return false;
      });
      check(`section ${hash} uses tank editorial styling`, styled);
    }
    check('no page JavaScript errors during run', errors.length === 0);
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(process.env.QA_URL || 'http://localhost:3020/');
    await page.waitForTimeout(800);
    const fits = await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1);
    check('mobile 375px home has no horizontal overflow', fits);
  } finally { await browser.close(); }
  if (failures.length) { console.log('ACCEPTANCE FAILED: ' + failures.join('; ')); process.exit(1); }
  console.log('ACCEPTANCE GREEN: bottle WebGL + all-section tank styling');
})().catch(e => { console.error('ACCEPTANCE ERROR:', e.message); process.exit(1); });
