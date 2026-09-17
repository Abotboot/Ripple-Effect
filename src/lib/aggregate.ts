// Server-side helper that aggregates raw Sample rows into ContaminantSummary objects.
import type { Contaminant, Sample } from '@prisma/client'
import { normalizeProvenance, normalizeVerification, isEligibleForScoring } from './provenance'

export type ContaminantSummaryT = {
  contaminant: Contaminant
  latestLevel: number | null
  latestDate: string | null
  avgLevel: number | null
  maxLevel: number | null
  unit: string
  source: string
  robot: boolean
  quality: string
  provenance: string
  verificationStatus: string
  sampleCount: number
  hasData: boolean
  isIllustrative: boolean
  isVerified: boolean
  exceedsHealthGuideline: boolean
  exceedsLegalLimit: boolean
  healthRatio: number | null
  legalRatio: number | null
  trend: Array<{ date: string; level: number; treatmentStatus: string; provenance?: string; quality?: string }>
}

export function buildContaminantSummary(
  contaminant: Contaminant,
  samples: Sample[]
): ContaminantSummaryT {
  // Sort by date ascending
  const sorted = [...samples].sort(
    (a, b) => new Date(a.sampleDate).getTime() - new Date(b.sampleDate).getTime()
  )

  // Use treated samples for "official" latest/avg/max when available,
  // otherwise fall back to all samples.
  const treated = sorted.filter((s) => s.treatmentStatus === 'Treated')
  const pool = treated.length > 0 ? treated : sorted

  const latest = pool[pool.length - 1]
  const hasData = pool.length > 0 && latest != null
  const latestLevel = hasData ? latest.level : null
  const latestDate = hasData ? latest.sampleDate.toISOString() : null
  const avgLevel = hasData
    ? pool.reduce((sum, s) => sum + s.level, 0) / pool.length
    : null
  const maxLevel = hasData ? Math.max(...pool.map((s) => s.level)) : null
  const unit = latest?.unit ?? contaminant.legalLimitUnit ?? contaminant.healthGuidelineUnit ?? 'ppb'

  const provenance = latest ? normalizeProvenance(latest) : 'UNKNOWN'
  const verificationStatus = latest ? normalizeVerification(latest) : 'UNREVIEWED'
  const isIllustrative = provenance === 'ILLUSTRATIVE'
  const isVerified = verificationStatus === 'VERIFIED'

  const hg = contaminant.healthGuideline
  const ll = contaminant.legalLimit

  // Unit compatibility check: never compare incompatible units (e.g. particles/L vs ppb)
  const hgUnitMatches = !contaminant.healthGuidelineUnit || contaminant.healthGuidelineUnit.toLowerCase() === unit.toLowerCase()
  const llUnitMatches = !contaminant.legalLimitUnit || contaminant.legalLimitUnit.toLowerCase() === unit.toLowerCase()

  // Synthetic or unverified demonstration data must never be flagged as a confirmed violation
  const eligibleForViolation = hasData && !isIllustrative && isEligibleForScoring(latest!)

  const exceedsHealthGuideline =
    eligibleForViolation && hg != null && hg > 0 && hgUnitMatches && latestLevel != null
      ? latestLevel > hg
      : false
  const exceedsLegalLimit =
    eligibleForViolation && ll != null && ll > 0 && llUnitMatches && latestLevel != null
      ? latestLevel > ll
      : false

  // Informational ratios: computed only when units match and benchmarks exist
  const healthRatio =
    latestLevel != null && hg != null && hg > 0 && hgUnitMatches ? latestLevel / hg : null
  const legalRatio =
    latestLevel != null && ll != null && ll > 0 && llUnitMatches ? latestLevel / ll : null

  return {
    contaminant,
    latestLevel,
    latestDate,
    avgLevel,
    maxLevel,
    unit,
    source: latest?.source ?? 'Unknown',
    robot: latest?.robot ?? false,
    quality: latest?.quality ?? 'unreviewed',
    provenance,
    verificationStatus,
    sampleCount: sorted.length,
    hasData,
    isIllustrative,
    isVerified,
    exceedsHealthGuideline,
    exceedsLegalLimit,
    healthRatio,
    legalRatio,
    trend: sorted.map((s) => ({
      date: s.sampleDate.toISOString(),
      level: s.level,
      treatmentStatus: s.treatmentStatus,
      provenance: normalizeProvenance(s),
      quality: s.quality,
    })),
  }
}
