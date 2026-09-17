function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch {}
  try { return require('C:/Users/ayada/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright'); } catch {}
  throw new Error('Playwright not found');
}
const { chromium } = loadPlaywright();
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
    // 1. Check TankCanvas scheduling leaks on invisible canvas
    {
      console.log('[QA-Resource] Testing TankCanvas scheduling when offscreen...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));

      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Baseline count on hero (in view)
      const count1 = await page.evaluate(() => window.__tankCanvasScheduled || 0);
      await page.waitForTimeout(1000);
      const count2 = await page.evaluate(() => window.__tankCanvasScheduled || 0);
      const heroScheduled = count2 - count1;

      // Scroll far down to #search so TankCanvas is completely offscreen
      await page.evaluate(() => window.scrollTo(0, 3000));
      await page.waitForTimeout(600);

      const offscreen1 = await page.evaluate(() => window.__tankCanvasScheduled || 0);
      await page.waitForTimeout(1000);
      const offscreen2 = await page.evaluate(() => window.__tankCanvasScheduled || 0);
      const offscreenScheduled = offscreen2 - offscreen1;

      auditResults.rafLeaks.heroInViewScheduled = heroScheduled;
      auditResults.rafLeaks.offscreenScheduled = offscreenScheduled;
      auditResults.rafLeaks.offscreenSpins = offscreenScheduled > 0;

      console.log(`[QA-Resource] TankCanvas In-View: ~${heroScheduled} scheduled frames/sec | Offscreen: ${offscreenScheduled} frames/sec (Leaks offscreen: ${offscreenScheduled > 0})`);
      await context.close();
    }

    // 2. Reduced motion scheduling activity
    {
      console.log('[QA-Resource] Testing TankCanvas scheduling under prefers-reduced-motion...');
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: 'reduce',
      });
      const page = await context.newPage();
      await page.addInitScript(() => sessionStorage.setItem('ripple-entered', '1'));

      await page.goto(`${BASE_URL}/`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      const r1 = await page.evaluate(() => window.__tankCanvasScheduled || 0);
      await page.waitForTimeout(1000);
      const r2 = await page.evaluate(() => window.__tankCanvasScheduled || 0);
      const reducedMotionScheduled = r2 - r1;

      auditResults.rafLeaks.reducedMotionScheduled = reducedMotionScheduled;
      auditResults.rafLeaks.reducedMotionSpins = reducedMotionScheduled > 0;

      console.log(`[QA-Resource] TankCanvas under Reduced Motion: ${reducedMotionScheduled} scheduled frames/sec (Leaks: ${reducedMotionScheduled > 0})`);
      await context.close();
    }

    // 3. WebGL Failure / Context Loss Simulation
    {
      console.log('[QA-Resource] Testing WebGL context loss recovery at Intro...');
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();

      const pageErrors = [];
      page.on('pageerror', err => pageErrors.push(err.message));

      await page.goto(`${BASE_URL}/?intro=1`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(1000);

      // Simulate runtime WEBGL_lose_context
      const lossSimulation = await page.evaluate(() => {
        const c = document.querySelector('canvas.microscope-model');
        if (!c) return 'no_canvas';
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) return 'no_gl';
        const ext = gl.getExtension('WEBGL_lose_context');
        if (!ext) return 'unsupported';
        ext.loseContext();
        return 'lost';
      });

      await page.waitForTimeout(600);

      // Dialog should unlock / close cleanly without trapping
      const dialogOpen = (await page.locator('dialog[open]').count()) > 0;
      auditResults.webglFailure = {
        lossSimulation,
        dialogOpenAfterLoss: dialogOpen,
        errors: pageErrors,
      };
      console.log(`[QA-Resource] WebGL Loss Test: result=${lossSimulation}, Dialog after loss=${dialogOpen ? 'open' : 'dismissed'}, Errors=${pageErrors.length}`);
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
