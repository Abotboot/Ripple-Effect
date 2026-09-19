/* eslint-disable @typescript-eslint/no-require-imports -- Offline reproduction from actual exported presentation components. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createJiti } = require('jiti')
const jiti = createJiti(__filename, { alias: { '@': path.resolve('src') }, jsx: { runtime: 'automatic' }, tryNative: false })
const { buildContaminantSummary } = jiti(path.resolve('src/lib/aggregate.ts'))
const baseline = 'bfcbe4e'
const original = file => jiti.evalModule(execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8' }), { filename: path.resolve(file), forceTranspile: true })
const { buildWaterReportCardViewModel } = original('src/lib/water-report-card.ts')
const { ContaminantBarChart } = original('src/components/charts/contaminant-bar-chart.tsx')
const { fixtureContaminant, fixtureSample } = jiti(path.resolve('scripts/qa/fixtures.ts'))
const verified = { provenance: 'LAB_REPORTED', verificationStatus: 'VERIFIED', quality: 'verified', source: 'Offline test fixture' }
const contaminant = fixtureContaminant({ regulated: true })
const missing = buildContaminantSummary(contaminant, [])
const citizen = buildContaminantSummary(contaminant, [fixtureSample({ provenance: 'CITIZEN_CONTRIBUTED', verificationStatus: 'UNREVIEWED', quality: 'citizen', source: 'Citizen test fixture' })])
const converted = buildContaminantSummary(contaminant, [fixtureSample({ ...verified, level: .001, unit: 'ppm' })])
const unknown = buildContaminantSummary(fixtureContaminant({ id: 'unknown', name: 'Unknown benchmark fixture', legalLimit: null, healthGuideline: null }), [fixtureSample(verified)])
const below = buildContaminantSummary(contaminant, [fixtureSample(verified)])
const utility = { name: 'Offline example utility', city: 'Fixture', state: 'XX', population: 0, contaminantSummaries: [below, unknown] }
function chartData(element) {
  if (!element || typeof element !== 'object') return null
  if (Array.isArray(element.props?.data)) return element.props.data
  const children = [].concat(element.props?.children || [])
  for (const child of children) { const data = chartData(child); if (data) return data }
  return null
}
const rows = chartData(ContaminantBarChart({ summaries: [missing, citizen, converted, unknown] }))
assert(rows, 'Capture this script against the pre-fix comparison chart')
const vm = buildWaterReportCardViewModel(utility)
const report = {
  capturedAt: new Date().toISOString(), baseline, source: 'Offline fixtures passed through actual buildContaminantSummary and the pre-fix ContaminantBarChart/buildWaterReportCardViewModel exports read using git show. No checkout, database or network.',
  canonicalStatuses: [missing, citizen, converted, unknown].map(s => ({ name: s.contaminant.name, provenance: s.provenance, hasData: s.hasData, level: s.latestLevel, unit: s.unit, healthStatus: s.healthBenchmarkStatus, healthRatio: s.healthRatio })),
  actualChartRows: rows,
  partialReport: { legalStatus: vm.legalStatusText, legalTone: vm.legalCardTone, legalSublabel: vm.legalSublabel },
  findings: [
    'Chart maps missing latestLevel to numeric 0 and status ok.',
    'Citizen and no-benchmark rows receive default ok instead of a neutral unassessed status.',
    'Chart computes raw ppm/ppb ratio 0.0002 while canonical normalized ratio is 0.2.',
    'Chart plots raw level with a fixed x=1 Health guideline marker, not the normalized ratio.',
    'Report card uses emerald legal aggregate despite another contaminant being unassessed.',
  ],
}
fs.writeFileSync(path.join(__dirname, 'baseline-findings.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
