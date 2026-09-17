function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch {}
  try { return require('C:/Users/ayada/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright'); } catch {}
  throw new Error('Playwright not found');
}
const { chromium } = loadPlaywright();
const path = require('node:path');
const fs = require('node:fs');
const assert = require('node:assert/strict');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3020';
const SCREENSHOT_DIR = path.resolve(__dirname, '../../docs/qa/screenshots');

if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: '1440_desktop', width: 1440, height: 900 },
  { name: '1024_tablet_landscape', width: 1024, height: 768 },
  { name: '768_tablet_portrait', width: 768, height: 1024 },
  { name: '390_mobile_standard', width: 390, height: 844 },
  { name: '320_mobile_narrow', width: 320, height: 568 },
];

const results = {
  viewports: {},
  keyboardNav: {},
  dialogTraps: {},
  overflows: {},
  reducedMotion: {},
  zoom: {},
  zipSearch: {},
  networkFailure: {},
  historyNavigation: {},
};

(async () => {
  console.log('[QA] Starting Browser Checks against ' + BASE_URL + '...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    for (const vp of VIEWPORTS) {
      console.log('[QA] Checking viewport ' + vp.name + ' (' + vp.width + 'x' + vp.height + ')...');
      const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const page = await context.newPage();
      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1200);

      const overflow = await page.evaluate(() => {
        const docW = document.documentElement.scrollWidth;
        const winW = window.innerWidth;
        const spillingElements = [];
        if (docW > winW) {
          const all = document.querySelectorAll('*');
          for (const el of all) {
            const rect = el.getBoundingClientRect();
            if (rect.right > winW + 1) {
              spillingElements.push({
                tag: el.tagName,
                id: el.id,
                className: el.className,
                right: rect.right,
                width: rect.width,
              });
            }
          }
        }
        return { hasOverflow: docW > winW, docW, winW, spillingElements: spillingElements.slice(0, 5) };
      });

      const shotPath = path.join(SCREENSHOT_DIR, 'viewport_' + vp.name + '.png');
      await page.screenshot({ path: shotPath, fullPage: false });

      results.overflows[vp.name] = overflow;
      results.viewports[vp.name] = {
        errors: pageErrors,
        overflow: overflow.hasOverflow,
        screenshot: shotPath,
      };

      console.log('[QA] ' + vp.name + ': Overflow=' + (overflow.hasOverflow ? 'FAIL' : 'PASS') + ', Errors=' + pageErrors.length);
      await context.close();
    }

    // 2. Keyboard Nav & Focus
    {
      console.log('[QA] Testing Keyboard Navigation & Visible Focus (1440px)...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const tabbedElements = [];
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press('Tab');
        await page.waitForTimeout(100);
        const focused = await page.evaluate(() => {
          const el = document.activeElement;
          if (!el || el === document.body) return null;
          const style = window.getComputedStyle(el);
          const rect = el.getBoundingClientRect();
          return {
            tagName: el.tagName,
            id: el.id,
            className: el.className,
            text: (el.textContent || '').trim().slice(0, 30),
            outline: style.outline,
            outlineWidth: style.outlineWidth,
            boxShadow: style.boxShadow,
            isInView: rect.top >= 0 && rect.bottom <= window.innerHeight,
          };
        });
        if (focused) tabbedElements.push(focused);
      }
      const focusShot = path.join(SCREENSHOT_DIR, 'keyboard_focus_tabbing.png');
      await page.screenshot({ path: focusShot });
      results.keyboardNav = { tabbedElements, count: tabbedElements.length, screenshot: focusShot };
      console.log('[QA] Keyboard Nav: tabbed through ' + tabbedElements.length + ' elements.');
      await context.close();
    }

    // 3. Intro Dialog & Traps Check (Mid-animation Skip + Escape)
    {
      console.log('[QA] Testing Intro Dialog, Mid-Animation Skip & Esc handling...');
      for (const vp of [1440, 390]) {
        const context = await browser.newContext({ viewport: { width: vp, height: 800 } });
        const page = await context.newPage();
        await page.goto(BASE_URL + '/?intro=1', { waitUntil: 'domcontentloaded' });
        await page.waitForSelector('dialog[open]');

        const skipBtn = page.locator('.gate-skip-control');
        assert.ok(await skipBtn.isVisible(), 'Skip button must be visible');

        const topRightBtns = await page.locator('.gate-top button').count();
        assert.equal(topRightBtns, 0, 'Top-right skip button must remain absent');

        // Test mid-animation Skip button click without force: true
        const enterBtn = page.locator('.gate-enter');
        if (await enterBtn.isVisible()) {
          await enterBtn.click();
          await page.waitForTimeout(200); // in leaving / droplet phase
          await skipBtn.click({ timeout: 2000 });
          await page.waitForTimeout(400);
        }

        const isDialogDetached = (await page.locator('dialog[open]').count()) === 0;
        assert.ok(isDialogDetached, 'Dialog must close on Skip click during animation');

        results.dialogTraps['vp_' + vp] = {
          skipClickDismisses: isDialogDetached,
          skipButtonPresent: true,
          topRightRemoved: topRightBtns === 0,
        };
        console.log('[QA] Intro Dialog (' + vp + 'px): Mid-Animation Skip Dismiss=' + isDialogDetached);
        await context.close();
      }
    }

    // 4. Reduced Motion
    {
      console.log('[QA] Testing Reduced Motion handling...');
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.goto(BASE_URL + '/?intro=1', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const enterBtn = page.locator('.gate-enter');
      let dialogGone = false;
      if (await enterBtn.isVisible()) {
        await enterBtn.click();
        await page.waitForTimeout(300);
        dialogGone = (await page.locator('dialog[open]').count()) === 0;
      }

      const fluidCursorVisible = await page.evaluate(() => {
        const cursor = document.querySelector('[data-fluid-cursor]');
        return cursor ? window.getComputedStyle(cursor).display !== 'none' : false;
      });
      results.reducedMotion = {
        immediateDismiss: dialogGone,
        cursorSuppressed: !fluidCursorVisible,
      };
      console.log('[QA] Reduced Motion: Immediate Dismiss=' + dialogGone + ', Cursor Suppressed=' + !fluidCursorVisible);
      await context.close();
    }

    // 5. Read-Only ZIP Search
    {
      console.log('[QA] Testing Read-Only ZIP Searches...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const input = page.locator('input[aria-label*="Search"]');
      await input.fill('60614');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);

      const resultsText = await page.locator('#search h2').textContent();
      const cardCount = await page.locator('#search [data-slot="card"]').count();
      const searchShot = path.join(SCREENSHOT_DIR, 'search_valid_zip.png');
      await page.screenshot({ path: searchShot });

      await input.fill('00000');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(1500);
      const invalidShot = path.join(SCREENSHOT_DIR, 'search_invalid_zip.png');
      await page.screenshot({ path: invalidShot });

      results.zipSearch = {
        validQuery: '60614',
        validResultHeader: resultsText,
        cardsFound: cardCount,
        invalidQuery: '00000',
        screenshots: [searchShot, invalidShot],
      };
      console.log('[QA] ZIP Search: 60614 found ' + cardCount + ' cards.');
      await context.close();
    }

    // 6. Network Failure Simulation
    {
      console.log('[QA] Testing Network Failure (API 500 Simulation)...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));

      await page.route('**/api/stats', route => route.fulfill({ status: 500, body: JSON.stringify({ error: 'DB unavailable' }) }));
      await page.route('**/api/utilities/scores', route => route.fulfill({ status: 500, body: JSON.stringify({ error: 'DB unavailable' }) }));

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      const netFailShot = path.join(SCREENSHOT_DIR, 'network_failure_500.png');
      await page.screenshot({ path: netFailShot });

      const isPageAlive = await page.locator('.tank-editorial h1').isVisible();
      results.networkFailure = {
        pageSurvived: isPageAlive,
        uncaughtErrors: pageErrors,
        screenshot: netFailShot,
      };
      console.log('[QA] Network Failure: Page Survived=' + isPageAlive + ', Errors=' + pageErrors.length);
      await context.close();
    }

    // 7. History Navigation
    {
      console.log('[QA] Testing Back / Forward Navigation...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });

      await page.locator('button:has-text("ABOUT")').first().click();
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.location.hash), '#about');

      await page.locator('button:has-text("MICROPLASTICS")').first().click();
      await page.waitForTimeout(400);
      assert.equal(await page.evaluate(() => window.location.hash), '#microplastics');

      await page.goBack();
      await page.waitForTimeout(400);
      const backHash = await page.evaluate(() => window.location.hash);

      results.historyNavigation = {
        backRestoredHash: backHash,
        success: backHash === '#about',
      };
      console.log('[QA] History Nav: back restored hash = ' + backHash);
      await context.close();
    }

    // 8. 200% Zoom
    {
      console.log('[QA] Testing 200% Zoom text scaling...');
      const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded' });
      await page.evaluate(() => { document.body.style.zoom = '200%'; });
      await page.waitForTimeout(800);
      const zoomShot = path.join(SCREENSHOT_DIR, 'zoom_200_percent.png');
      await page.screenshot({ path: zoomShot });
      results.zoom = { zoomTested: '200%', screenshot: zoomShot };
      console.log('[QA] Zoom: captured 200% zoom screenshot.');
      await context.close();
    }

  } finally {
    await browser.close();
  }

  const outPath = path.resolve(__dirname, '../../docs/qa/browser-checks-results.json');
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log('[QA] Browser checks completed. Summary saved to ' + outPath);
})();
