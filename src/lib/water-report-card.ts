import type { UtilityWithStats } from './types'

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
  legalStatusHeader: string
  legalStatusText: string
  legalCardTone: 'rose' | 'emerald' | 'neutral'
  hasAssessedVerifiedData: boolean
  keyFindings: WaterReportCardItemViewModel[]
  shareText: string
}

/**
 * Pure view-model generator for water report cards (Canvas, Share, Print).
 * Strictly guards against inferring "clean" or "within limits" from missing,
 * unreviewed, or illustrative evidence.
 */
export function buildWaterReportCardViewModel(
  utility: UtilityWithStats | null
): WaterReportCardViewModel {
  if (!utility) {
    return {
      title: 'Water Quality Report',
      locationSubtitle: '',
      totalContaminantsCount: 0,
      healthExceedancesText: '—',
      healthCardTone: 'neutral',
      legalStatusHeader: 'EPA LEGAL STATUS',
      legalStatusText: 'Not Assessed',
      legalCardTone: 'neutral',
      hasAssessedVerifiedData: false,
      keyFindings: [],
      shareText: 'Explore freshwater quality and contaminant data on A Ripple Effect Initiative.',
    }
  }

  const summaries = utility.contaminantSummaries || []
  const hasAssessedVerifiedData = summaries.some((s) => s.isVerified && s.hasData)

  const title = utility.name.length > 36 ? utility.name.slice(0, 34) + '…' : utility.name
  const pop = utility.population ?? (utility as any).populationServed
  const popText = pop ? ` · ${pop.toLocaleString()} residents served` : ''
  const locationSubtitle = `${utility.city}, ${utility.state}${popText}`

  // Health guideline exceedances
  const hExceed = utility.healthExceedances
  let healthExceedancesText = '—'
  let healthCardTone: 'amber' | 'neutral' = 'neutral'
  if (hasAssessedVerifiedData && hExceed != null) {
    healthExceedancesText = `${hExceed}`
    if (hExceed > 0) healthCardTone = 'amber'
  }

  // Legal limit exceedances
  const lExceed = utility.exceedances ?? utility.legalExceedances
  let legalStatusHeader = 'EPA LEGAL STATUS'
  let legalStatusText = 'Not Assessed'
  let legalCardTone: 'rose' | 'emerald' | 'neutral' = 'neutral'

  if (hasAssessedVerifiedData && lExceed != null) {
    if (lExceed > 0) {
      legalStatusHeader = 'ABOVE EPA LEGAL LIMITS'
      legalStatusText = `${lExceed} Violations`
      legalCardTone = 'rose'
    } else {
      legalStatusHeader = 'EPA LEGAL STATUS'
      legalStatusText = 'No Violations Observed'
      legalCardTone = 'emerald'
    }
  }

  // Key findings (top 3)
  const keyFindings: WaterReportCardItemViewModel[] = summaries.slice(0, 3).map((item) => {
    const name = item.contaminant?.name || (item as any).name || 'Contaminant'
    const val = item.latestLevel
    const unit = item.unit || ''
    const valueText = val != null && isFinite(val) ? `${val} ${unit}`.trim() : '— Not measured'

    let statusText = 'NOT ASSESSED'
    let dotColor = '#94a3b8' // slate
    let textColor = '#94a3b8'

    if (item.legalBenchmarkStatus === 'above_benchmark') {
      statusText = 'EXCEEDS LEGAL LIMIT'
      dotColor = '#f43f5e'
      textColor = '#f43f5e'
    } else if (item.healthBenchmarkStatus === 'above_benchmark') {
      statusText = 'EXCEEDS HEALTH GUIDELINE'
      dotColor = '#f59e0b'
      textColor = '#fbbf24'
    } else if (item.isVerified && (item.legalBenchmarkStatus === 'below_benchmark' || item.healthBenchmarkStatus === 'below_benchmark')) {
      statusText = 'BELOW BENCHMARK'
      dotColor = '#10b981'
      textColor = '#34d399'
    } else if (item.isIllustrative || item.healthBenchmarkStatus === 'illustrative') {
      statusText = 'ILLUSTRATIVE BENCHMARK'
      dotColor = '#a855f7'
      textColor = '#c084fc'
    } else if (item.healthBenchmarkStatus === 'incompatible_units' || item.legalBenchmarkStatus === 'incompatible_units') {
      statusText = 'UNIT MISMATCH'
      dotColor = '#94a3b8'
      textColor = '#94a3b8'
    } else if (item.hasData) {
      statusText = 'UNREVIEWED SAMPLE'
      dotColor = '#94a3b8'
      textColor = '#94a3b8'
    }

    return {
      name,
      valueText,
      statusText,
      dotColor,
      textColor,
    }
  })

  // Outbound share text: neutral non-verdict message when no verified data
  let shareSummary = 'Water quality measurements recorded for community review'
  if (hasAssessedVerifiedData && hExceed != null) {
    if (hExceed > 0) {
      shareSummary = `${hExceed} contaminants exceed health guidelines in reviewed records`
    } else {
      shareSummary = 'No health guideline exceedances observed in reviewed records'
    }
  }

  const shareText = `Water quality report for ${utility.name} (${utility.city}, ${utility.state}): ${shareSummary}. See untreated freshwater and microplastics data near you on A Ripple Effect Initiative:`

  return {
    title,
    locationSubtitle,
    totalContaminantsCount: summaries.length,
    healthExceedancesText,
    healthCardTone,
    legalStatusHeader,
    legalStatusText,
    legalCardTone,
    hasAssessedVerifiedData,
    keyFindings,
    shareText,
  }
}
