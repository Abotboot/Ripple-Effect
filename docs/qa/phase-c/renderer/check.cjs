/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node/browser artwork QA. */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const sharp = require('sharp');
const { ROOT, contained, sha256, writeFile, loadPlaywright } = require('../../phase-b/source-recovery/offline-tools.cjs');
const QA = path.join(ROOT, 'docs/qa/phase-c/renderer');
const masterPath = contained(ROOT, 'public/media/ripple/particle-world-master.webp');
const terminalPath = contained(ROOT, 'public/media/ripple/live/microscope-terminal.webp');
const boundaryPath = fs.existsSync(terminalPath) ? terminalPath : contained(ROOT, 'public/media/ripple/microscope-poster.webp');
const openingPath = contained(ROOT, 'public/media/ripple/live/microscope-opening.webp');
const nonblackPath = fs.existsSync(openingPath) ? openingPath : contained(ROOT, 'public/media/ripple/microscope-poster.webp');
const modulePath = contained(ROOT, 'src/lib/artwork-field.ts');
const source = fs.readFileSync(modulePath, 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ES2020 } }).outputText;
const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#010608}canvas{display:block}</style></head><body><canvas id="art"></canvas><script type="module">
import {createArtworkField,ARTWORK_REGIONS,getArtworkEntrance} from '/field.js';
const master=new Image(), boundary=new Image(), nonblack=new Image(), uniformWater=new Image();
master.src='/master.webp';boundary.src='/boundary.webp';nonblack.src='/nonblack.webp';uniformWater.src='/flat-water.png';
await Promise.all([master.decode(),boundary.decode(),nonblack.decode(),uniformWater.decode()]);
Object.assign(window,{createArtworkField,ARTWORK_REGIONS,getArtworkEntrance,master,boundary,nonblack,uniformWater});
window.RENDER_READY=true;
</script></body></html>`;

async function main() {
  const { chromium, executablePath, version } = loadPlaywright();
  const routes = new Map([
    ['/', { type: 'text/html', bytes: Buffer.from(html) }],
    ['/field.js', { type: 'text/javascript', bytes: Buffer.from(compiled) }],
    ['/master.webp', { type: 'image/webp', bytes: fs.readFileSync(masterPath) }],
    ['/boundary.webp', { type: 'image/webp', bytes: fs.readFileSync(boundaryPath) }],
    ['/nonblack.webp', { type: 'image/webp', bytes: fs.readFileSync(nonblackPath) }],
    ['/flat-water.png', { type: 'image/png', bytes: await sharp({ create: { width: 1672, height: 941,
      channels: 3, background: { r: 16, g: 32, b: 40 } } }).png().toBuffer() }],
  ]);
  const server = http.createServer((req, res) => {
    const host = `127.0.0.1:${server.address().port}`;
    if (req.headers.host !== host || (req.headers.origin && req.headers.origin !== `http://${host}`)) { res.writeHead(403).end(); return; }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405).end(); return; }
    if (req.url === '/favicon.ico') { res.writeHead(204).end(); return; }
    const route = routes.get(req.url);
    if (!route) { res.writeHead(404).end(); return; }
    res.setHeader('Content-Type', route.type);
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self' 'unsafe-inline'; style-src 'unsafe-inline'; img-src 'self'; base-uri 'none'; frame-ancestors 'none'");
    res.end(req.method === 'HEAD' ? undefined : route.bytes);
  });
  server.requestTimeout = 10000;
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  let browser;
  let context;
  let scratch;
  const oldTemp = process.env.TEMP;
  const oldTmp = process.env.TMP;
  try {
    scratch = fs.mkdtempSync(contained(QA, '.browser-'));
    process.env.TEMP = process.env.TMP = scratch;
    browser = await chromium.launch({ executablePath, headless: true, downloadsPath: scratch,
      args: ['--force-color-profile=srgb'], timeout: 30000 });
    context = await browser.newContext({ viewport: { width: 1440, height: 810 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
    const errors = [];
    await context.route('**/*', async route => {
      if (new URL(route.request().url()).origin === origin) await route.continue();
      else { errors.push(`Unexpected external request: ${route.request().url()}`); await route.abort(); }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
    await page.goto(origin);
    await page.waitForFunction(() => window.RENDER_READY === true);
    const setup = await page.evaluate(async () => {
      const canvas = document.querySelector('#art');
      const imagePair = { master: window.master, boundary: window.boundary };
      let rafCalls = 0;
      const raf = window.requestAnimationFrame;
      window.requestAnimationFrame = (...args) => { rafCalls += 1; return raf(...args); };
      window.field = window.createArtworkField(canvas, imagePair);
      window.requestAnimationFrame = raf;
      window.frame = (overrides = {}) => window.field.render({ time: 0, entrance: 1, category: 'all', pointer: null, ...overrides });
      // Direct repeated getImageData on the renderer can switch Chromium's raster backend.
      // Read PNG snapshots in a separate CPU canvas so QA does not change the renderer itself.
      window.readPNG = async source => {
        const blob = await new Promise(resolve => source.toBlob(resolve, 'image/png'));
        const bitmap = await createImageBitmap(blob);
        const temporary = document.createElement('canvas');
        temporary.width = source.width; temporary.height = source.height;
        const ctx = temporary.getContext('2d', { willReadFrequently: true });
        try {
          ctx.drawImage(bitmap, 0, 0);
          return ctx.getImageData(0, 0, temporary.width, temporary.height).data;
        } finally { bitmap.close(); temporary.width = 0; temporary.height = 0; }
      };
      window.pixels = () => window.readPNG(document.querySelector('#art'));
      window.digest = async data => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', data))).map(value => value.toString(16).padStart(2, '0')).join('');
      window.compare = (a, b) => {
        if (a.length !== b.length) throw Error('Different raster dimensions');
        let changedPixels = 0; let total = 0; let maxChannelDifference = 0;
        for (let i = 0; i < a.length; i += 4) {
          let changed = false;
          for (let j = 0; j < 3; j += 1) { const delta = Math.abs(a[i + j] - b[i + j]); total += delta; maxChannelDifference = Math.max(maxChannelDifference, delta); changed ||= delta !== 0; }
          if (changed) changedPixels += 1;
        }
        return { changedPixels, meanAbsoluteChannelDifference: total / (a.length / 4 * 3), maxChannelDifference };
      };
      window.expected = async (image, width, height, focalX = 0.5) => {
        const canvas = document.querySelector('#art');
        const reference = document.createElement('canvas');
        reference.width = canvas.width; reference.height = canvas.height;
        const ctx = reference.getContext('2d', { alpha: false });
        ctx.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0);
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
        const w = image.naturalWidth * scale, h = image.naturalHeight * scale;
        const x = Math.min(0, Math.max(width - w, width / 2 - w * focalX));
        ctx.drawImage(image, x, (height - h) / 2, w, h);
        try { return await window.readPNG(reference); }
        finally { reference.width = 0; reference.height = 0; }
      };
      window.size = (width, height, dpr) => { const canvas = document.querySelector('#art'); canvas.style.width = width + 'px'; canvas.style.height = height + 'px'; window.field.resize(width, height, dpr); };
      window.size(1920, 1080, 1);
      window.frame({ entrance: 0 });
      return { internalRafCalls: rafCalls, nativeBoundary: window.compare(await window.pixels(), await window.expected(window.boundary, 1920, 1080)) };
    });
    if (setup.internalRafCalls || setup.nativeBoundary.changedPixels) throw Error('Boundary or external RAF ownership check failed');
    const reports = [];
    async function capture(name) {
      const base64 = await page.evaluate(() => document.querySelector('#art').toDataURL('image/png').split(',')[1]);
      const bytes = Buffer.from(base64, 'base64');
      writeFile(QA, name, bytes);
      if (name === 'desktop-granules.png' || name === 'mobile-granules.png') {
        const desktop = name.startsWith('desktop');
        const crop = desktop ? { left: 830, top: 80, width: 470, height: 610 } : { left: 0, top: 100, width: 585, height: 990 };
        writeFile(QA, name.replace('.png', '-details.png'), await sharp(bytes).extract(crop).resize({ width: desktop ? 940 : 780 }).png().toBuffer());
      }
    }
    for (const viewport of [{ name: 'desktop', width: 1440, height: 810, dpr: 1 }, { name: 'mobile', width: 390, height: 844, dpr: 1.5 }]) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      const result = await page.evaluate(async ({ width, height, dpr }) => {
        const assert = (condition, message) => { if (!condition) throw Error(message); };
        window.size(width, height, dpr);
        window.frame({ entrance: 0, time: 90, category: 'granules', pointer: { x: 0.8, y: 0.4 }, impulse: { x: 0.7, y: 0.3, strength: 1 } });
        const boundary = window.compare(await window.pixels(), await window.expected(window.boundary, width, height));
        assert(boundary.changedPixels === 0, 'Entrance zero changed boundary pixels');
        window.frame();
        const rest = await window.pixels();
        const portraitMix = Math.min(1, Math.max(0, (1.4 - width / height) / 0.6));
        const focalX = 0.5 + 0.255 * portraitMix * portraitMix * (3 - 2 * portraitMix);
        const master = window.compare(rest, await window.expected(window.master, width, height, focalX));
        assert(master.changedPixels === 0, 'Settled time-zero image differs from master');
        window.frame({ time: 8 });
        const moving = await window.pixels();
        const drift = window.compare(rest, moving);
        assert(drift.changedPixels > 500, 'Drift did not change the image');
        const pointer = width > height ? { x: 0.79, y: 0.32 } : { x: 0.72, y: 0.32 };
        window.frame({ pointer });
        const pointed = await window.pixels();
        const pointerEffect = window.compare(rest, pointed);
        assert(pointerEffect.changedPixels > 500, 'Pointer effect was not visible in the artwork');
        window.frame({ impulse: { x: 0.72, y: 0.45, strength: 1 } });
        const impulseEffect = window.compare(rest, await window.pixels());
        assert(impulseEffect.changedPixels > 500, 'Impulse did not change the artwork');
        const categories = {};
        for (const category of ['fibers', 'fragments', 'granules']) {
          window.frame({ time: 8, category });
          const pixels = await window.pixels();
          const change = window.compare(moving, pixels);
          assert(change.meanAbsoluteChannelDifference > 0.1, category + ' did not dim non-target artwork');
          const canvas = document.querySelector('#art');
          const scale = Math.max(width / window.master.naturalWidth, height / window.master.naturalHeight);
          const fitWidth = window.master.naturalWidth * scale, fitHeight = window.master.naturalHeight * scale;
          const fitX = Math.min(0, Math.max(width - fitWidth, width / 2 - fitWidth * focalX));
          const fitY = (height - fitHeight) / 2;
          const offsets = window.field.getDiagnostics().lastRegionOffsets;
          const rectangles = window.ARTWORK_REGIONS.filter(region => region.category === category).map(region => {
            const [u, v, w, h] = region.bounds;
            const offset = offsets.find(value => value.id === region.id);
            return { x: (fitX + (Math.floor(u * window.master.naturalWidth) + offset.x) * scale) * canvas.width / width,
              y: (fitY + (Math.floor(v * window.master.naturalHeight) + offset.y) * scale) * canvas.height / height,
              width: Math.ceil(w * window.master.naturalWidth) * scale * canvas.width / width,
              height: Math.ceil(h * window.master.naturalHeight) * scale * canvas.height / height };
          });
          // Compare with the same moving frame dimmed as a whole. The old normal-tile restore
          // adds light throughout rectangular crop corners, including water far from a subject.
          let edgeSamples = 0, maxCornerLift = 0, totalCornerLift = 0, highlightedPixels = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (Math.max(...[0, 1, 2].map(c => pixels[i + c] - Math.round(moving[i + c] * 0.4))) > 8) highlightedPixels++;
          }
          for (const box of rectangles) {
            for (let py = Math.max(0, Math.ceil(box.y)); py < Math.min(canvas.height, box.y + box.height); py += 2) {
              for (let px = Math.max(0, Math.ceil(box.x)); px < Math.min(canvas.width, box.x + box.width); px += 2) {
                const nx = (px + 0.5 - box.x) / box.width * 2 - 1, ny = (py + 0.5 - box.y) / box.height * 2 - 1;
                if (Math.hypot(nx, ny) < 1.08 || Math.max(Math.abs(nx), Math.abs(ny)) > 0.96) continue;
                if (rectangles.some(other => Math.hypot((px + 0.5 - other.x) / other.width * 2 - 1,
                  (py + 0.5 - other.y) / other.height * 2 - 1) < 1.04)) continue;
                const i = (py * canvas.width + px) * 4;
                const lift = Math.max(0, ...[0, 1, 2].map(c => pixels[i + c] - Math.round(moving[i + c] * 0.4)));
                edgeSamples++; totalCornerLift += lift; maxCornerLift = Math.max(maxCornerLift, lift);
              }
            }
          }
          assert(edgeSamples > 20, category + ' did not sample enough crop-corner water');
          assert(maxCornerLift <= 3, category + ' restores rectangular corner water: ' + maxCornerLift);
          assert(highlightedPixels > 50, category + ' lost its subject highlights');
          window.frame({ time: 12, category: 'all' });
          window.frame({ time: 8, category });
          const repeated = window.compare(pixels, await window.pixels());
          assert(repeated.changedPixels === 0, category + ' mask repeat differs at ' + width + 'x' + height + ': ' + JSON.stringify(repeated));
          categories[category] = { change, highlightedPixels, cropEdges: { samples: edgeSamples, maxCornerLift,
            meanCornerLift: totalCornerLift / edgeSamples, allowedRoundingLift: 3 }, repeated };
        }
        window.frame({ entrance: 0.3 });
        const entry = window.field.getDiagnostics();
        const uniqueOffsets = new Set(entry.lastRegionOffsets.map(offset => `${offset.x.toFixed(4)},${offset.y.toFixed(4)}`)).size;
        assert(uniqueOffsets > 8 && entry.lastCameraScale > 0.94 && entry.lastCameraScale < 1, 'Entry must include camera and distinct local movement');
        window.frame({ pointer });
        const repeated = window.compare(pointed, await window.pixels());
        assert(repeated.changedPixels === 0, 'Repeating inputs after other frames was not deterministic');
        window.frame({ entrance: 0 });
        const returnedBoundary = window.compare(await window.pixels(), await window.expected(window.boundary, width, height));
        assert(returnedBoundary.changedPixels === 0, `Seeking to boundary differs: ${JSON.stringify(returnedBoundary)}`);
        const h = 0.0001;
        const easing = window.getArtworkEntrance;
        const derivatives = { startFirst: (easing(h).opacity - easing(0).opacity) / h,
          endFirst: (easing(1).opacity - easing(1 - h).opacity) / h,
          startSecond: (easing(2 * h).opacity - 2 * easing(h).opacity + easing(0).opacity) / (h * h),
          endSecond: (easing(1).opacity - 2 * easing(1 - h).opacity + easing(1 - 2 * h).opacity) / (h * h) };
        assert(Math.abs(derivatives.startFirst) < 0.00001 && Math.abs(derivatives.endFirst) < 0.00001 && Math.abs(derivatives.startSecond) < 0.02 && Math.abs(derivatives.endSecond) < 0.02, 'Entry endpoint derivatives do not settle');
        return { width, height, dpr, boundary, master, drift, pointerEffect, impulseEffect, categories,
          repeated, pointerRGBA: await window.digest(pointed), entry: { cameraScale: entry.lastCameraScale, uniqueLocalOffsets: uniqueOffsets, derivatives } };
      }, viewport);
      await page.evaluate(() => window.frame({ time: 8 }));
      await capture(`${viewport.name}-artwork.png`);
      for (const category of ['fibers', 'fragments', 'granules']) {
        await page.evaluate(category => window.frame({ time: 8, category }), category);
        await capture(`${viewport.name}-${category}.png`);
      }
      await page.evaluate(() => window.frame({ entrance: 0.6 }));
      await capture(`${viewport.name}-entrance.png`);
      const performance = await page.evaluate(async ({ width, height, dpr }) => {
        // Fresh scene avoids measuring a context that QA readback may have moved to the CPU.
        window.field.dispose();
        const old = document.querySelector('#art');
        const canvas = old.cloneNode();
        old.replaceWith(canvas);
        window.field = window.createArtworkField(canvas, { master: window.master, boundary: window.boundary });
        window.field.resize(width, height, dpr);
        const times = []; const intervals = []; let previous = null;
        for (let i = 0; i < 32; i += 1) {
          const presented = await new Promise(resolve => requestAnimationFrame(resolve));
          window.frame({ time: 8 + i / 30 });
          if (i >= 2) {
            times.push(window.field.getDiagnostics().lastRenderMs);
            intervals.push(presented - previous);
          }
          previous = presented;
        }
        times.sort((a, b) => a - b); intervals.sort((a, b) => a - b);
        return { measuredFrames: times.length, submissionMedianMs: times[Math.floor(times.length / 2)],
          submissionP95Ms: times[Math.floor(times.length * 0.95)], ownerRafMedianMs: intervals[Math.floor(intervals.length / 2)],
          ownerRafP95Ms: intervals[Math.floor(intervals.length * 0.95)], resources: window.field.getDiagnostics() };
      }, viewport);
      reports.push({ viewport: viewport.name, ...result, performance });
    }
    const lifecycle = await page.evaluate(() => {
      const rejects = action => { try { action(); return false; } catch { return true; } };
      const invalidTime = [NaN, Infinity, -1].every(time => rejects(() => window.frame({ time })));
      const invalidPointer = rejects(() => window.frame({ pointer: { x: 2, y: 0.5 } }));
      const invalidResize = rejects(() => window.field.resize(0, 800, 1));
      window.field.dispose(); window.field.dispose();
      const disposed = window.field.getDiagnostics();
      return { invalidTime, invalidPointer, invalidResize, doubleDisposeSafe: true,
        releasedCaches: disposed.ownedCanvasCount === 0 && disposed.regionCount === 0 && disposed.approximateCacheBytes === 0,
        rejectsAfterDispose: rejects(() => window.frame()) && rejects(() => window.field.resize(400, 800, 1)) };
    });
    if (Object.values(lifecycle).some(value => !value)) throw Error('Lifecycle validation failed');
    const flatWater = await page.evaluate(async () => {
      // A featureless source must stay featureless in every filter. This directly catches a
      // bright rectangular/elliptical water spotlight even when category pixel differences pass.
      const fixture = document.createElement('canvas');
      fixture.width = 1672; fixture.height = 941;
      const ctx = fixture.getContext('2d');
      ctx.fillStyle = 'rgb(16,32,40)'; ctx.fillRect(0, 0, fixture.width, fixture.height);
      const canvas = document.querySelector('#art');
      window.field = window.createArtworkField(canvas, { master: window.uniformWater, boundary: window.boundary });
      window.size(fixture.width, fixture.height, 1);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(0, 0, fixture.width, fixture.height);
      const expected = await window.readPNG(fixture);
      const checks = [];
      try {
        for (const category of ['fibers', 'fragments', 'granules']) for (const time of [0, 8]) {
          window.frame({ category, time, pointer: { x: 0.8, y: 0.4 } });
          const comparison = window.compare(expected, await window.pixels());
          if (comparison.maxChannelDifference > 1) throw Error(category + ' adds light to flat water: ' + JSON.stringify(comparison));
          checks.push({ category, time, ...comparison });
        }
        return { fixture: 'Uniform RGB(16,32,40) at native 1672x941', allowedRoundingDifference: 1, checks };
      } finally { window.field.dispose(); fixture.width = 0; fixture.height = 0; }
    });
    const nonblackBoundary = await page.evaluate(async () => {
      const canvas = document.querySelector('#art');
      window.field = window.createArtworkField(canvas, { master: window.master, boundary: window.nonblack });
      window.size(1440, 810, 1);
      window.frame({ entrance: 0 });
      const first = await window.pixels();
      const initial = window.compare(first, await window.expected(window.nonblack, 1440, 810));
      window.frame({ time: 12, entrance: 0.65, category: 'fibers', pointer: { x: 0.6, y: 0.2 } });
      window.frame({ time: 17, entrance: 0, category: 'granules' });
      const returned = window.compare(first, await window.pixels());
      window.field.dispose();
      if (initial.changedPixels || returned.changedPixels) throw Error(`Nonblack boundary differs: ${JSON.stringify({ initial, returned })}`);
      return { initial, returned };
    });
    if (errors.length) throw Error(errors.slice(0, 5).join('\n'));
    const report = { status: 'passed', implementationSHA256: sha256(source), browserVersion: browser.version(), playwrightVersion: version,
      renderer: 'Canvas2D artwork patches; no triangle geometry, generated particles or volumetric simulation',
      boundaryFixture: path.relative(ROOT, boundaryPath).replaceAll('\\', '/'), boundaryFixtureSHA256: sha256(fs.readFileSync(boundaryPath)),
      approvedVideoBoundaryUsed: boundaryPath === terminalPath, masterSHA256: sha256(fs.readFileSync(masterPath)), setup, reports, lifecycle,
      nonblackBoundary: { fixture: path.relative(ROOT, nonblackPath).replaceAll('\\', '/'), ...nonblackBoundary }, flatWater, errors,
      limitations: ['Same local browser runtime; cross-browser decode/color equality is not proven.',
        'Timing reports JS draw submission and the owner RAF interval, not GPU completion or a production performance guarantee.',
        'Fixed art regions are annotations and may include surrounding water; no segmentation or scientific measurement is claimed.'] };
    writeFile(QA, 'verification.json', JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify({ status: report.status, approvedVideoBoundaryUsed: report.approvedVideoBoundaryUsed,
      viewports: reports.map(value => ({ name: value.viewport, boundaryChanged: value.boundary.changedPixels, masterChanged: value.master.changedPixels,
        pointerChanged: value.pointerEffect.changedPixels, categories: Object.fromEntries(Object.entries(value.categories).map(([name, category]) =>
          [name, { maxCornerLift: category.cropEdges.maxCornerLift, highlightedPixels: category.highlightedPixels }])),
        submissionP95Ms: value.performance.submissionP95Ms })), flatWaterMaxDifference: Math.max(...flatWater.checks.map(check => check.maxChannelDifference)), lifecycle, browserErrors: errors.length }));
  } finally {
    if (oldTemp === undefined) delete process.env.TEMP; else process.env.TEMP = oldTemp;
    if (oldTmp === undefined) delete process.env.TMP; else process.env.TMP = oldTmp;
    try { if (context) await context.close(); }
    finally {
      try { if (browser) await browser.close(); }
      finally {
        await new Promise(resolve => { server.close(resolve); server.closeAllConnections(); });
        if (scratch) fs.rmSync(contained(QA, scratch), { recursive: true, force: true, maxRetries: 2 });
      }
    }
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
