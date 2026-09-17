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
  score: number | null // 0-100 or null if insufficient verified data
  grade: 'A' | 'B' | 'C' | 'D' | 'F' | '—'
  status: 'scored' | 'insufficient_verified_data'
  label: string // e.g., "Not enough reviewed data", "Excellent", "Good", etc.
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
  // Public whole-system grades are suppressed until a documented, validated
  // multi-contaminant scoring and coverage policy exists.
  // Retain honest counts of exceedances and total contaminants without fabricating an A-F composite grade.
  return {
    score: null,
    grade: '—',
    status: 'insufficient_verified_data',
    label: 'Not enough reviewed data',
    color: 'text-muted-foreground',
    bgColor: 'bg-muted/50',
    legalExceedances: params.legalExceedances,
    healthExceedances: params.healthExceedances,
    totalContaminants: params.totalContaminants,
    dataConfidence: 0,
    deductions: [
      {
        reason: 'Whole-system scoring suppressed pending validated multi-contaminant policy',
        points: 0,
      },
    ],
  }
}
