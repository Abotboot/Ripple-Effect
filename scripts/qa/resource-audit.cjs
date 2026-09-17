const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'C:/Users/ayada/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright');
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3020';

const auditResults = {
  rafLeaks: {},
  webglFailure: {},
  listenerAccumulation: {},
  bundleSizes: {},
};

(async () => {
  console.log('[QA-Resource] Starting Resource & Bundle Audit...');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });

  try {
    // 1. Check requestAnimationFrame leaks on invisible & reduced-motion canvas
    {
      console.log('[QA-Resource] Testing rAF activity on offscreen TankCanvas...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));

      // Instrument requestAnimationFrame counting in page
      await page.addInitScript(() => {
        window.__rafCount = 0;
        const origRaf = window.requestAnimationFrame;
        window.requestAnimationFrame = function (cb) {
          window.__rafCount++;
          return origRaf.call(window, cb);
        };
      });

      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Baseline count on hero (in view)
      const count1 = await page.evaluate(() => window.__rafCount);
      await page.waitForTimeout(1000);
      const count2 = await page.evaluate(() => window.__rafCount);
      const heroFps = count2 - count1;

      // Scroll far down to #search so TankCanvas is completely offscreen
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.waitForTimeout(500);

      const offscreen1 = await page.evaluate(() => window.__rafCount);
      await page.waitForTimeout(1000);
      const offscreen2 = await page.evaluate(() => window.__rafCount);
      const offscreenFps = offscreen2 - offscreen1;

      auditResults.rafLeaks.heroInViewFps = heroFps;
      auditResults.rafLeaks.offscreenFps = offscreenFps;
      auditResults.rafLeaks.offscreenSpins = offscreenFps > 20;

      console.log(`[QA-Resource] rAF In-View: ~${heroFps} calls/sec | Offscreen: ~${offscreenFps} calls/sec (Spins while invisible: ${offscreenFps > 20})`);
      await context.close();
    }

    // 2. Reduced motion rAF activity
    {
      console.log('[QA-Resource] Testing rAF activity under prefers-reduced-motion...');
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.addInitScript(() => {
        window.__rafCount = 0;
        const origRaf = window.requestAnimationFrame;
        window.requestAnimationFrame = function (cb) {
          window.__rafCount++;
          return origRaf.call(window, cb);
        };
      });

      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const r1 = await page.evaluate(() => window.__rafCount);
      await page.waitForTimeout(1000);
      const r2 = await page.evaluate(() => window.__rafCount);
      const reducedMotionFps = r2 - r1;

      auditResults.rafLeaks.reducedMotionFps = reducedMotionFps;
      auditResults.rafLeaks.reducedMotionSpins = reducedMotionFps > 20;

      console.log(`[QA-Resource] rAF under Reduced Motion: ~${reducedMotionFps} calls/sec (Spins: ${reducedMotionFps > 20})`);
      await context.close();
    }

    // 3. WebGL Failure / Context Unavailable Simulation
    {
      console.log('[QA-Resource] Testing WebGL failure handling at Intro...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      // Mock WebGL unavailable: getContext('webgl2') and getContext('webgl') return null
      await page.addInitScript(() => {
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, ...args) {
          if (type.includes('webgl')) return null;
          return origGetContext.call(this, type, ...args);
        };
      });

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1500);

      // Check if dialog is open or if it cleanly dismissed
      const dialogOpen = (await page.locator('dialog[open]').count()) > 0;
      let trapped = false;
      if (dialogOpen) {
        // If dialog opened, can user click ENTER THE CURRENT without WebGL crashing?
        const enterBtn = page.locator('.gate-enter');
        if (await enterBtn.isVisible()) {
          await enterBtn.click();
          await page.waitForTimeout(1000);
          trapped = (await page.locator('dialog[open]').count()) > 0;
        }
      }

      auditResults.webglFailure = {
        dialogOpenOnInit: dialogOpen,
        trappedAtIntro: trapped,
        errors: pageErrors,
      };
      console.log(`[QA-Resource] WebGL Failure: Dialog open init=${dialogOpen}, Trapped on Enter=${trapped}, Errors=${pageErrors.length}`);
      await context.close();
    }

    // 4. Listener / Context Accumulation on Home Revisit
    {
      console.log('[QA-Resource] Testing listener/context accumulation over 5 route flips...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));
      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const cycles = [];
      for (let i = 1; i <= 5; i++) {
        // Navigate away to #map
        await page.evaluate(() => { window.location.hash = '#map'; });
        await page.waitForTimeout(300);
        // Navigate back to #home
        await page.evaluate(() => { window.location.hash = '#home'; });
        await page.waitForTimeout(300);

        const counts = await page.evaluate(() => {
          return {
            canvasCount: document.querySelectorAll('canvas').length,
            dialogCount: document.querySelectorAll('dialog').length,
            scrollTriggerCount: typeof ScrollTrigger !== 'undefined' ? ScrollTrigger.getAll().length : null,
          };
        });
        cycles.push(counts);
      }

      auditResults.listenerAccumulation = {
        cycles,
        canvasesStable: cycles.every(c => c.canvasCount === cycles[0].canvasCount),
      };
      console.log(`[QA-Resource] DOM & Context Stability: Initial Canvases=${cycles[0].canvasCount}, Final Canvases=${cycles[4].canvasCount}`);
      await context.close();
    }

  } finally {
    await browser.close();
  }

  // 5. Bundle Size Audit via .next build output
  const buildManifestPath = path.resolve(__dirname, '../../.next/build-manifest.json');
  if (fs.existsSync(buildManifestPath)) {
    const manifest = JSON.parse(fs.readFileSync(buildManifestPath, 'utf8'));
    const stats = {};
    const rootNext = path.resolve(__dirname, '../../.next');
    for (const [pageName, files] of Object.entries(manifest.pages || {})) {
      let totalBytes = 0;
      for (const file of files) {
        const fullPath = path.join(rootNext, file);
        if (fs.existsSync(fullPath)) {
          totalBytes += fs.statSync(fullPath).size;
        }
      }
      stats[pageName] = {
        filesCount: files.length,
        totalKilobytes: +(totalBytes / 1024).toFixed(1),
      };
    }
    auditResults.bundleSizes = stats;
  }

  const outPath = path.resolve(__dirname, '../../docs/qa/resource-audit-results.json');
  fs.writeFileSync(outPath, JSON.stringify(auditResults, null, 2), 'utf8');
  console.log(`[QA-Resource] Audit completed. Summary saved to ${outPath}`);
})();
