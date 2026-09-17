/**
 * Shared data provenance and verification rules for A Ripple Effect Initiative.
 *
 * Ensures simulated or unreviewed demonstration data is never presented as
 * verified institutional compliance records or used to grade municipalities.
 */

export type SampleProvenance =
  | 'UNKNOWN'
  | 'ILLUSTRATIVE'
  | 'CITIZEN_CONTRIBUTED'
  | 'REGULATORY_REPORTED'
  | 'LAB_REPORTED'

export type SampleVerification =
  | 'UNREVIEWED'
  | 'VERIFIED'
  | 'REJECTED'

export interface ProvenanceMetadata {
  provenance: SampleProvenance
  verificationStatus: SampleVerification
  sourceUrl?: string | null
  sourceRecordId?: string | null
  reportingPeriod?: string | null
  method?: string | null
  verifiedAt?: string | Date | null
}

/**
 * Normalizes provenance from raw record fields.
 * If provenance is missing, falls back conservatively to UNKNOWN, NOT regulatory.
 */
export function normalizeProvenance(record: {
  provenance?: string | null
  source?: string | null
  quality?: string | null
}): SampleProvenance {
  if (record.provenance) {
    const p = record.provenance.toUpperCase()
    if (['UNKNOWN', 'ILLUSTRATIVE', 'CITIZEN_CONTRIBUTED', 'REGULATORY_REPORTED', 'LAB_REPORTED'].includes(p)) {
      return p as SampleProvenance
    }
  }
  const src = (record.source ?? '').toLowerCase()
  const q = (record.quality ?? '').toLowerCase()
  if (src.includes('illustrative') || src.includes('demo') || q === 'illustrative') {
    return 'ILLUSTRATIVE'
  }
  if (src.includes('citizen') || q === 'citizen') {
    return 'CITIZEN_CONTRIBUTED'
  }
  return 'UNKNOWN'
}

/**
 * Normalizes verification status from raw record fields.
 * Missing metadata is UNREVIEWED, never VERIFIED.
 */
export function normalizeVerification(record: {
  verificationStatus?: string | null
  quality?: string | null
}): SampleVerification {
  if (record.verificationStatus) {
    const v = record.verificationStatus.toUpperCase()
    if (['UNREVIEWED', 'VERIFIED', 'REJECTED'].includes(v)) {
      return v as SampleVerification
    }
  }
  return 'UNREVIEWED'
}

/**
 * A sample is eligible for municipal safety grading ONLY if it has been verified
 * and originates from an authorized regulatory or certified laboratory source.
 * Demonstrations, synthetic models, and unreviewed citizen tests are ineligible.
 */
export function isEligibleForScoring(record: {
  provenance?: string | null
  verificationStatus?: string | null
  source?: string | null
  quality?: string | null
}): boolean {
  const p = normalizeProvenance(record)
  const v = normalizeVerification(record)
  return v === 'VERIFIED' && (p === 'REGULATORY_REPORTED' || p === 'LAB_REPORTED')
}

export function isIllustrative(record: {
  provenance?: string | null
  source?: string | null
  quality?: string | null
}): boolean {
  const p = normalizeProvenance(record)
  return p === 'ILLUSTRATIVE'
}
