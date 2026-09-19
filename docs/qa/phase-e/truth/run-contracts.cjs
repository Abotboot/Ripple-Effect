/* eslint-disable @typescript-eslint/no-require-imports -- Existing offline safety suites, with evidence written only in Phase E. */
const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { createJiti } = require('jiti')

if (process.argv[2] === 'legacy') {
  const original = path.resolve('docs/qa/phase-d/data/check.cjs')
  const jiti = createJiti(__filename, { tryNative: false, fsCache: false })
  // The identical existing fixture code resolves the same repository root.
  // Its __dirname is changed only so verification.json cannot overwrite Phase D.
  jiti.evalModule(fs.readFileSync(original, 'utf8'), { filename: path.join(__dirname, 'legacy-data-contracts.cjs'), forceTranspile: true })
} else {
  const report = { createdAt: new Date().toISOString(), checks: [], success: false }
  const checks = [
    ['legacy-read-contracts', [__filename, 'legacy']],
    ['provenance', ['scripts/qa/run-regression.cjs', 'provenance']],
    ['read-path', ['scripts/qa/run-regression.cjs', 'read-path']],
    ['unit-report', ['scripts/qa/run-regression.cjs', 'remaining']],
  ]
  for (const [name, args] of checks) {
    const result = spawnSync(process.execPath, args, { encoding: 'utf8', timeout: 60000, windowsHide: true, maxBuffer: 8 * 1024 * 1024,
      env: { ...process.env, SEED_DEMO_DATA: 'false', DATABASE_URL: 'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1', DIRECT_URL: 'postgresql://qa:qa@127.0.0.1:1/ripple_qa?connect_timeout=1' } })
    fs.writeFileSync(path.join(__dirname, `${name}.txt`), `${result.stdout || ''}${result.stderr || ''}${result.error?.message || ''}`)
    const passed = result.status === 0 && !result.error
    report.checks.push({ name, passed, exitCode: result.status }); console.log(passed ? 'PASS' : 'FAIL', name)
    if (!passed) console.log(`${result.stdout || ''}${result.stderr || ''}`.slice(-3000))
  }
  report.success = report.checks.every(check => check.passed)
  report.completedAt = new Date().toISOString()
  fs.writeFileSync(path.join(__dirname, 'contract-results.json'), JSON.stringify(report, null, 2))
  if (!report.success) process.exitCode = 1
}
