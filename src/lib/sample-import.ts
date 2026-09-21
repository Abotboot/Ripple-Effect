import type { SampleProvenance, SampleVerification } from '@prisma/client'

/** Called only behind the administrator import boundary. Source labels never imply verification. */
export function sampleImportFields(row: Record<string, unknown>) {
  const optional = (key: string) => typeof row[key] === 'string' && row[key].trim() ? row[key].trim() : null
  const provenance = (optional('provenance') ?? 'UNKNOWN').toUpperCase() as SampleProvenance
  const verificationStatus = (optional('verificationStatus') ?? 'UNREVIEWED').toUpperCase() as SampleVerification
  if (!['UNKNOWN', 'ILLUSTRATIVE', 'CITIZEN_CONTRIBUTED', 'REGULATORY_REPORTED', 'LAB_REPORTED'].includes(provenance)) throw new Error('Invalid provenance')
  if (!['UNREVIEWED', 'VERIFIED', 'REJECTED'].includes(verificationStatus)) throw new Error('Invalid verificationStatus')
  const sourceUrl = optional('sourceUrl')
  if (sourceUrl) {
    let url: URL
    try { url = new URL(sourceUrl) } catch { throw new Error('sourceUrl must be an HTTP or HTTPS URL') }
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('sourceUrl must be an HTTP or HTTPS URL without credentials')
  }
  const level = typeof row.level === 'number' ? row.level : typeof row.level === 'string' && row.level.trim() ? Number(row.level) : NaN
  if (!Number.isFinite(level) || level < 0) throw new Error('level must be a finite nonnegative measurement')
  const unit = optional('unit')
  if (!unit) throw new Error('unit is required; measurement units cannot be inferred')
  const sampleDate = new Date(String(row.sampleDate ?? ''))
  if (!Number.isFinite(sampleDate.getTime())) throw new Error('A valid sampleDate is required')
  if (verificationStatus === 'VERIFIED' && (!['REGULATORY_REPORTED', 'LAB_REPORTED'].includes(provenance) || !sourceUrl)) {
    throw new Error('Verified imports require regulatory/laboratory provenance and a traceable sourceUrl')
  }
  const verifiedAt = verificationStatus === 'VERIFIED' ? new Date(String(row.verifiedAt || new Date().toISOString())) : null
  if (verifiedAt && !Number.isFinite(verifiedAt.getTime())) throw new Error('Invalid verifiedAt')
  return {
    level, unit, sampleDate, provenance, verificationStatus, sourceUrl, verifiedAt,
    source: optional('source') ?? 'Unknown',
    quality: provenance === 'ILLUSTRATIVE' ? 'illustrative' : verificationStatus === 'VERIFIED' ? 'verified' : optional('quality') ?? 'unreviewed',
    sourceRecordId: optional('sourceRecordId'), reportingPeriod: optional('reportingPeriod'), method: optional('method'),
  }
}
