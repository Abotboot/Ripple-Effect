import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'
const source = readFileSync('src/components/atmosphere/specimen-particles.ts', 'utf8')
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ES2022 } }).outputText
const { spawnParticle, spawnPool, stepParticle } = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`)
const options = { width: 800, height: 600, cx: -1000, cy: -1000, cursorSpeed: 0, time: 0 }
const p = spawnParticle(800, 600)
const original = structuredClone(p)
stepParticle(p, { ...options, delta: 0 })
assert.deepEqual(p, original, 'zero delta must not advance particle simulation')
const pool = spawnPool(180, 800, 600)
for (let frame = 0; frame < 2000; frame++) for (const item of pool) stepParticle(item, { ...options, time: frame * 16.67, delta: 1 })
assert(pool.every(item => [item.x, item.y, item.vx, item.vy].every(Number.isFinite)))
assert(pool.every(item => item.x >= -40 && item.x <= 840 && item.y >= -40 && item.y <= 640))
const far = { ...original, x: 420, y: 300, vx: 0, vy: 0 }
const near = { ...far }
stepParticle(far, { ...options, delta: 1 })
stepParticle(near, { ...options, cx: 400, cy: 300, cursorSpeed: 80, delta: 1 })
assert(near.vx > far.vx, 'cursor must repel nearby particles')
console.log('PASS: zero delta, 360000 finite bounded steps, cursor repulsion')
// Lifecycle/source guard complements the browser interaction checks.
const audio = readFileSync('src/components/atmosphere/audio-engine.ts', 'utf8')
assert(audio.includes('dispose'), 'audio must expose disposal for route unmount')
console.log('PASS: audio disposal present')
