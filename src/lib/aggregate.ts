// Server-side helper that aggregates raw Sample rows into ContaminantSummary objects.
import type { Contaminant, Sample } from '@prisma/client'

export type ContaminantSummaryT = {
  contaminant: Contaminant
  latestLevel: number
  latestDate: string
  avgLevel: number
  maxLevel: number
  unit: string
  exceedsHealthGuideline: boolean
  exceedsLegalLimit: boolean
  healthRatio: number | null
  legalRatio: number | null
  trend: Array<{ date: string; level: number; treatmentStatus: string }>
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
  const latestLevel = latest?.level ?? 0
  const latestDate = latest?.sampleDate.toISOString() ?? new Date().toISOString()
  const avgLevel = pool.length
    ? pool.reduce((sum, s) => sum + s.level, 0) / pool.length
    : 0
  const maxLevel = pool.length ? Math.max(...pool.map((s) => s.level)) : 0
  const unit = latest?.unit ?? contaminant.legalLimitUnit ?? contaminant.healthGuidelineUnit ?? 'ppb'

  const hg = contaminant.healthGuideline
  const ll = contaminant.legalLimit
  const exceedsHealthGuideline =
    hg != null && hg > 0 ? latestLevel > hg : false
  const exceedsLegalLimit = ll != null && ll > 0 ? latestLevel > ll : false

  // ratios: null when no benchmark exists (e.g. unregulated microplastics)
  const healthRatio = hg != null && hg > 0 ? latestLevel / hg : null
  const legalRatio = ll != null && ll > 0 ? latestLevel / ll : null

  return {
    contaminant,
    latestLevel,
    latestDate,
    avgLevel,
    maxLevel,
    unit,
    exceedsHealthGuideline,
    exceedsLegalLimit,
    healthRatio,
    legalRatio,
    trend: sorted.map((s) => ({
      date: s.sampleDate.toISOString(),
      level: s.level,
      treatmentStatus: s.treatmentStatus,
    })),
  }
}
