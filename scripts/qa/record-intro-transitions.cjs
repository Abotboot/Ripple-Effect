function loadPlaywright() {
  if (process.env.PLAYWRIGHT_MODULE) return require(process.env.PLAYWRIGHT_MODULE);
  try { return require('playwright'); } catch {}
  try { return require('C:/Users/ayada/AppData/Roaming/npm/node_modules/omniroute/node_modules/playwright'); } catch {}
  throw new Error('Playwright not found');
}
const { chromium } = loadPlaywright();
const path = require('node:path');
const fs = require('node:fs');

const BASE_URL = process.env.QA_BASE_URL || 'http://localhost:3034';
const REC_DIR = path.resolve(__dirname, '../../docs/qa/recordings');

if (!fs.existsSync(REC_DIR)) {
  fs.mkdirSync(REC_DIR, { recursive: true });
}

async function recordScenario(name, width, height, clickTarget = '.gate-enter') {
  console.log(`[REC] Recording ${name} (${width}x${height})...`);
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({
    viewport: { width, height },
    recordVideo: {
      dir: REC_DIR,
      size: { width, height },
    },
  });

  const page = await context.newPage();
  await page.goto(BASE_URL + '/?intro=1', { waitUntil: 'domcontentloaded' });
  // Normal-speed hold to view initial 3D stage and copy
  await page.waitForTimeout(1400);

  // Click action (unforced)
  const target = page.locator(clickTarget);
  await target.click();

  // Hold during the complete 3.8s cinematic dive & liquid mask reveal
  await page.waitForTimeout(4500);

  // Post-reveal home state settling
  await page.waitForTimeout(1200);

  const video = page.video();
  await context.close();
  await browser.close();

  if (video) {
    const videoPath = await video.path();
    const destPath = path.join(REC_DIR, `${name}.webm`);
    if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    fs.renameSync(videoPath, destPath);
    console.log(`[REC] Saved ${destPath} (${fs.statSync(destPath).size} bytes)`);
  }
}

(async () => {
  try {
    await recordScenario('desktop_1440_intro_to_home', 1440, 900);
    await recordScenario('mobile_390_intro_to_home', 390, 844);
    await recordScenario('mobile_320_intro_to_home', 320, 568);
    console.log('[REC] All motion recordings captured successfully.');
  } catch (err) {
    console.error('[REC] Recording failed:', err);
    process.exit(1);
  }
})();
