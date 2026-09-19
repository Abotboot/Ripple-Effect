import { areUnitsCompatible, isEligibleForScoring, normalizeToBenchmarkUnit } from './provenance'

type CohortSample = Parameters<typeof isEligibleForScoring>[0] & {
  level: number
  unit: string
  treatmentStatus: string
}

/** Comparable reviewed concentrations only; absent cohorts stay null, never zero-filled. */
export function reviewedConcentration(sample: CohortSample, targetUnit: string): number | null {
  if (!isEligibleForScoring(sample) || !Number.isFinite(sample.level) || sample.level < 0 || !areUnitsCompatible(sample.unit, targetUnit)) return null
  const converted = normalizeToBenchmarkUnit(sample.level, sample.unit, targetUnit)
  return converted != null && Number.isFinite(converted) && converted >= 0 ? converted : null
}

export function summarizeReviewedConcentrations(samples: CohortSample[], unit: string) {
  const values = samples.flatMap(sample => {
    const value = reviewedConcentration(sample, unit)
    return value == null ? [] : [value]
  })
  return {
    unit, sampleCount: values.length,
    average: values.length ? values.reduce((sum, value) => sum + value / values.length, 0) : null,
    maximum: values.length ? values.reduce((max, value) => Math.max(max, value), 0) : null,
  }
}
