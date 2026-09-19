/* eslint-disable @typescript-eslint/no-require-imports -- Scoped compiler check, no emitted build files. */
const ts = require('typescript')
const fs = require('node:fs')
const path = require('node:path')
const sourceFiles = [
  'src/components/atmosphere/specimen-inspector.tsx',
  'src/components/atmosphere/bottle-scene.ts',
  'src/components/atmosphere/specimen-fallback.ts',
]
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
if (config.error) throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, '\n'))
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.')
const program = ts.createProgram(sourceFiles, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = [...parsed.errors, ...ts.getPreEmitDiagnostics(program)]
const formatted = ts.formatDiagnosticsWithColorAndContext(diagnostics, {
  getCanonicalFileName: file => file, getCurrentDirectory: () => process.cwd(), getNewLine: () => '\n',
})
const result = { createdAt: new Date().toISOString(), sourceFiles, noEmit: true, diagnostics: diagnostics.length, success: diagnostics.length === 0 }
fs.writeFileSync(path.join(__dirname, 'typecheck-results.json'), JSON.stringify(result, null, 2))
if (formatted) console.error(formatted)
console.log(JSON.stringify(result, null, 2))
process.exitCode = diagnostics.length ? 1 : 0
