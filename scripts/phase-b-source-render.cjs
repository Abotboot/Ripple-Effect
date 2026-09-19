/* eslint-disable @typescript-eslint/no-require-imports -- Node-only offline rendering utility. */
'use strict';

const fs = require('node:fs');
const sharp = require('sharp');
const { inputFile, qaPath, writeQA, sha256, withScenePage } =
  require('../docs/qa/phase-b/source-recovery/offline-tools.cjs');
const { buildCandidate } = require('./phase-b-source-build.cjs');

const html = `<!doctype html><html><head><meta charset="utf-8">
<style>*{margin:0}canvas{display:block;width:1920px;height:1080px}</style>
<script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js"}}</script></head>
<body><canvas id="c"></canvas><script type="module">
import {createContinuationScene} from '/src/lib/continuation-scene.js';
window.createSourceScene = () => createContinuationScene(document.querySelector('canvas'));
window.scene = window.createSourceScene();
window.disposeSourceScene = () => window.scene.dispose();
window.scene.renderAtSeconds(4);
window.RENDER_READY = true;
</script></body></html>`;

async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => !['--still', '--help'].includes(arg))) {
    throw Error('Usage: node scripts/phase-b-source-render.cjs [--still|--help]. Only bounded still QA is supported.');
  }
  if (args.includes('--help')) { console.log('Verify a bounded terminal still under source-recovery/candidate-still. No video rendering or production writes.'); return; }
  for (const [file, expected] of Object.entries(buildCandidate())) {
    if (fs.readFileSync(inputFile(file), 'utf8').replace(/\r\n/g, '\n') !== expected) throw Error('Candidate is stale; run phase-b-source-build.cjs first');
  }
  for (const file of ['terminal.png', 'verification.json']) qaPath(`candidate-still/${file}`);
  await withScenePage(html, true, async ({ page, browserVersion, browserExecutable, playwrightVersion, moduleSHA256, assertHealthy }) => {
    const capture = async () => Buffer.from(await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png').split(',')[1]), 'base64');
    const first = await capture();
    const firstRaw = await sharp(first).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    if (firstRaw.info.width !== 1920 || firstRaw.info.height !== 1080) throw Error('Incorrect source raster');
    let hasVisiblePixel = false;
    for (let i = 0; i < firstRaw.data.length; i += 4) if (firstRaw.data[i] || firstRaw.data[i + 1] || firstRaw.data[i + 2]) { hasVisiblePixel = true; break; }
    if (!hasVisiblePixel) throw Error('Terminal render is unexpectedly black');
    const samples = [{ label: 'initial t=4', rgbaSHA256: sha256(firstRaw.data) }];
    async function compareTerminal(label) {
      const raw = await sharp(await capture()).ensureAlpha().raw().toBuffer();
      const identical = raw.equals(firstRaw.data);
      samples.push({ label, rgbaSHA256: sha256(raw), identical });
      if (!identical) throw Error(`Terminal pixels are not deterministic: ${label}`);
    }
    await page.evaluate(() => window.scene.renderAtSeconds(4));
    await compareTerminal('repeated t=4');
    const black = Buffer.from(await page.evaluate(() => {
      window.scene.renderAtSeconds(0);
      return document.querySelector('canvas').toDataURL('image/png').split(',')[1];
    }), 'base64');
    const blackPixels = await sharp(black).ensureAlpha().raw().toBuffer();
    for (let i = 0; i < blackPixels.length; i += 4) {
      if (blackPixels[i] || blackPixels[i + 1] || blackPixels[i + 2] || blackPixels[i + 3] !== 255) throw Error('Source t=0 is not opaque optical black');
    }
    await page.evaluate(() => { window.scene.setPointer(0.5, 0); window.scene.scatter(); window.scene.renderAtSeconds(4); });
    await compareTerminal('seek from black, pointer and scatter at terminal');
    const lifecycle = await page.evaluate(() => {
      const rejected = action => { try { action(); return false; } catch { return true; } };
      const result = {
        invalidTimesRejected: [NaN, Infinity, -1].every(time => rejected(() => window.scene.renderAtSeconds(time))),
        invalidPointersRejected: [[0, undefined], [NaN, 0], [0, Infinity], [2, 0]].every(([x, y]) => rejected(() => window.scene.setPointer(x, y)))
      };
      window.scene.dispose();
      window.scene.dispose();
      result.doubleDisposeSafe = true;
      result.postDisposeRejected = [() => window.scene.renderAtSeconds(4), () => window.scene.resize(),
        () => window.scene.setPointer(null), () => window.scene.scatter()].every(rejected);
      // Reuse the same browser but a fresh canvas/context; no retained scene may affect the result.
      const canvas = document.querySelector('canvas');
      canvas.replaceWith(canvas.ownerDocument.createElement('canvas'));
      window.scene = window.createSourceScene();
      window.scene.renderAtSeconds(4);
      return result;
    });
    if (Object.values(lifecycle).some(value => value !== true)) throw Error('Candidate lifecycle validation failed');
    await compareTerminal('fresh scene and canvas t=4');
    const gpu = await page.evaluate(() => {
      const gl = document.querySelector('canvas').getContext('webgl2');
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      return { version: gl.getParameter(gl.VERSION), shadingLanguage: gl.getParameter(gl.SHADING_LANGUAGE_VERSION),
        vendor: extension ? gl.getParameter(extension.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
        contextAttributes: gl.getContextAttributes() };
    });
    const verification = { source: 'disconnected deterministic candidate', sceneTimeSeconds: 4,
      browserVersion, browserExecutable, playwrightVersion, moduleSHA256, gpu,
      capture: 'canvas PNG, fixed 1920x1080, DPR 1, forced sRGB browser profile', weatheringSeed: 17329,
      terminalRenders: 4, blackRenders: 1, pngSHA256: sha256(first), samples,
      opaqueBlackAtZero: true, lifecycle, handoffProof: false,
      limitations: ['Same installed runtime only; cross-GPU equality unproven', 'No video encoded or decoded-video/live comparison',
        'Subdivided flakes still have faceted normals; master material match unproven'] };
    assertHealthy();
    writeQA('candidate-still/terminal.png', first);
    writeQA('candidate-still/verification.json', JSON.stringify(verification, null, 2) + '\n');
    console.log(JSON.stringify({ source: verification.source, terminalRenders: verification.terminalRenders,
      samples, lifecycle, handoffProof: false, output: 'docs/qa/phase-b/source-recovery/candidate-still' }));
  });
}

if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
