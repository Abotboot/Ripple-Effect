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

export type BenchmarkStatus =
  | 'no_data'
  | 'unreviewed'
  | 'illustrative'
  | 'no_benchmark'
  | 'incompatible_units'
  | 'below_benchmark'
  | 'above_benchmark'

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
  if (src.includes('illustrative') || src.includes('demo') || src.includes('synthetic') || q === 'illustrative') {
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

/**
 * Canonicalizes a unit string for dimensional analysis:
 * - normalizes Unicode micro ('µ', 'μ') -> 'u'
 * - strips whitespace, lowercases
 * - maps volume shorthands (e.g. /liter -> /l)
 */
export function canonicalizeUnit(unit?: string | null): string {
  if (!unit) return ''
  return unit
    .trim()
    .toLowerCase()
    .replace(/[\u00b5\u03bc]/g, 'u')
    .replace(/\s+/g, '')
    .replace(/\/liter$/i, '/l')
    .replace(/\/litre$/i, '/l')
}

// Mass concentration scale factors relative to ppb = 1.0
// Assumes standard dilute aqueous convention: 1 L water = 1 kg
// 1 ppm = 1 mg/L = 1000 ppb = 1000 ug/L = 1,000,000 ppt = 1,000,000 ng/L
const MASS_CONCENTRATION_FACTORS: Record<string, number> = {
  'ppt': 0.001,
  'ng/l': 0.001,
  'ppb': 1.0,
  'ug/l': 1.0,
  'ppm': 1000.0,
  'mg/l': 1000.0,
}

const PARTICLE_UNITS = new Set([
  'particles/l',
  'particles/liter',
  'fibers/l',
  'fibers/liter',
])

export function areUnitsCompatible(sampleUnit?: string | null, benchmarkUnit?: string | null): boolean {
  if (!sampleUnit || !benchmarkUnit) return false
  const s = canonicalizeUnit(sampleUnit)
  const b = canonicalizeUnit(benchmarkUnit)
  if (!s || !b) return false
  if (s === b) return true
  const sIsMass = s in MASS_CONCENTRATION_FACTORS
  const bIsMass = b in MASS_CONCENTRATION_FACTORS
  if (sIsMass && bIsMass) return true
  const sIsParticle = PARTICLE_UNITS.has(s) || s.includes('particle') || s.includes('fiber')
  const bIsParticle = PARTICLE_UNITS.has(b) || b.includes('particle') || b.includes('fiber')
  if (sIsParticle && bIsParticle) {
    if (s.includes('fiber') && !b.includes('fiber')) return false
    if (!s.includes('fiber') && b.includes('fiber')) return false
    return true
  }
  return false
}

export function normalizeToBenchmarkUnit(level: number, sampleUnit: string, benchmarkUnit: string): number | null {
  if (level == null || isNaN(level) || !isFinite(level)) return null
  if (!sampleUnit || !benchmarkUnit) return null
  const s = canonicalizeUnit(sampleUnit)
  const b = canonicalizeUnit(benchmarkUnit)
  if (!s || !b) return null
  if (s === b) return level

  const sFactor = MASS_CONCENTRATION_FACTORS[s]
  const bFactor = MASS_CONCENTRATION_FACTORS[b]
  if (sFactor != null && bFactor != null) {
    const converted = level * (sFactor / bFactor)
    return Number(converted.toPrecision(12)) / 1
  }

  if (areUnitsCompatible(sampleUnit, benchmarkUnit)) {
    return level
  }

  return null
}

export function getBenchmarkStatus(params: {
  level: number | null | undefined
  unit?: string | null
  benchmark: number | null | undefined
  benchmarkUnit?: string | null
  provenance?: string | null
  verificationStatus?: string | null
  quality?: string | null
  source?: string | null
}): BenchmarkStatus {
  const { level, unit, benchmark, benchmarkUnit } = params
  if (level == null || isNaN(level) || !isFinite(level)) return 'no_data'
  if (isIllustrative(params)) return 'illustrative'
  if (!isEligibleForScoring(params)) return 'unreviewed'
  if (benchmark == null || isNaN(benchmark) || !isFinite(benchmark) || benchmark <= 0) return 'no_benchmark'
  if (!unit || !benchmarkUnit || !areUnitsCompatible(unit, benchmarkUnit)) return 'incompatible_units'
  const normalized = normalizeToBenchmarkUnit(level, unit, benchmarkUnit)
  if (normalized == null) return 'incompatible_units'
  return normalized > benchmark ? 'above_benchmark' : 'below_benchmark'
}

export interface ProvenancePresentation {
  badgeLabel: string
  badgeVariant: 'verified' | 'unreviewed' | 'illustrative' | 'citizen' | 'provisional'
  description: string
  isVerified: boolean
  isIllustrative: boolean
  isCitizen: boolean
  historicalSourceLabel: string
}

export function getProvenancePresentation(record: {
  provenance?: string | null
  verificationStatus?: string | null
  source?: string | null
  quality?: string | null
}): ProvenancePresentation {
  const p = normalizeProvenance(record)
  const v = normalizeVerification(record)

  if (p === 'ILLUSTRATIVE') {
    return {
      badgeLabel: 'Illustrative',
      badgeVariant: 'illustrative',
      description: 'Synthetic demonstration benchmark. Not an authentic compliance measurement.',
      isVerified: false,
      isIllustrative: true,
      isCitizen: false,
      historicalSourceLabel: record.source || 'Synthetic demo data',
    }
  }

  if (v === 'REJECTED') {
    return {
      badgeLabel: 'Rejected',
      badgeVariant: 'unreviewed',
      description: 'Sample record rejected during verification review.',
      isVerified: false,
      isIllustrative: false,
      isCitizen: false,
      historicalSourceLabel: record.source || 'Rejected Record',
    }
  }

  // Only true verified institutional records get the verified badge
  if (v === 'VERIFIED' && (p === 'REGULATORY_REPORTED' || p === 'LAB_REPORTED')) {
    return {
      badgeLabel: 'Verified',
      badgeVariant: 'verified',
      description: 'Lab or regulatory verified record with traceable institutional source.',
      isVerified: true,
      isIllustrative: false,
      isCitizen: false,
      historicalSourceLabel: record.source || 'Verified Laboratory',
    }
  }

  if (p === 'CITIZEN_CONTRIBUTED' || record.quality === 'citizen') {
    return {
      badgeLabel: 'Citizen science',
      badgeVariant: 'citizen',
      description: 'Community-submitted field test. Unreviewed for official compliance.',
      isVerified: false,
      isIllustrative: false,
      isCitizen: true,
      historicalSourceLabel: record.source || 'Citizen Submission',
    }
  }

  return {
    badgeLabel: 'Unreviewed',
    badgeVariant: 'unreviewed',
    description: 'Legacy or unreviewed data record. Not verified for regulatory compliance.',
    isVerified: false,
    isIllustrative: false,
    isCitizen: false,
    historicalSourceLabel: record.source || 'Unknown',
  }
}

