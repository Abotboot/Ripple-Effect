import type { SampleAssessment } from './types'
import { assessmentKind } from './sample-read-model'

const tiers = {
  legal: { color: '#e11d48', ring: '#fecdd3', label: 'Results above MCL benchmark' },
  health: { color: '#d97706', ring: '#fde68a', label: 'Records above health guideline' },
  compared: { color: '#708d9b', ring: '#cbd5e1', label: 'No exceedance in compared records' },
  not_assessed: { color: '#87919b', ring: '#cbd5e1', label: 'Not assessed' },
  unavailable: { color: '#87919b', ring: '#cbd5e1', label: 'Comparisons unavailable' },
}

export function utilityMapTier(utility: { assessment?: SampleAssessment }) {
  return tiers[assessmentKind(utility.assessment)]
}
