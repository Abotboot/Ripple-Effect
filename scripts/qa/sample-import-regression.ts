import assert from 'node:assert/strict'
import { sampleImportFields } from '../../src/lib/sample-import'
import { buildContaminantSummary } from '../../src/lib/aggregate'
import { summaryPresentation } from '../../src/lib/assessment-presentation'
import { fixtureContaminant, fixtureSample } from './fixtures'

const input = { level: '12', unit: 'ppb', sampleDate: '2024-01-01', source: 'Fixture laboratory', sourceUrl: 'https://example.org/report', sourceRecordId: 'fixture-only', reportingPeriod: '2024', method: 'Fixture method', provenance: 'LAB_REPORTED', verificationStatus: 'VERIFIED' }
const imported = sampleImportFields(input)
assert.equal(imported.sourceUrl, input.sourceUrl)
assert.equal(imported.sourceRecordId, input.sourceRecordId)
assert.equal(imported.method, input.method)
const summary = buildContaminantSummary(fixtureContaminant(), [fixtureSample(imported)])
assert.equal(summaryPresentation(summary).legal.status, 'above_benchmark')
assert.equal(summaryPresentation(summary).health.status, 'above_benchmark')
const lower = buildContaminantSummary(fixtureContaminant(), [fixtureSample(sampleImportFields({ ...input, level: 1 }))])
assert.equal(summaryPresentation(lower).legal.status, 'below_benchmark')
const unreviewed = sampleImportFields({ ...input, provenance: undefined, verificationStatus: undefined, quality: 'verified', source: 'EPA UCMR' })
assert.equal(unreviewed.verificationStatus, 'UNREVIEWED')
assert.equal(summaryPresentation(buildContaminantSummary(fixtureContaminant(), [fixtureSample(unreviewed)])).legal.status, 'unreviewed')
for (const invalid of [{ sourceUrl: '' }, { provenance: 'ILLUSTRATIVE' }, { provenance: 'CITIZEN_CONTRIBUTED' }, { unit: '' }, { level: '' }, { level: ' ' }, { level: false }, { level: -1 }, { level: Infinity }, { sampleDate: 'invalid' }, { sourceUrl: 'javascript:alert(1)' }]) assert.throws(() => sampleImportFields({ ...input, ...invalid }))
console.log('PASS: imported evidence retained; compatible verified readings compare correctly; missing evidence, unsafe URLs, and invalid measurements rejected; source labels do not promote records. No database writes.')
