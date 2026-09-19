/* eslint-disable @typescript-eslint/no-require-imports -- Offline Node validation runner. */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')

const root = path.resolve(__dirname, '../..')
const output = path.join(root, 'docs/qa/phase-b/checks')
fs.mkdirSync(output, { recursive: true })
const args = new Set(process.argv.slice(2))
const checks = args.has('--build-only') ? [] : [
  ['asset-integrity', ['--test', 'scripts/qa/phase-b-assets.mjs']],
  ['poster-match', ['scripts/qa/phase-b-poster-match.cjs']],
  ['provenance', ['scripts/qa/run-regression.cjs', 'provenance']],
  ['read-path', ['scripts/qa/run-regression.cjs', 'read-path']],
  ['remaining-regressions', ['scripts/qa/run-regression.cjs', 'remaining']],
  ['source-tool-regressions', ['--test', 'docs/qa/phase-b/source-recovery/source-tools.test.cjs']],
  ['source-regeneration', ['scripts/phase-b-source-build.cjs', '--check']],
  ['typecheck', ['node_modules/typescript/bin/tsc', '--noEmit']],
  ['scoped-lint', ['node_modules/eslint/bin/eslint.js',
    'src/app/motion-study',
    'src/components/atmosphere/cinematic-intro.tsx',
    'src/components/atmosphere/hero-particle-stage.tsx',
    'src/components/atmosphere/tank-hero.tsx',
    'src/components/atmosphere/water-narrative.tsx',
    'src/components/sections/particle-atlas.tsx',
    'src/lib/ripple-assets.ts',
    'src/lib/continuation-scene.js',
    'src/lib/continuation-scene.d.ts',
    'scripts/phase-b-source-build.cjs',
    'scripts/phase-b-source-export.cjs',
    'scripts/phase-b-source-render.cjs',
    'docs/qa/phase-b/source-recovery/*.cjs',
    'scripts/qa/phase-b-assets.mjs',
    'scripts/qa/phase-b-poster-match.cjs',
    'scripts/qa/phase-b-lint-baseline.cjs',
    'scripts/qa/phase-b-browser.cjs',
    'scripts/qa/phase-b-zoom.cjs',
    'scripts/qa/run-regression.cjs',
    'scripts/qa/phase-b-checks.cjs']],
]
if (args.has('--full-lint')) checks.push(['full-repository-lint', ['node_modules/eslint/bin/eslint.js', '.'], false])
if (args.has('--build') || args.has('--build-only')) checks.push(['production-build', ['node_modules/next/dist/bin/next', 'build']])

const report = {
  createdAt: new Date().toISOString(),
  node: process.version,
  platform: process.platform,
  checks: [],
}
const reportPath = path.join(output, args.has('--build-only') ? 'build-results.json' : 'results.json')
for (const [name, command, blocking = true] of checks) {
  console.log(`RUN ${name}`)
  const started = Date.now()
  // Never connect a validation build to a real database, even if local .env files exist.
  const unavailableDatabase = 'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1'
  const result = spawnSync(process.execPath, command, {
    cwd: root,
    encoding: 'utf8',
    timeout: name === 'production-build' ? 240000 : 120000,
    maxBuffer: 16 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, SEED_DEMO_DATA: 'false', DATABASE_URL: unavailableDatabase, DIRECT_URL: unavailableDatabase },
  })
  const rawText = `${result.stdout || ''}${result.stderr || ''}${result.error ? '\n' + result.error.message : ''}`
  const text = rawText.replaceAll(root, '<repo>').replaceAll(root.replaceAll('\\', '/'), '<repo>')
  fs.writeFileSync(path.join(output, `${name}.txt`), text)
  const passed = result.status === 0 && !result.error
  report.checks.push({ name, command: ['node', ...command], blocking, passed, exitCode: result.status, durationMs: Date.now() - started, output: `${name}.txt` })
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n')
  console.log(`${passed ? 'PASS' : 'FAIL'} ${name}${!blocking ? ' (informational)' : ''}`)
  if (!passed) console.log(text.slice(-5000))
  if (!passed && blocking) process.exitCode = 1
}
console.log(path.relative(root, reportPath))
