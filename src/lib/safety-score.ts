// Water Safety Score - a composite 0-100 metric for a utility's water quality.
//
// Scoring philosophy:
//   - Start at 100 (perfect).
//   - Deduct heavily for legal limit exceedances (these violate federal law).
//   - Deduct moderately for health guideline exceedances (legal but unhealthy).
//   - Factor in the number of contaminants measured (more data = more confidence).
//   - Factor in data quality (verified > provisional > citizen).
//
// The score is intentionally simple and transparent. Each utility's detail
// page shows the breakdown so users understand exactly why the score is what it is.

export type SafetyScoreBreakdown = {
  score: number // 0-100, higher is better
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  label: string // e.g., "Excellent", "Good", "Concerning", "Poor", "Critical"
  color: string // tailwind text color class
  bgColor: string // tailwind bg color class
  legalExceedances: number
  healthExceedances: number
  totalContaminants: number
  dataConfidence: number // 0-100, based on sample count + quality
  deductions: Array<{ reason: string; points: number }>
}

export function computeSafetyScore(params: {
  legalExceedances: number
  healthExceedances: number
  totalContaminants: number
  totalSamples: number
  verifiedSamples: number
  provisionalSamples: number
  citizenSamples: number
}): SafetyScoreBreakdown {
  let score = 100
  const deductions: Array<{ reason: string; points: number }> = []

  // Legal exceedances: -15 points each (capped at -60)
  const legalDeduction = Math.min(params.legalExceedances * 15, 60)
  if (legalDeduction > 0) {
    score -= legalDeduction
    deductions.push({
      reason: `${params.legalExceedances} contaminant${params.legalExceedances !== 1 ? 's' : ''} above legal limit`,
      points: legalDeduction,
    })
  }

  // Health exceedances: -6 points each (capped at -30)
  const healthDeduction = Math.min(params.healthExceedances * 6, 30)
  if (healthDeduction > 0) {
    score -= healthDeduction
    deductions.push({
      reason: `${params.healthExceedances} contaminant${params.healthExceedances !== 1 ? 's' : ''} above health guideline`,
      points: healthDeduction,
    })
  }

  // Data confidence: how much do we trust the data?
  // More samples = higher confidence. Verified > provisional > citizen.
  const totalQ = params.verifiedSamples + params.provisionalSamples + params.citizenSamples
  const qualityWeighted =
    totalQ > 0
      ? (params.verifiedSamples * 1.0 + params.provisionalSamples * 0.7 + params.citizenSamples * 0.4) / totalQ
      : 0
  // Confidence from sample count: 10+ samples = full, scales down below that
  const countConfidence = Math.min(params.totalSamples / 10, 1)
  const dataConfidence = Math.round(qualityWeighted * countConfidence * 100)

  // Small penalty if data confidence is very low (few, low-quality samples)
  if (dataConfidence < 30) {
    const confDeduction = Math.round((30 - dataConfidence) / 3)
    score -= confDeduction
    deductions.push({
      reason: 'Limited data confidence (few or low-quality samples)',
      points: confDeduction,
    })
  }

  score = Math.max(0, Math.min(100, Math.round(score)))

  // Grade + label
  let grade: SafetyScoreBreakdown['grade'] = 'A'
  let label = 'Excellent'
  let color = 'text-emerald-600 dark:text-emerald-400'
  let bgColor = 'bg-emerald-100 dark:bg-emerald-950/50'

  if (score < 60) {
    grade = 'F'
    label = 'Critical'
    color = 'text-rose-600 dark:text-rose-400'
    bgColor = 'bg-rose-100 dark:bg-rose-950/50'
  } else if (score < 70) {
    grade = 'D'
    label = 'Poor'
    color = 'text-orange-600 dark:text-orange-400'
    bgColor = 'bg-orange-100 dark:bg-orange-950/50'
  } else if (score < 80) {
    grade = 'C'
    label = 'Concerning'
    color = 'text-amber-600 dark:text-amber-400'
    bgColor = 'bg-amber-100 dark:bg-amber-950/50'
  } else if (score < 90) {
    grade = 'B'
    label = 'Good'
    color = 'text-sky-600 dark:text-sky-400'
    bgColor = 'bg-sky-100 dark:bg-sky-950/50'
  }

  return {
    score,
    grade,
    label,
    color,
    bgColor,
    legalExceedances: params.legalExceedances,
    healthExceedances: params.healthExceedances,
    totalContaminants: params.totalContaminants,
    dataConfidence,
    deductions,
  }
}
