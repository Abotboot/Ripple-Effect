import { getBenchmarkStatus } from './provenance'
import type { SampleAssessment } from './types'

export function hasFiniteCoordinates(value: { latitude: unknown; longitude: unknown }): value is { latitude: number; longitude: number } {
  return typeof value.latitude === 'number' && Number.isFinite(value.latitude) && Math.abs(value.latitude) <= 90 &&
    typeof value.longitude === 'number' && Number.isFinite(value.longitude) && Math.abs(value.longitude) <= 180
}

export function unavailableAssessment(): SampleAssessment {
  return { status: 'unavailable', sampleCount: null, eligibleSampleCount: null,
    healthCompared: null, legalCompared: null, healthAbove: null, legalAbove: null }
}

export function assessmentKind(assessment?: SampleAssessment): 'unavailable' | 'not_assessed' | 'legal' | 'health' | 'compared' {
  if (!assessment || assessment.status === 'unavailable') return 'unavailable'
  if ((assessment.legalAbove ?? 0) > 0) return 'legal'
  if ((assessment.healthAbove ?? 0) > 0) return 'health'
  if ((assessment.healthCompared ?? 0) + (assessment.legalCompared ?? 0) > 0) return 'compared'
  return 'not_assessed'
}

/** Invalid levels cannot establish a below-benchmark result. Units must be explicit. */
export function sampleBenchmarkStatus(params: Parameters<typeof getBenchmarkStatus>[0]) {
  if (params.level != null && params.level < 0) return 'no_data' as const
  return getBenchmarkStatus(params)
}
