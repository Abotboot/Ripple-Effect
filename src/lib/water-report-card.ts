import type { UtilityWithStats } from './types'
import { summaryPresentation } from './assessment-presentation'

export interface WaterReportCardItemViewModel {
  name: string
  valueText: string
  statusText: string
  dotColor: string
  textColor: string
}

export interface WaterReportCardViewModel {
  title: string
  locationSubtitle: string
  totalContaminantsCount: number
  healthExceedancesText: string
  healthCardTone: 'amber' | 'neutral'
  healthSublabel?: string
  legalStatusHeader: string
  legalStatusText: string
  legalCardTone: 'rose' | 'emerald' | 'neutral'
  legalSublabel?: string
  hasAssessedVerifiedData: boolean
  keyFindings: WaterReportCardItemViewModel[]
  shareText: string
}

/**
 * Pure view-model generator for water report cards (Canvas, Share, Print).
 * Strictly guards against inferring "clean" or "within limits" from missing,
 * unreviewed, illustrative, or unbenchmarked evidence.
 */
export function buildWaterReportCardViewModel(
  utility: UtilityWithStats | null
): WaterReportCardViewModel {
  if (!utility) {
    return {
      title: 'Water Quality Report',
      locationSubtitle: '',
      totalContaminantsCount: 0,
      healthExceedancesText: 'N/A',
      healthCardTone: 'neutral',
      healthSublabel: 'No verified benchmarks available',
      legalStatusHeader: 'LEGAL LIMIT COMPARISONS',
      legalStatusText: 'Not Assessed',
      legalCardTone: 'neutral',
      legalSublabel: 'No verified benchmarks available',
      hasAssessedVerifiedData: false,
      keyFindings: [],
      shareText: 'Explore freshwater quality and contaminant data on A Ripple Effect Initiative.',
    }
  }

  const summaries = utility.contaminantSummaries || []

  const assessments = summaries.map(summaryPresentation)
  const legalAssessed = assessments.filter(s => s.legal.ratio != null)
  const healthAssessed = assessments.filter(s => s.health.ratio != null)

  const legalAbove = legalAssessed.filter(s =>
    s.legal.status === 'above_benchmark').length
  const healthAbove = healthAssessed.filter(s =>
    s.health.status === 'above_benchmark').length

  const hasAssessedVerifiedData = legalAssessed.length > 0 || healthAssessed.length > 0

  const title = utility.name.length > 36 ? utility.name.slice(0, 34) + '…' : utility.name
  const locationSubtitle = `${utility.city}, ${utility.state}`

  // Health guideline exceedances
  let healthExceedancesText = 'N/A'
  let healthCardTone: 'amber' | 'neutral' = 'neutral'
  let healthSublabel = summaries.length ? `${summaries.length} not assessed` : 'No data recorded'

  if (healthAssessed.length > 0) {
    healthExceedancesText = `${healthAbove} above / ${healthAssessed.length} assessed`
    if (healthAbove > 0) {
      healthCardTone = 'amber'
    }
    const unassessedCount = summaries.length - healthAssessed.length
    healthSublabel = unassessedCount > 0 ? `${unassessedCount} not assessed` : 'All tracked contaminants assessed'
  }

  // Legal limit comparisons
  let legalStatusHeader = 'LEGAL LIMIT COMPARISONS'
  let legalStatusText = 'Not Assessed'
  let legalCardTone: 'rose' | 'emerald' | 'neutral' = 'neutral'
  let legalSublabel = summaries.length ? `${summaries.length} not assessed` : 'No data recorded'

  if (legalAssessed.length > 0) {
    legalStatusText = `${legalAbove} above / ${legalAssessed.length} assessed`
    if (legalAbove > 0) {
      legalCardTone = 'rose'
    }
    const unassessedCount = summaries.length - legalAssessed.length
    legalSublabel = unassessedCount > 0 ? `${unassessedCount} not assessed` : 'All tracked contaminants assessed'
  }

  // Key findings (top 3)
  const keyFindings: WaterReportCardItemViewModel[] = summaries.slice(0, 3).map((item) => {
    const name = item.contaminant?.name || (item as any).name || 'Contaminant'
    const assessment = summaryPresentation(item)
    const valueText = assessment.valueText
    const statusText = assessment.tone === 'danger' ? 'EXCEEDS LEGAL LIMIT' : assessment.tone === 'warning' ? 'EXCEEDS HEALTH GUIDELINE' : assessment.label.toUpperCase()
    const dotColor = assessment.tone === 'danger' ? '#f43f5e' : assessment.tone === 'warning' ? '#f59e0b' : '#94a3b8'
    const textColor = assessment.tone === 'warning' ? '#fbbf24' : dotColor

    return {
      name,
      valueText,
      statusText,
      dotColor,
      textColor,
    }
  })

  // Outbound share text
  let shareSummary = 'Water quality measurements recorded for community review (0 benchmarks assessed)'
  if (hasAssessedVerifiedData) {
    if (healthAssessed.length > 0) {
      shareSummary = `${healthAbove} of ${healthAssessed.length} assessed contaminants above health guidelines in reviewed records`
    } else {
      shareSummary = `${legalAbove} of ${legalAssessed.length} assessed contaminants above legal limits in reviewed records`
    }
  }

  const shareText = `Water quality report for ${utility.name} (${utility.city}, ${utility.state}): ${shareSummary}. See untreated freshwater and microplastics data near you on A Ripple Effect Initiative:`

  return {
    title,
    locationSubtitle,
    totalContaminantsCount: summaries.length,
    healthExceedancesText,
    healthCardTone,
    healthSublabel,
    legalStatusHeader,
    legalStatusText,
    legalCardTone,
    legalSublabel,
    hasAssessedVerifiedData,
    keyFindings,
    shareText,
  }
}
