import assert from 'node:assert/strict'
import snapshot from '../../src/data/epa-ucmr5.json'
import { getOfficialMonitoring, withOfficialIdentity, directoryMatchesForPwsid } from '../../src/lib/epa-data'
import { officialAssessment, officialResultStatus, officialResultText, officialContaminants } from '../../src/lib/official-monitoring'
import { buildWaterReportCardViewModel } from '../../src/lib/water-report-card'
import type { UtilityWithStats } from '../../src/lib/types'

const keys = new Set<string>()
let results = 0, above = 0, utilitiesAbove = 0, nonDetects = 0
for (const utility of snapshot.utilities) {
  const identity = { pwsid: utility.directoryPwsid, name: utility.directoryName, state: utility.state }
  const report = getOfficialMonitoring(identity)!
  assert.ok(report)
  const assessment = officialAssessment(report)
  assert.equal(assessment.status, 'assessed')
  assert.equal(assessment.legalCompared, report.records.length)
  assert.deepEqual(getOfficialMonitoring(withOfficialIdentity(identity)), report)
  assert.equal(getOfficialMonitoring({ ...identity, name: 'Different water supplier' }), null)
  assert.equal(getOfficialMonitoring({ ...identity, state: 'XX' }), null)
  for (const row of report.records) {
    assert.ok(!keys.has(row.recordId)); keys.add(row.recordId)
    assert.ok(utility.systems.some(s => s.pwsid === row.pwsid))
    assert.ok(row.date >= '2023-01-01' && row.date <= '2025-12-31')
    assert.ok(row.sampleId && row.facilityId && row.samplePointId && row.method)
    if (row.qualifier === '<') {
      nonDetects++
      assert.equal(row.value, null)
      assert.equal(officialResultText(row), '<4 ppt')
      assert.equal(officialResultStatus(row), 'not_above')
    }
  }
  results += report.records.length
  above += assessment.legalAbove ?? 0
  if (assessment.legalAbove) utilitiesAbove++
}
assert.equal(results, 1052); assert.equal(above, 59); assert.equal(utilitiesAbove, 8)
const chicago = snapshot.utilities.find(u => u.city === 'Chicago')!
const chicagoReport = getOfficialMonitoring({ pwsid: chicago.directoryPwsid, name: chicago.directoryName, state: 'IL' })!
assert.equal(withOfficialIdentity({ pwsid: chicago.directoryPwsid, name: chicago.directoryName, state: 'IL' }).pwsid, 'IL0316000')
assert.equal(directoryMatchesForPwsid('IL0316000')[0].pwsid, 'IL0316040')
const row = chicagoReport.records[0]
assert.equal(officialResultStatus({ ...row, qualifier: '=', value: 0.004 }), 'not_above')
assert.equal(officialResultStatus({ ...row, qualifier: '=', value: 0.0041 }), 'above')
assert.equal(officialResultStatus({ ...row, reportingLimit: 0.005 }), 'unknown')
assert.equal(officialResultStatus({ ...row, unit: 'mg/L' }), 'unknown')
assert.equal(officialResultStatus({ ...row, qualifier: '=', value: null }), 'unknown')
assert.equal(officialResultStatus({ ...row, qualifier: '=', value: -1 }), 'unknown')
assert.equal(officialResultStatus({ ...row, contaminant: 'Microplastics' }), 'unknown')
assert.equal(officialContaminants(chicagoReport)[0].maximum, '<4 ppt')
const share = buildWaterReportCardViewModel({ name: chicago.directoryName, city: 'Chicago', state: 'IL', officialMonitoring: chicagoReport } as UtilityWithStats)
assert.equal(share.legalStatusText, '0 above / 16 compared')
assert.ok(share.shareText.includes('not compliance findings'))
assert.ok(!share.shareText.includes('safe'))
console.log(JSON.stringify({ passed: true, utilities: snapshot.utilities.length, results, nonDetects, above, utilitiesAbove }))
