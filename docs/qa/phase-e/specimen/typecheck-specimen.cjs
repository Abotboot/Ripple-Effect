/* eslint-disable @typescript-eslint/no-require-imports -- Scoped no-emit TypeScript check. */
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const sourceFiles = ['src/components/atmosphere/specimen-inspector.tsx', 'src/components/atmosphere/bottle-scene.ts']
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.')
const program = ts.createProgram(sourceFiles, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = ts.getPreEmitDiagnostics(program)
const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCanonicalFileName: name => name, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n' })
const report = { createdAt: new Date().toISOString(), sourceFiles, noEmit: true, diagnostics: diagnostics.length, success: diagnostics.length === 0 }
fs.writeFileSync(path.join(__dirname, 'typecheck-results.json'), JSON.stringify(report, null, 2))
console.log(formatted || JSON.stringify(report, null, 2))
if (diagnostics.length) process.exitCode = 1
