// Shared types between frontend and backend

export type Utility = {
  id: string
  pwsid: string
  name: string
  city: string
  state: string
  zipCodes: string
  county: string | null
  population: number
  systemType: string
  sourceType: string
  treatmentStatus: string
  latitude: number | null
  longitude: number | null
  website: string | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

export type Contaminant = {
  id: string
  slug: string
  name: string
  chemicalName: string | null
  category: string
  legalLimit: number | null
  legalLimitUnit: string | null
  healthGuideline: number | null
  healthGuidelineUnit: string | null
  ewgHealthLimit: number | null
  description: string | null
  healthEffects: string | null
  sources: string | null
  regulated: boolean
}

export type Sample = {
  id: string
  utilityId: string
  contaminantId: string
  level: number
  unit: string
  sampleDate: string
  source: string
  treatmentStatus: string
  location: string | null
  notes: string | null
}

// Sample joined with contaminant & utility for display
export type SampleWithRelations = Sample & {
  contaminant: Contaminant
  utility: Utility
}

// Aggregated contaminant measurement for a single utility
export type ContaminantSummary = {
  contaminant: Contaminant
  latestLevel: number
  latestDate: string
  avgLevel: number
  maxLevel: number
  unit: string
  exceedsHealthGuideline: boolean
  exceedsLegalLimit: boolean
  // ratio of latest level to health guideline (1.0 = at guideline)
  healthRatio: number
  // ratio of latest level to legal limit
  legalRatio: number
  // samples for trend chart
  trend: Array<{ date: string; level: number; treatmentStatus: string }>
}

export type UtilityWithStats = Utility & {
  contaminantSummaries: ContaminantSummary[]
  totalSamples: number
  exceedances: number
  healthExceedances: number
}

export type Report = {
  id: string
  utilityId: string | null
  reporterName: string | null
  reporterEmail: string | null
  zipCode: string
  city: string | null
  state: string | null
  title: string
  description: string
  contaminant: string | null
  appearance: string | null
  severity: string
  status: string
  createdAt: string
  updatedAt: string
}

export type Stats = {
  utilitiesCount: number
  contaminantsCount: number
  samplesCount: number
  reportsCount: number
  statesCovered: number
  populationServed: number
  microplasticsAvg: number
  healthExceedances: number
  legalExceedances: number
}

export type AdminUser = {
  id: string
  email: string
  name: string
  role: string
}
