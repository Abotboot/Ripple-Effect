/* eslint-disable @typescript-eslint/no-require-imports -- Read-only ESLint/baseline comparison. */
'use strict'

const fs = require('node:fs')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const { ESLint } = require('eslint')
const manifest = require('../../src/lib/ripple-asset-manifest.json')

async function main() {
  const root = path.resolve(__dirname, '../..')
  const output = path.join(root, 'docs/qa/phase-b/checks')
  fs.mkdirSync(output, { recursive: true })
  const eslint = new ESLint({ cwd: root })
  const results = await eslint.lintFiles(['.'])
  const diagnostics = results.filter(result => result.errorCount || result.warningCount)
  const reviewedCommit = manifest.reviewedRepositoryCommit
  const normalize = text => text.replace(/\r\n/g, '\n')
  const files = diagnostics.map(result => {
    const file = path.relative(root, result.filePath).replaceAll('\\', '/')
    const baseline = spawnSync('git', ['show', `${reviewedCommit}:${file}`], { cwd: root, encoding: 'utf8', windowsHide: true, maxBuffer: 4 * 1024 * 1024 })
    const unchangedFromReviewedCommit = baseline.status === 0 && normalize(baseline.stdout) === normalize(fs.readFileSync(result.filePath, 'utf8'))
    return { file, errors: result.errorCount, warnings: result.warningCount, unchangedFromReviewedCommit, rules: [...new Set(result.messages.map(message => message.ruleId))] }
  })
  const report = {
    createdAt: new Date().toISOString(),
    reviewedCommit,
    errors: results.reduce((total, result) => total + result.errorCount, 0),
    warnings: results.reduce((total, result) => total + result.warningCount, 0),
    allDiagnosticsInUnchangedFiles: files.every(file => file.unchangedFromReviewedCommit),
    files,
  }
  fs.writeFileSync(path.join(output, 'lint-baseline.json'), JSON.stringify(report, null, 2) + '\n')
  console.log(JSON.stringify(report, null, 2))
  if (!report.allDiagnosticsInUnchangedFiles) process.exitCode = 1
}
main().catch(error => { console.error(error); process.exitCode = 1 })
