import type { SampleAssessment } from './types'

export type OfficialResult = {
  recordId: string
  pwsid: string
  contaminant: string
  date: string
  value: number | null
  qualifier: string
  reportingLimit: number
  unit: string
  facilityId: string
  facilityName: string
  samplePointId: string
  sampleId: string
  method: string
}

export type OfficialMonitoring = {
  sourceUrl: string
  downloadUrl: string
  benchmarkUrl: string
  release: string
  systems: { pwsid: string; name: string }[]
  records: OfficialResult[]
}

/** UCMR concentration screening, not a compliance determination or a safety score. */
export function officialResultStatus(row: OfficialResult): 'above' | 'not_above' | 'unknown' {
  if (!['PFOA', 'PFOS'].includes(row.contaminant) || row.unit !== 'µg/L') return 'unknown'
  if (row.qualifier === '<' && row.value === null && row.reportingLimit > 0 && row.reportingLimit <= 0.004) return 'not_above'
  if (row.qualifier !== '=' || row.value == null || !Number.isFinite(row.value) || row.value < 0) return 'unknown'
  return row.value > 0.004 ? 'above' : 'not_above'
}

export function officialResultText(row: OfficialResult): string {
  const value = row.qualifier === '<' ? row.reportingLimit : row.value
  if (value == null || !Number.isFinite(value)) return 'Result unavailable'
  return `${row.qualifier === '<' ? '<' : ''}${Number((value * 1000).toPrecision(8))} ppt`
}

export function officialAssessment(report: OfficialMonitoring): SampleAssessment {
  const compared = report.records.filter(row => officialResultStatus(row) !== 'unknown')
  return {
    status: compared.length ? 'assessed' : 'not_assessed',
    sampleCount: report.records.length, eligibleSampleCount: report.records.length,
    healthCompared: 0, healthAbove: null, legalCompared: compared.length,
    legalAbove: compared.length ? compared.filter(row => officialResultStatus(row) === 'above').length : null,
  }
}

export function officialContaminants(report: OfficialMonitoring) {
  return ['PFOA', 'PFOS'].map(name => {
    const rows = report.records.filter(row => row.contaminant === name)
    const detected = rows.filter(row => row.qualifier === '=' && row.value != null)
    const highest = detected.reduce<OfficialResult | undefined>((best, row) => !best || row.value! > best.value! ? row : best, undefined)
    const nondetectLimits = rows.filter(row => row.qualifier === '<').map(row => row.reportingLimit)
    const maximum = highest ? officialResultText(highest) : nondetectLimits.length
      ? `<${Number((Math.max(...nondetectLimits) * 1000).toPrecision(8))} ppt` : 'No result'
    return { name, count: rows.length, detected: detected.length, maximum,
      above: rows.filter(row => officialResultStatus(row) === 'above').length,
      compared: rows.filter(row => officialResultStatus(row) !== 'unknown').length }
  })
}
