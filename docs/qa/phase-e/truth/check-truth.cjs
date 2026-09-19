/* eslint-disable @typescript-eslint/no-require-imports -- Offline fixtures exercise actual UI and shared presentation exports. */
const fs = require('node:fs')
const path = require('node:path')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const { createJiti } = require('jiti')
const React = require('react')
const { renderToStaticMarkup } = require('react-dom/server')
const jiti = createJiti(__filename, { alias: { '@': path.resolve('src') }, jsx: { runtime: 'automatic' }, tryNative: false, fsCache: false })
const { fixtureContaminant, fixtureSample } = jiti(path.resolve('scripts/qa/fixtures.ts'))
const { buildContaminantSummary } = jiti(path.resolve('src/lib/aggregate.ts'))
const { computeSafetyScore } = jiti(path.resolve('src/lib/safety-score.ts'))
const { comparisonFor, summaryPresentation, utilityComparisons, hasPublishedScore } = jiti(path.resolve('src/lib/assessment-presentation.ts'))
const { buildWaterReportCardViewModel } = jiti(path.resolve('src/lib/water-report-card.ts'))
const { ContaminantBarChart } = jiti(path.resolve('src/components/charts/contaminant-bar-chart.tsx'))
const { ContaminantDetailCard, SafetyScoreCard } = jiti(path.resolve('src/components/sections/utility-detail-dialog.tsx'))
const { buildTrendRows, ContaminantTrendChart } = jiti(path.resolve('src/components/charts/contaminant-trend-chart.tsx'))
const { assessmentKind, unavailableAssessment } = jiti(path.resolve('src/lib/sample-read-model.ts'))
const { getProvenancePresentation } = jiti(path.resolve('src/lib/provenance.ts'))
const report = { createdAt: new Date().toISOString(), mode: 'Offline synthetic fixtures; no database, network or browser', checks: [], failures: [], success: false }
const fixed = new Date('2024-01-01T00:00:00Z')
const reviewed = { provenance: 'LAB_REPORTED', verificationStatus: 'VERIFIED', quality: 'verified', source: 'Offline fixture laboratory' }
const citizen = { provenance: 'CITIZEN_CONTRIBUTED', verificationStatus: 'UNREVIEWED', quality: 'citizen', source: 'Offline citizen fixture' }
const c = fixtureContaminant({ regulated: true })
const summary = (contaminant = c, sample = fixtureSample(reviewed)) => buildContaminantSummary(contaminant, [sample])
const utility = rows => ({ id: 'truth-fixture', pwsid: 'QA-ONLY', name: 'Offline truth fixture', city: 'Fixture', state: 'XX', population: 0, contaminantSummaries: rows, totalSamples: rows.length, exceedances: 0, healthExceedances: 0 })
const markup = (component, props) => renderToStaticMarkup(React.createElement(component, props))
function test(name, work) {
  try { const details = work() || {}; report.checks.push({ name, passed: true, ...details }); console.log('PASS', name) }
  catch (error) { report.failures.push({ name, error: error.stack }); console.error('FAIL', name, error.message) }
}

test('missing level remains unmeasured in helper, table, detail and report', () => {
  const missing = buildContaminantSummary(c, [])
  assert.equal(comparisonFor(missing, 'health').status, 'no_data')
  assert.equal(comparisonFor(missing, 'health').ratio, null)
  const table = markup(ContaminantBarChart, { summaries: [missing] })
  const card = markup(ContaminantDetailCard, { summary: missing })
  assert.match(table, /data-status="no_data"/)
  assert.match(table, /Not measured/)
  assert.match(card, /No measurement recorded/)
  assert.doesNotMatch(table, /data-status="below_benchmark"|text-emerald|status="ok"/)
  assert.equal(buildWaterReportCardViewModel(utility([missing])).legalStatusText, 'Not Assessed')
  return { tableStatus: 'no_data', reportStatus: 'Not Assessed' }
})

test('citizen fields cannot create a verdict even with stale verified flags and ratios', () => {
  const observation = { ...summary(c, fixtureSample({ ...citizen, level: 999 })), isVerified: true, legalBenchmarkStatus: 'above_benchmark', healthBenchmarkStatus: 'below_benchmark', healthRatio: .1, legalRatio: 999, exceedsLegalLimit: true }
  const result = summaryPresentation(observation)
  assert.equal(result.tone, 'neutral'); assert.equal(result.health.ratio, null); assert.equal(result.legal.ratio, null)
  assert.match(result.label, /Citizen reading/)
  const table = markup(ContaminantBarChart, { summaries: [observation] })
  const card = markup(ContaminantDetailCard, { summary: observation })
  assert.doesNotMatch(table, /Below health guideline|Above legal limit|× benchmark/)
  assert.doesNotMatch(card, /% of guideline|× higher/)
  assert.equal(buildWaterReportCardViewModel(utility([observation])).hasAssessedVerifiedData, false)
})

test('unknown PFAS benchmark remains unavailable without a regulation claim', () => {
  const unknown = summary(fixtureContaminant({ name: 'PFAS fixture', slug: 'pfas-fixture', regulated: true, healthGuideline: null, legalLimit: null }))
  const result = summaryPresentation(unknown)
  assert.equal(result.health.status, 'no_benchmark'); assert.equal(result.legal.status, 'no_benchmark')
  const card = markup(ContaminantDetailCard, { summary: unknown })
  assert.match(card, /No legal benchmark supplied/)
  assert.doesNotMatch(card, /Not regulated|Unregulated|Above legal|Below legal/)
  const vm = buildWaterReportCardViewModel(utility([unknown]))
  assert.equal(vm.legalCardTone, 'neutral'); assert.equal(vm.keyFindings[0].statusText, 'NO BENCHMARK AVAILABLE')
})

test('unit normalization uses the same canonical ratio in both comparison views', () => {
  const converted = summary(c, fixtureSample({ ...reviewed, level: .001, unit: 'ppm' }))
  assert.equal(comparisonFor(converted, 'health').ratio, .2)
  assert.equal(comparisonFor(converted, 'legal').ratio, .1)
  const table = markup(ContaminantBarChart, { summaries: [converted] })
  assert.match(table, /0.2× benchmark/); assert.doesNotMatch(table, /0.0002×/)
  return { healthRatio: .2, legalRatio: .1 }
})

test('incompatible and unknown units never establish a comparison', () => {
  for (const unit of ['particles/l', 'unknown-unit']) {
    const item = summary(c, fixtureSample({ ...reviewed, unit }))
    assert.equal(comparisonFor(item, 'health').status, 'incompatible_units')
    assert.equal(comparisonFor(item, 'legal').ratio, null)
    assert.equal(buildWaterReportCardViewModel(utility([item])).keyFindings[0].statusText, 'UNIT MISMATCH')
  }
})

test('zero is preserved as a real observation while negative and non-finite values are missing', () => {
  const zero = summary(c, fixtureSample({ ...reviewed, level: 0 }))
  assert.equal(comparisonFor(zero, 'health').ratio, 0)
  assert.equal(summaryPresentation(zero).hasData, true)
  for (const value of [-1, NaN, Infinity, null, undefined]) {
    const invalid = { ...zero, latestLevel: value }
    assert.equal(summaryPresentation(invalid).hasData, false)
    assert.equal(comparisonFor(invalid, 'health').ratio, null)
  }
})

test('partial coverage stays neutral and preserves independent subset counts', () => {
  const known = summary()
  const unknown = summary(fixtureContaminant({ id: 'unknown', healthGuideline: null, legalLimit: null }))
  const vm = buildWaterReportCardViewModel(utility([known, unknown]))
  assert.equal(vm.legalStatusText, '0 above / 1 assessed'); assert.equal(vm.legalSublabel, '1 not assessed')
  assert.equal(vm.legalCardTone, 'neutral'); assert.equal(vm.healthCardTone, 'neutral')
  assert.deepEqual(utilityComparisons([known, unknown]), { healthCompared: 1, legalCompared: 1, healthAbove: 0, legalAbove: 0 })
  assert(vm.keyFindings.every(finding => finding.dotColor === '#94a3b8'))
})

test('reviewed exceedances are retained but stale booleans cannot reverse numeric evidence', () => {
  const high = summary(c, fixtureSample({ ...reviewed, level: 20 }))
  const low = { ...summary(), exceedsLegalLimit: true, legalBenchmarkStatus: 'above_benchmark' }
  const vm = buildWaterReportCardViewModel(utility([high, low]))
  assert.equal(vm.legalStatusText, '1 above / 2 assessed')
  assert.equal(vm.keyFindings[0].statusText, 'EXCEEDS LEGAL LIMIT')
  assert.equal(summaryPresentation(low).legal.status, 'below_benchmark')
  assert.equal(summaryPresentation(low).tone, 'neutral')
})

test('missing, suppressed, NaN and out-of-range scores have an explicit neutral card', () => {
  const base = computeSafetyScore({ legalExceedances: 0, healthExceedances: 0, totalContaminants: 10, totalSamples: 100, verifiedSamples: 100, citizenSamples: 0, provisionalSamples: 0 })
  assert.equal(base.score, null)
  const cases = [undefined, base, { ...base, score: 100 }, ...[NaN, Infinity, -1, 101, undefined].map(score => ({ ...base, status: 'scored', score }))]
  for (const score of cases) {
    assert.equal(hasPublishedScore(score), false)
    const card = markup(SafetyScoreCard, { score })
    assert.match(card, /Safety score not assessed/)
    assert.doesNotMatch(card, /Grade|100 \(Excellent\)|0 \(Critical\)|NaN/)
  }
})

test('trend normalization retains gaps and excludes unknown units or provenance', () => {
  const points = [
    { date: fixed.toISOString(), level: .001, unit: 'ppm', treatmentStatus: 'Treated', ...reviewed },
    { date: '2024-02-01', level: 2, unit: '', treatmentStatus: 'Treated', ...reviewed },
    { date: '2024-03-01', level: 999, unit: 'ppb', treatmentStatus: 'Treated', ...citizen },
    { date: '2024-04-01', level: 3, unit: 'ppb', treatmentStatus: 'Treated', ...reviewed },
  ]
  const result = buildTrendRows(points, 'ppb', true)
  assert.deepEqual(result.rows.map(row => row.Treated), [1, null, null, 3])
  assert.equal(result.excluded, 2)
  const unreviewed = markup(ContaminantTrendChart, { data: points.filter(p => p.provenance === 'CITIZEN_CONTRIBUTED'), unit: 'ppb', healthGuideline: 5, legalLimit: 10, reviewed: false })
  assert.match(unreviewed, /Unreviewed observations/)
})

test('map unknown assessment and historical badges remain conservative', () => {
  assert.equal(assessmentKind(undefined), 'unavailable')
  assert.equal(assessmentKind(unavailableAssessment()), 'unavailable')
  assert.equal(assessmentKind({ status: 'not_assessed', sampleCount: 20, eligibleSampleCount: 0, healthCompared: 0, legalCompared: 0, healthAbove: null, legalAbove: null }), 'not_assessed')
  assert.equal(getProvenancePresentation({ quality: 'verified', source: 'EPA UCMR' }).isVerified, false)
  assert.equal(getProvenancePresentation({ ...citizen, verificationStatus: 'VERIFIED' }).isVerified, false)
})

test('D3 demonstration labels never present fiction or missing model limits as safety evidence', () => {
  const source = fs.readFileSync('src/components/d3/contaminant-spectrum-chart.tsx', 'utf8')
  assert.doesNotMatch(source, /Safe Scientific Baseline|Known biological risk|0 Federal Legal Limit|real measurement|: 'Safe'/)
  assert.match(source, /Not a water assessment/)
  assert.match(source, /No legal benchmark supplied/)
})

report.success = report.failures.length === 0
report.completedAt = new Date().toISOString()
report.sourceHashes = ['src/lib/assessment-presentation.ts', 'src/lib/water-report-card.ts', 'src/components/sections/utility-detail-dialog.tsx', 'src/components/charts/contaminant-bar-chart.tsx', 'src/components/charts/contaminant-trend-chart.tsx', 'src/components/d3/contaminant-spectrum-chart.tsx'].map(file => ({ file, sha256: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex') }))
fs.writeFileSync(path.join(__dirname, 'results.json'), JSON.stringify(report, null, 2))
if (!report.success) process.exitCode = 1
