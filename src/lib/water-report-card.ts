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
      healthExceedancesText: '—',
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

  const compared = (status: string | undefined) =>
    status === 'above_benchmark' || status === 'below_benchmark'

  const measured = (s: typeof summaries[number]) =>
    s.isVerified && s.hasData && s.latestLevel != null &&
    Number.isFinite(s.latestLevel)

  const legalAssessed = summaries.filter(s =>
    measured(s) && compared(s.legalBenchmarkStatus))
  const healthAssessed = summaries.filter(s =>
    measured(s) && compared(s.healthBenchmarkStatus))

  const legalAbove = legalAssessed.filter(s =>
    s.legalBenchmarkStatus === 'above_benchmark').length
  const healthAbove = healthAssessed.filter(s =>
    s.healthBenchmarkStatus === 'above_benchmark').length

  const hasAssessedVerifiedData = legalAssessed.length > 0 || healthAssessed.length > 0

  const title = utility.name.length > 36 ? utility.name.slice(0, 34) + '…' : utility.name
  const pop = utility.population ?? (utility as any).populationServed
  const popText = pop ? ` · ${pop.toLocaleString()} residents served` : ''
  const locationSubtitle = `${utility.city}, ${utility.state}${popText}`

  // Health guideline exceedances
  let healthExceedancesText = '—'
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
    } else {
      legalCardTone = 'emerald'
    }
    const unassessedCount = summaries.length - legalAssessed.length
    legalSublabel = unassessedCount > 0 ? `${unassessedCount} not assessed` : 'All tracked contaminants assessed'
  }

  // Key findings (top 3)
  const keyFindings: WaterReportCardItemViewModel[] = summaries.slice(0, 3).map((item) => {
    const name = item.contaminant?.name || (item as any).name || 'Contaminant'
    const val = item.latestLevel
    const hasMeas = item.hasData && val != null && Number.isFinite(val)
    const unit = item.unit || ''
    const valueText = hasMeas ? `${val} ${unit}`.trim() : '— Not measured'

    let statusText = 'NOT ASSESSED'
    let dotColor = '#94a3b8' // slate
    let textColor = '#94a3b8'

    if (!hasMeas) {
      statusText = 'NO MEASUREMENT RECORDED'
    } else if (!item.isVerified) {
      if (item.isIllustrative || item.healthBenchmarkStatus === 'illustrative' || item.legalBenchmarkStatus === 'illustrative') {
        statusText = 'ILLUSTRATIVE BENCHMARK'
        dotColor = '#a855f7'
        textColor = '#c084fc'
      } else {
        statusText = 'UNREVIEWED SAMPLE'
        dotColor = '#94a3b8'
        textColor = '#94a3b8'
      }
    } else {
      // Verified and measured
      if (item.legalBenchmarkStatus === 'above_benchmark') {
        statusText = 'EXCEEDS LEGAL LIMIT'
        dotColor = '#f43f5e'
        textColor = '#f43f5e'
      } else if (item.healthBenchmarkStatus === 'above_benchmark') {
        statusText = 'EXCEEDS HEALTH GUIDELINE'
        dotColor = '#f59e0b'
        textColor = '#fbbf24'
      } else if (item.legalBenchmarkStatus === 'below_benchmark' || item.healthBenchmarkStatus === 'below_benchmark') {
        statusText = 'BELOW BENCHMARK'
        dotColor = '#10b981'
        textColor = '#34d399'
      } else if (item.legalBenchmarkStatus === 'incompatible_units' || item.healthBenchmarkStatus === 'incompatible_units') {
        statusText = 'UNIT MISMATCH'
        dotColor = '#94a3b8'
        textColor = '#94a3b8'
      } else if (item.legalBenchmarkStatus === 'no_benchmark' || item.healthBenchmarkStatus === 'no_benchmark') {
        statusText = 'NO BENCHMARK AVAILABLE'
        dotColor = '#94a3b8'
        textColor = '#94a3b8'
      }
    }

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
