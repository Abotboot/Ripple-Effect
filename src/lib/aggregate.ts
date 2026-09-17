import type { Contaminant, Sample } from '@prisma/client'
import {
  normalizeProvenance,
  normalizeVerification,
  isEligibleForScoring,
  isIllustrative,
  getBenchmarkStatus,
  normalizeToBenchmarkUnit,
  type BenchmarkStatus,
} from './provenance'

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
  healthBenchmarkStatus: BenchmarkStatus
  legalBenchmarkStatus: BenchmarkStatus
  healthRatio: number | null
  legalRatio: number | null
  trend: Array<{
    date: string
    level: number
    unit?: string
    treatmentStatus: string
    provenance?: string
    verificationStatus?: string
    quality?: string
  }>
}

export function buildContaminantSummary(
  contaminant: Contaminant,
  samples: Sample[]
): ContaminantSummaryT {
  // Sort by date ascending
  const sorted = [...samples].sort(
    (a, b) => new Date(a.sampleDate).getTime() - new Date(b.sampleDate).getTime()
  )

  // Use treated samples for "official" latest/avg/max when available
  const treated = sorted.filter((s) => s.treatmentStatus === 'Treated')
  const basePool = treated.length > 0 ? treated : sorted

  // Separate cohorts so illustrative benchmarks never taint reviewed cohort calculations:
  const verifiedCohort = basePool.filter((s) => isEligibleForScoring(s))
  const unreviewedCohort = basePool.filter((s) => !isEligibleForScoring(s) && !isIllustrative(s))
  const illustrativeCohort = basePool.filter((s) => isIllustrative(s))

  // Select active cohort: verified wins, then unreviewed, then illustrative
  const pool = verifiedCohort.length > 0
    ? verifiedCohort
    : unreviewedCohort.length > 0
    ? unreviewedCohort
    : illustrativeCohort.length > 0
    ? illustrativeCohort
    : basePool

  const latest = pool[pool.length - 1]
  const hasData = pool.length > 0 && latest != null
  const latestLevel = hasData ? latest.level : null
  const latestDate = hasData ? latest.sampleDate.toISOString() : null

  // Ensure unit consistency: never average across different units
  const unit = latest?.unit ?? contaminant.legalLimitUnit ?? contaminant.healthGuidelineUnit ?? 'ppb'
  const compatiblePool = pool.filter((s) => (s.unit || '').toLowerCase() === unit.toLowerCase())

  const avgLevel = compatiblePool.length > 0
    ? compatiblePool.reduce((sum, s) => sum + s.level, 0) / compatiblePool.length
    : latestLevel
  const maxLevel = compatiblePool.length > 0
    ? Math.max(...compatiblePool.map((s) => s.level))
    : latestLevel

  const provenance = latest ? normalizeProvenance(latest) : 'UNKNOWN'
  const verificationStatus = latest ? normalizeVerification(latest) : 'UNREVIEWED'
  const sampleIsIllustrative = isIllustrative(latest || {})
  const sampleIsVerified = isEligibleForScoring(latest || {})

  const hg = contaminant.healthGuideline
  const ll = contaminant.legalLimit

  const healthBenchmarkStatus = getBenchmarkStatus({
    level: latestLevel,
    unit,
    benchmark: hg,
    benchmarkUnit: contaminant.healthGuidelineUnit,
    provenance,
    verificationStatus,
    quality: latest?.quality,
    source: latest?.source,
  })

  const legalBenchmarkStatus = getBenchmarkStatus({
    level: latestLevel,
    unit,
    benchmark: ll,
    benchmarkUnit: contaminant.legalLimitUnit,
    provenance,
    verificationStatus,
    quality: latest?.quality,
    source: latest?.source,
  })

  const exceedsHealthGuideline = healthBenchmarkStatus === 'above_benchmark'
  const exceedsLegalLimit = legalBenchmarkStatus === 'above_benchmark'

  // Informational ratios: computed ONLY when eligible for scoring and units are compatible
  const healthRatio =
    (healthBenchmarkStatus === 'above_benchmark' || healthBenchmarkStatus === 'below_benchmark') &&
    hg != null &&
    hg > 0 &&
    latestLevel != null
      ? (normalizeToBenchmarkUnit(latestLevel, unit, contaminant.healthGuidelineUnit || unit) ?? latestLevel) / hg
      : null

  const legalRatio =
    (legalBenchmarkStatus === 'above_benchmark' || legalBenchmarkStatus === 'below_benchmark') &&
    ll != null &&
    ll > 0 &&
    latestLevel != null
      ? (normalizeToBenchmarkUnit(latestLevel, unit, contaminant.legalLimitUnit || unit) ?? latestLevel) / ll
      : null

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
    sampleCount: compatiblePool.length,
    hasData,
    isIllustrative: sampleIsIllustrative,
    isVerified: sampleIsVerified,
    exceedsHealthGuideline,
    exceedsLegalLimit,
    healthBenchmarkStatus,
    legalBenchmarkStatus,
    healthRatio,
    legalRatio,
    trend: compatiblePool.map((s) => ({
      date: s.sampleDate.toISOString(),
      level: s.level,
      unit: s.unit,
      treatmentStatus: s.treatmentStatus,
      provenance: normalizeProvenance(s),
      verificationStatus: normalizeVerification(s),
      quality: s.quality,
    })),
  }
}
