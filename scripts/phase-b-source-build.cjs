/* eslint-disable @typescript-eslint/no-require-imports -- Offline source transformation. */
'use strict';

const fs = require('node:fs');
const ts = require('typescript');
const { ROOT, ORIGINAL_SHA256, contained, inputFile, writeFile, replaceOnce, recoveredSource, threeFiles, sha256 } =
  require('../docs/qa/phase-b/source-recovery/offline-tools.cjs');

// Generated resources are owned as soon as construction succeeds, including during setup errors.
function trackResources(body) {
  const parsed = ts.createSourceFile('candidate.js', body, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
  if (parsed.parseDiagnostics.length) throw Error('Candidate transformation produced invalid JavaScript');
  const insertions = [];
  function visit(node) {
    if (ts.isNewExpression(node) && /^THREE\.\w*(Geometry|Material|Texture)$/.test(node.expression.getText(parsed))) {
      insertions.push([node.getStart(parsed), 'own('], [node.getEnd(), ')']);
    }
    ts.forEachChild(node, visit);
  }
  visit(parsed);
  for (const [offset, text] of insertions.sort((a, b) => b[0] - a[0])) {
    body = body.slice(0, offset) + text + body.slice(offset);
  }
  return body;
}

function buildCandidate() {
  const original = recoveredSource();
  threeFiles();
  const scripts = [...original.text.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)];
  if (scripts.length !== 1) throw Error('Expected exactly one recovered module script');
  let body = scripts[0][1];
  const edit = (before, after) => { body = replaceOnce(body, before, after); };
  edit("    import * as THREE from 'three';", '');
  edit("    const canvas = document.getElementById('c');", '');
  const handoffMarker = '    // Export particle positions for later live handoff';
  const timelineMarker = '    window.setCameraTime = function(tau)';
  // Validate both cut points before removing the old browser-global export.
  replaceOnce(body, handoffMarker, handoffMarker);
  replaceOnce(body, timelineMarker, timelineMarker);
  const handoffStart = body.indexOf(handoffMarker);
  const timelineStart = body.indexOf(timelineMarker);
  if (timelineStart <= handoffStart) throw Error('Recovered timeline markers are out of order');
  body = body.slice(0, handoffStart) + body.slice(timelineStart);
  edit('    const renderer = new THREE.WebGLRenderer({', '    renderer = new THREE.WebGLRenderer({');
  edit('    renderer.setPixelRatio(1);', '    renderer.setPixelRatio(1);\n    renderer.outputColorSpace = THREE.SRGBColorSpace;');
  edit('window.setCameraTime = function(tau) {\n      tau = Math.max(0, Math.min(1, tau));\n      const t = tau * 4.0; // 0.0s to 4.0s', `function renderAtSeconds(seconds) {
      const t = Math.max(0, seconds);
      const liveTime = Math.max(0, t - 4);
      const interactionMix = Math.min(1, liveTime / 0.5);
      const scatterMix = scatterAt === null ? 0 : Math.sin(Math.min(Math.PI, Math.max(0, t - scatterAt) * 0.8)) * 0.09;`);
  edit('    // Initialize at tau = 0 (exact black)\n    window.setCameraTime(0.0);\n    window.RENDER_READY = true;', `    let scatterAt = null;
    let pointer = null;
    let lastTime = 4;
    const baseRender = renderAtSeconds;
    return {
      renderAtSeconds(t) {
        assertActive();
        if (!Number.isFinite(t) || t < 0) throw new RangeError('Scene time must be finite and nonnegative');
        lastTime = t;
        baseRender(t);
      },
      // Fixed source raster; this is not a responsive or approved handoff renderer.
      resize() { assertActive(); renderer.setSize(width, height, false); },
      setPointer(x, y) {
        assertActive();
        if (x === null) { pointer = null; return; }
        if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 1 || Math.abs(y) > 1) {
          throw new RangeError('Pointer must contain two finite normalized coordinates in [-1, 1]');
        }
        pointer = {x, y};
      },
      scatter() { assertActive(); scatterAt = lastTime; },
      dispose
    };`);
  edit('      camera.lookAt(currentTarget);', '      camera.lookAt(currentTarget);\n      camera.updateMatrixWorld(true);');
  edit('        p.obj.position.y += pDriftY;', `        p.obj.position.y += pDriftY;
        if (liveTime > 0) {
          p.obj.position.addScaledVector(p.driftDir, scatterMix);
          if (pointer) {
            const screen = p.obj.position.clone().project(camera);
            const dx = screen.x - pointer.x, dy = screen.y - pointer.y;
            const distance = Math.hypot(dx,dy);
            const weight = Math.max(0, 1 - distance / 0.7) * 0.018 * interactionMix;
            p.obj.position.x += dx * weight; p.obj.position.y += dy * weight;
          }
        }`);
  const subdivision = `      const flat = new THREE.ShapeGeometry(shape, 12);
      const raw = flat.index ? own(flat.toNonIndexed()) : flat;
      const source = raw.getAttribute('position');
      const vertices = [], uv = [];
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      const divisions = 10;
      const point = (i,j) => a.clone().multiplyScalar(1-(i+j)/divisions)
        .addScaledVector(b,i/divisions).addScaledVector(c,j/divisions);
      const add = p => {vertices.push(p.x,p.y,p.z);uv.push(p.x+0.5,p.y+0.5);};
      for (let triangle=0; triangle<source.count; triangle+=3) {
        a.fromBufferAttribute(source,triangle); b.fromBufferAttribute(source,triangle+1); c.fromBufferAttribute(source,triangle+2);
        for(let i=0;i<divisions;i++) for(let j=0;j<divisions-i;j++) {
          add(point(i,j));add(point(i+1,j));add(point(i,j+1));
          if(i+j<divisions-1) {add(point(i+1,j));add(point(i+1,j+1));add(point(i,j+1));}
        }
      }
      const geom = new THREE.BufferGeometry();
      geom.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      geom.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
      release(raw); if(raw !== flat) release(flat);`;
  edit('      const geom = new THREE.ShapeGeometry(shape, 12);', subdivision);
  edit('new THREE.EdgesGeometry(geom, 25)', 'new THREE.EdgesGeometry(geom, 42)');
  edit("color: new THREE.Color('#589ec0')", "color: new THREE.Color('#8ab9bc')");
  edit('transmission: 0.85', 'transmission: 0.68');
  edit('transmission: 0.78', 'transmission: 0.64');
  edit('opacity: 0.75', 'opacity: 0.38');
  edit('edgeMat.opacity = 0.75', 'edgeMat.opacity = 0.38');
  edit('    // Material 2: Thin synthetic fibers', `    // Fixed seeded weathering for the disconnected offline candidate.
    const textureCanvas = canvas.ownerDocument.createElement('canvas');
    textureCanvas.width = textureCanvas.height = 256;
    const context = textureCanvas.getContext('2d');
    if (!context) throw new Error('A 2D canvas context is required for the weathering texture');
    const pixels = context.createImageData(256,256);
    let seed = 17329;
    for(let y=0;y<256;y++) for(let x=0;x<256;x++) {
      seed = (Math.imul(seed,1664525)+1013904223)>>>0;
      const noise = seed/4294967296;
      const vein = Math.pow(Math.abs(Math.sin(x*0.071 + Math.sin(y*0.063)*2.1)),18);
      const value = Math.min(255,145 + noise*65 + vein*45);
      const index = (y*256+x)*4;
      pixels.data[index]=value;pixels.data[index+1]=value;pixels.data[index+2]=value;pixels.data[index+3]=255;
    }
    context.putImageData(pixels,0,0);
    const weathering = new THREE.CanvasTexture(textureCanvas);
    // Intentional linear modulation for the shared color/bump map, not calibrated albedo.
    weathering.colorSpace = THREE.NoColorSpace;
    weathering.wrapS = weathering.wrapT = THREE.RepeatWrapping;
    for(const material of [fragmentMat,blueFragmentMat]) {
      material.map = weathering; material.bumpMap = weathering; material.bumpScale = 0.026;
      material.roughness = 0.36;
    }

    // Material 2: Thin synthetic fibers`);
  body = body.replaceAll('(Matching 01.png)', '(reference layout; master equivalence unproven)');
  body = trackResources(body);
  const javascript = `// Generated by scripts/phase-b-source-build.cjs. Edit the builder, then regenerate.
// Disconnected Phase B candidate; no decoded-video/live handoff or master match is proven.
// Recovered source SHA256 (LF): ${ORIGINAL_SHA256}
import * as THREE from 'three';

export function createContinuationScene(canvas) {
  if (!canvas || canvas.nodeName !== 'CANVAS' || !canvas.ownerDocument || typeof canvas.getContext !== 'function') {
    throw new TypeError('createContinuationScene requires an HTML canvas');
  }
  let renderer;
  let disposed = false;
  const resources = new Set();
  const own = resource => { resources.add(resource); return resource; };
  const release = resource => { if (resources.delete(resource)) resource.dispose(); };
  const assertActive = () => { if (disposed) throw new Error('Continuation scene has been disposed'); };
  function dispose() {
    if (disposed) return;
    disposed = true;
    try { for (const resource of resources) resource.dispose(); }
    finally {
      resources.clear();
      if (renderer) {
        try { renderer.dispose(); }
        finally { renderer.forceContextLoss(); renderer = undefined; }
      }
    }
  }
  try {
${body.trimEnd()}
  } catch (error) {
    dispose();
    throw error;
  }
}
`;
  const declarations = `/** Disconnected offline candidate; uses a fixed 1920 x 1080 raster at pixel ratio 1. */
export interface ContinuationScene {
  /** Absolute source-scene time. Terminal source state is 4.0, not video PTS 119/30. */
  renderAtSeconds(time: number): void;
  /** Restore the fixed source raster. Does not accept viewport dimensions. */
  resize(): void;
  setPointer(x: null): void;
  setPointer(x: number, y: number): void;
  scatter(): void;
  /** Idempotent. All other methods reject calls after disposal. */
  dispose(): void;
}
export function createContinuationScene(canvas: HTMLCanvasElement): ContinuationScene;
`;
  if (ts.createSourceFile('candidate.js', javascript, ts.ScriptTarget.Latest, false, ts.ScriptKind.JS).parseDiagnostics.length) {
    throw Error('Generated module failed syntax validation');
  }
  return { 'src/lib/continuation-scene.js': javascript, 'src/lib/continuation-scene.d.ts': declarations };
}

function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => !['--check', '--help'].includes(arg))) throw Error('Usage: node scripts/phase-b-source-build.cjs [--check|--help]');
  if (args.includes('--help')) { console.log('Regenerate the disconnected candidate, or --check its reproducibility without writes.'); return; }
  const files = buildCandidate();
  // Validate every output location before writing the first file.
  for (const filename of Object.keys(files)) contained(ROOT, filename);
  for (const [filename, contents] of Object.entries(files)) {
    if (args.includes('--check')) {
      if (fs.readFileSync(inputFile(filename), 'utf8').replace(/\r\n/g, '\n') !== contents) {
        throw Error(`${filename} is stale; rebuild the offline candidate`);
      }
    } else writeFile(ROOT, filename, contents);
  }
  console.log(JSON.stringify({ mode: args.includes('--check') ? 'check' : 'build',
    sourceSHA256: ORIGINAL_SHA256, outputSHA256: Object.fromEntries(Object.entries(files).map(([file, contents]) => [file, sha256(contents)])) }));
}

module.exports = { buildCandidate };
if (require.main === module) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
