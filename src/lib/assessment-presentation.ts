import type { ContaminantSummary, UtilityWithStats } from './types'
import { isEligibleForScoring, normalizeProvenance, normalizeToBenchmarkUnit, type BenchmarkStatus } from './provenance'
import { sampleBenchmarkStatus } from './sample-read-model'

export type BenchmarkKind = 'health' | 'legal'
export type BenchmarkComparison = {
  status: BenchmarkStatus
  label: string
  ratio: number | null
  tone: 'neutral' | 'warning' | 'danger'
}

export function hasMeasurement(summary: ContaminantSummary): boolean {
  return summary.hasData !== false && typeof summary.latestLevel === 'number' &&
    Number.isFinite(summary.latestLevel) && summary.latestLevel >= 0
}

/** Presentation must not turn stale booleans/ratios into a reviewed comparison. */
export function comparisonFor(summary: ContaminantSummary, kind: BenchmarkKind): BenchmarkComparison {
  const c = summary.contaminant
  const benchmark = kind === 'health' ? c.healthGuideline : c.legalLimit
  const benchmarkUnit = kind === 'health' ? c.healthGuidelineUnit : c.legalLimitUnit
  const level = hasMeasurement(summary) ? summary.latestLevel : null
  const status = sampleBenchmarkStatus({
    ...summary,
    level,
    benchmark,
    benchmarkUnit,
    provenance: summary.isIllustrative ? 'ILLUSTRATIVE' : summary.provenance,
    verificationStatus: summary.isVerified === false ? 'UNREVIEWED' : summary.verificationStatus,
  })
  const compared = status === 'above_benchmark' || status === 'below_benchmark'
  const normalized = compared && level != null && benchmarkUnit
    ? normalizeToBenchmarkUnit(level, summary.unit, benchmarkUnit) : null
  const ratio = normalized != null && benchmark != null && benchmark > 0 && Number.isFinite(normalized / benchmark)
    ? normalized / benchmark : null
  const benchmarkName = kind === 'health' ? 'health guideline' : 'legal limit'
  const labels: Record<BenchmarkStatus, string> = {
    no_data: 'Not measured',
    unreviewed: normalizeProvenance(summary) === 'CITIZEN_CONTRIBUTED' ? 'Citizen reading · not assessed' : 'Unreviewed · not assessed',
    illustrative: 'Illustrative · not assessed',
    no_benchmark: 'No benchmark available',
    incompatible_units: 'Unit mismatch',
    below_benchmark: `Below ${benchmarkName}`,
    above_benchmark: `Above ${benchmarkName}`,
  }
  return { status, label: labels[status], ratio, tone: status === 'above_benchmark' ? kind === 'health' ? 'warning' : 'danger' : 'neutral' }
}

export function summaryPresentation(summary: ContaminantSummary) {
  const health = comparisonFor(summary, 'health'), legal = comparisonFor(summary, 'legal')
  const hasData = hasMeasurement(summary)
  let label = 'Not assessed'
  let tone: BenchmarkComparison['tone'] = 'neutral'
  if (!hasData) label = 'No measurement recorded'
  else if (legal.status === 'above_benchmark') { label = legal.label; tone = legal.tone }
  else if (health.status === 'above_benchmark') { label = health.label; tone = health.tone }
  else if (health.status === 'illustrative' || legal.status === 'illustrative') label = 'Illustrative benchmark'
  else if (health.status === 'unreviewed' || legal.status === 'unreviewed') label = normalizeProvenance(summary) === 'CITIZEN_CONTRIBUTED' ? 'Citizen reading · not assessed' : 'Unreviewed sample'
  else if (health.ratio != null && legal.ratio != null) label = 'No exceedance in compared records'
  else if (health.ratio != null) label = 'Health compared; legal unavailable'
  else if (legal.ratio != null) label = 'Legal compared; health unavailable'
  else if (health.status === 'incompatible_units' || legal.status === 'incompatible_units') label = 'Unit mismatch'
  else if (health.status === 'no_benchmark' || legal.status === 'no_benchmark') label = 'No benchmark available'
  return {
    health, legal, label, tone, hasData,
    reviewed: hasData && !summary.isIllustrative && summary.isVerified !== false && isEligibleForScoring(summary),
    valueText: hasData ? `${summary.latestLevel} ${summary.unit || '(unit unavailable)'}` : 'Not measured',
  }
}

export function utilityComparisons(summaries: ContaminantSummary[]) {
  const rows = summaries.map(summaryPresentation)
  const health = rows.filter(row => row.health.ratio != null), legal = rows.filter(row => row.legal.ratio != null)
  return {
    healthCompared: health.length, legalCompared: legal.length,
    healthAbove: health.filter(row => row.health.status === 'above_benchmark').length,
    legalAbove: legal.filter(row => row.legal.status === 'above_benchmark').length,
  }
}

/** Unknown/status-suppressed/out-of-range scores are not numeric ratings. */
export function hasPublishedScore(score: UtilityWithStats['safetyScore']): score is NonNullable<UtilityWithStats['safetyScore']> & { score: number } {
  return score?.status === 'scored' && typeof score.score === 'number' &&
    Number.isFinite(score.score) && score.score >= 0 && score.score <= 100
}
