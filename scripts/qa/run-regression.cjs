/* eslint-disable @typescript-eslint/no-require-imports -- Isolated Node QA entrypoint. */
'use strict'

// Run one existing fixture-only suite per process. No package install or DB connection.
// The CJS suites must be transformed too: native Node TS loading does not resolve
// this application's extensionless imports and @/ aliases.
const fs = require('node:fs')
const path = require('node:path')
const { createJiti } = require('jiti')

const suites = {
  provenance: 'provenance-regression.ts',
  'read-path': 'read-path-safety.cjs',
  remaining: 'remaining-regressions.cjs',
}
const suite = suites[process.argv[2]]
if (!suite) {
  console.error('Usage: node scripts/qa/run-regression.cjs provenance|read-path|remaining')
  process.exitCode = 2
} else {
  const root = path.resolve(__dirname, '../..')
  const filename = path.join(__dirname, suite)
  const jiti = createJiti(__filename, {
    alias: { '@': path.join(root, 'src') },
    tryNative: false,
    fsCache: path.join(root, 'node_modules/.cache/jiti'),
  })
  try {
    jiti.evalModule(fs.readFileSync(filename, 'utf8'), {
      filename,
      forceTranspile: true,
    })
  } catch (error) {
    console.error(error)
    process.exitCode = 1
  }
}
