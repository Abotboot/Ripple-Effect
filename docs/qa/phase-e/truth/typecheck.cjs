/* eslint-disable @typescript-eslint/no-require-imports -- Scoped no-emit TypeScript verification. */
const fs = require('node:fs')
const path = require('node:path')
const ts = require('typescript')
const sourceFiles = [
  'src/lib/assessment-presentation.ts', 'src/lib/water-report-card.ts',
  'src/components/sections/utility-detail-dialog.tsx', 'src/components/charts/contaminant-bar-chart.tsx',
  'src/components/charts/contaminant-trend-chart.tsx', 'src/components/d3/contaminant-spectrum-chart.tsx',
]
const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile)
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.')
const program = ts.createProgram(sourceFiles, { ...parsed.options, noEmit: true, incremental: false })
const diagnostics = ts.getPreEmitDiagnostics(program)
const text = ts.formatDiagnosticsWithColorAndContext(diagnostics, { getCurrentDirectory: () => process.cwd(), getCanonicalFileName: name => name, getNewLine: () => '\n' })
const report = { createdAt: new Date().toISOString(), sourceFiles, diagnostics: diagnostics.length, success: diagnostics.length === 0 }
fs.writeFileSync(path.join(__dirname, 'typecheck-results.json'), JSON.stringify(report, null, 2))
fs.writeFileSync(path.join(__dirname, 'typecheck.txt'), text)
console.log(text || JSON.stringify(report, null, 2))
if (diagnostics.length) process.exitCode = 1
