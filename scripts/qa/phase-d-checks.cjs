/* eslint-disable @typescript-eslint/no-require-imports -- Offline fixture/type/build checks. */
'use strict'
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync, execFileSync } = require('node:child_process')
const root = path.resolve(__dirname, '../..')
const out = path.join(root, 'docs/qa/phase-d/checks')
const baseline = 'be0f622eece788684de60c9e5de17be010363e0f'
fs.mkdirSync(out, { recursive: true })
const changed = [...new Set([
  ...execFileSync('git', ['diff', '--name-only', baseline], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/),
  ...execFileSync('git', ['ls-files', '--others', '--exclude-standard'], { cwd: root, encoding: 'utf8' }).trim().split(/\r?\n/),
])].filter(file => /\.(?:ts|tsx|cjs|mjs)$/.test(file) && !file.startsWith('local-') && fs.existsSync(path.join(root, file)))
const checks = [
  ['legacy-data-contracts', ['docs/qa/phase-d/data/check.cjs']],
  ['provenance', ['scripts/qa/run-regression.cjs', 'provenance']],
  ['public-read-safety', ['scripts/qa/run-regression.cjs', 'read-path']],
  ['unit-and-report-regressions', ['scripts/qa/run-regression.cjs', 'remaining']],
  ['preserved-artwork', ['--test', 'scripts/qa/phase-b-assets.mjs']],
  ['new-microscope-delivery', ['scripts/qa/phase-d-microscope.cjs']],
  ['typescript', ['node_modules/typescript/bin/tsc', '--noEmit', '--incremental', 'false']],
  ['scoped-lint', ['node_modules/eslint/bin/eslint.js', ...changed]],
  ['production-build', ['node_modules/next/dist/bin/next', 'build']],
]
const report = { createdAt: new Date().toISOString(), baseline, checks: [], success: false }
const save = () => fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify(report, null, 2) + '\n')
for (const [name, args] of checks) {
  console.log('RUN', name)
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 240000, maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, SEED_DEMO_DATA: 'false', DATABASE_URL: 'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1', DIRECT_URL: 'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1' } })
  const text = `${result.stdout || ''}${result.stderr || ''}${result.error?.message || ''}`.replaceAll(root, '<repo>').replaceAll(root.replaceAll('\\', '/'), '<repo>').replace(/[ \t]+$/gm, '').trimEnd()
  fs.writeFileSync(path.join(out, `${name}.txt`), text ? text + '\n' : '')
  const passed = result.status === 0 && !result.error
  report.checks.push({ name, command: ['node', ...args], passed, exitCode: result.status }); save()
  console.log(passed ? 'PASS' : 'FAIL', name)
  if (!passed) { console.log(text.slice(-3500)); process.exitCode = 1 }
}
report.success = report.checks.every(check => check.passed)
report.completedAt = new Date().toISOString(); save()
