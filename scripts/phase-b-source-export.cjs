/* eslint-disable @typescript-eslint/no-require-imports -- Local original-source QA export. */
'use strict';

const fs = require('node:fs');
const sharp = require('sharp');
const { recoveredSource, replaceOnce, inputFile, qaPath, writeQA, sha256, withScenePage } =
  require('../docs/qa/phase-b/source-recovery/offline-tools.cjs');

const probe = `
    window.disposeSourceScene = () => {
      const resources = new Set();
      scene.traverse(object => {
        if (object.geometry) resources.add(object.geometry);
        for (const material of (Array.isArray(object.material) ? object.material : object.material ? [object.material] : [])) {
          resources.add(material);
          for (const value of Object.values(material)) if (value?.isTexture) resources.add(value);
        }
      });
      resources.forEach(resource => resource.dispose());
      renderer.dispose(); renderer.forceContextLoss();
    };
    window.exportFullTerminal = () => {
      window.setCameraTime(1); scene.updateMatrixWorld(true); camera.updateMatrixWorld(true);
      const geometry = (object) => {
        const result = [];
        object.traverse((child) => {
          if (!child.geometry) return;
          const g = child.geometry;
          result.push({ uuid: g.uuid, objectUuid: child.uuid, type: g.type,
            matrixWorld: child.matrixWorld.toArray(),
            index: g.index ? Array.from(g.index.array) : null,
            attributes: Object.fromEntries(Object.entries(g.attributes).map(([key, a]) =>
              [key, { itemSize: a.itemSize, normalized: a.normalized, array: Array.from(a.array) }])),
            curve: g.parameters?.path?.toJSON() ?? null,
            radius: g.parameters?.radius ?? null,
            tubularSegments: g.parameters?.tubularSegments ?? null,
            radialSegments: g.parameters?.radialSegments ?? null });
        }); return result;
      };
      const t = 4;
      return {
        metadata: { renderer: 'Three.js WebGLRenderer', revision: THREE.REVISION,
          sourceSceneTimeSeconds: t,
          sourceVideoFrame: 119, sourceVideoPTS: 119/30, combinedVideoFrame: 257,
          combinedVideoPTS: 257/30, randomSeed: null,
          deterministic: 'Fixed coordinates and trigonometric motion; runtime UUIDs are normalized in this export',
          coordinateBasis: 'right-handed; +X right, +Y up; camera looks local -Z',
          distanceUnits: 'scene units (no physical calibration)',
          velocityUnits: 'scene units per source-scene second',
          angularVelocityUnits: 'XYZ Euler radians per source-scene second',
          sourceSceneSecondsPerVideoSecond: 120/119,
          uvOrigin: 'geometry UV bottom-left; screen projection top-left',
          depthOfField: 'none; no depth-of-field postprocessing', textures: [],
          handoffProof: false,
          sourceEncoding: 'Recovered Python captures JPEG quality 0.95, then H.264 yuv420p CRF 17; this export is pre-encode PNG',
          terminalCameraAngularVelocity: null,
          angularVelocityCaveat: 'Camera orientation changes with lookAt; no decoded-video angular velocity or live handoff has been measured' },
        renderer: { width, height, pixelRatio: renderer.getPixelRatio(),
          toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure,
          outputColorSpace: renderer.outputColorSpace,
          contextAttributes: renderer.getContext().getContextAttributes(),
          shadowMapEnabled: renderer.shadowMap.enabled },
        camera: { ...camera.toJSON(), position: camera.position.toArray(),
          quaternion: camera.quaternion.toArray(), up: camera.up.toArray(),
          matrixWorld: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray(),
          near: camera.near, far: camera.far, aspect: camera.aspect, fov: camera.fov,
          terminalLinearVelocity: [0.0024*Math.cos(t*0.8),-0.0018*Math.sin(t*0.9),0] },
        scene: scene.toJSON(),
        particles: particles.map((p, i) => ({ id: i,
          type: i < 6 ? 'fragment' : i < 11 ? 'fiber' : 'granule',
          objectUuid: p.obj.uuid, target: p.targetPos.toArray(), position: p.obj.position.toArray(),
          quaternion: p.obj.quaternion.toArray(), rotation: p.obj.rotation.toArray(),
          scale: p.obj.scale.toArray(), baseRotation: p.baseRot.toArray(),
          driftDirection: p.driftDir.toArray(), impulseDistance: p.driftDist,
          terminalLinearVelocity: [0.0028*Math.cos(t*0.7+p.targetPos.x),-0.0018*Math.sin(t*0.6+p.targetPos.y),0],
          terminalEulerRate: p.rotSpeed.clone().multiplyScalar(0.4).toArray(),
          geometry: geometry(p.obj) })),
        motes: motes.map((m,i) => ({ objectUuid: m.mesh.uuid, position: m.mesh.position.toArray(),
          terminalLinearVelocity: [0.004*Math.cos(t*0.5+i),-0.0024*Math.sin(t*0.4+i),0],
          geometry: geometry(m.mesh) }))
      };
    };
`;

function normalizeUUIDs(value) {
  const ids = new Map();
  return JSON.parse(JSON.stringify(value, (_key, item) => {
    if (typeof item === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(item)) {
      if (!ids.has(item)) ids.set(item, `source-id-${String(ids.size).padStart(4, '0')}`);
      return ids.get(item);
    }
    return item;
  }));
}

async function main(args = process.argv.slice(2)) {
  if (args.length > 1 || args.some(arg => arg !== '--help')) throw Error('Usage: node scripts/phase-b-source-export.cjs [--help]');
  if (args.includes('--help')) { console.log('Export the pinned original scene into source-recovery/original-export using installed local tools.'); return; }
  const original = recoveredSource();
  const marker = '    // Initialize at tau = 0 (exact black)';
  const html = replaceOnce(original.text, marker, `${probe}\n${marker}`);
  for (const file of ['terminal-state-full.json', 'terminal.png', 'verification.json']) qaPath(`original-export/${file}`);
  await withScenePage(html, false, async ({ page, browserVersion, browserExecutable, playwrightVersion, moduleSHA256, assertHealthy }) => {
    const state = normalizeUUIDs(await page.evaluate(() => window.exportFullTerminal()));
    const canvasPNG = async () => Buffer.from(await page.evaluate(() => document.querySelector('canvas').toDataURL('image/png').split(',')[1]), 'base64');
    const first = await canvasPNG();
    await page.evaluate(() => { window.setCameraTime(0); window.setCameraTime(1); });
    const repeated = await canvasPNG();
    const rawFirst = await sharp(first).ensureAlpha().raw().toBuffer();
    const rawRepeated = await sharp(repeated).ensureAlpha().raw().toBuffer();
    if (!rawFirst.equals(rawRepeated)) throw Error('Original terminal pixels changed after seeking to black and back');
    if (state.particles.length !== 17 || state.motes.length !== 9) throw Error('Unexpected recovered particle count');
    state.metadata.originalHtmlSHA256 = original.rawSHA256;
    state.metadata.normalizedOriginalSHA256 = original.normalizedSHA256;
    state.metadata.recoveredPythonSHA256 = sha256(fs.readFileSync(inputFile('docs/qa/phase-b/source-recovery/render-continuation-original.py')));
    state.metadata.browserVersion = browserVersion;
    state.metadata.browserExecutable = browserExecutable;
    state.metadata.playwrightVersion = playwrightVersion;
    state.metadata.moduleSHA256 = moduleSHA256;
    const serialized = JSON.stringify(state, null, 2) + '\n';
    const verification = { source: 'recovered original', sceneTimeSeconds: 4,
      browserVersion, browserExecutable, playwrightVersion, moduleSHA256, particles: 17, motes: 9,
      geometryStateSHA256: sha256(serialized), pngSHA256: sha256(first), rgbaSHA256: sha256(rawFirst),
      deterministicAfterSeek: true, handoffProof: false, capture: 'canvas PNG, fixed 1920x1080, DPR 1, forced sRGB browser profile' };
    assertHealthy();
    writeQA('original-export/terminal.png', first);
    writeQA('original-export/terminal-state-full.json', serialized);
    writeQA('original-export/verification.json', JSON.stringify(verification, null, 2) + '\n');
    console.log(JSON.stringify(verification));
  });
}

module.exports = { normalizeUUIDs };
if (require.main === module) main().catch(error => { console.error(error.message); process.exitCode = 1; });
