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
  trackedByUs: boolean
  rarityNote: string | null
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
  quality: string
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
  source: string
  quality: string
  sampleCount: number
  exceedsHealthGuideline: boolean
  exceedsLegalLimit: boolean
  healthRatio: number
  legalRatio: number
  trend: Array<{ date: string; level: number; treatmentStatus: string }>
}

export type UtilityWithStats = Utility & {
  contaminantSummaries: ContaminantSummary[]
  totalSamples: number
  exceedances: number
  healthExceedances: number
  safetyScore?: {
    score: number
    grade: string
    label: string
    color: string
    bgColor: string
    legalExceedances: number
    healthExceedances: number
    totalContaminants: number
    dataConfidence: number
    deductions: Array<{ reason: string; points: number }>
  }
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

export type Volunteer = {
  id: string
  name: string
  email: string
  zipCode: string | null
  city: string | null
  state: string | null
  role: string
  skills: string | null
  availability: string | null
  message: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type Chapter = {
  id: string
  name: string
  email: string
  chapterName: string | null
  city: string | null
  state: string | null
  zipCode: string | null
  waterBody: string | null
  organization: string | null
  identifier: boolean
  message: string | null
  status: string
  createdAt: string
  updatedAt: string
}

export type Donation = {
  id: string
  name: string
  email: string | null
  amount: number
  tier: string
  message: string | null
  anonymous: boolean
  status: string
  createdAt: string
}

export type Stats = {
  utilitiesCount: number
  contaminantsCount: number
  samplesCount: number
  reportsCount: number
  volunteersCount: number
  chaptersCount: number
  donationsCount: number
  donationsTotal: number
  statesCovered: number
  populationServed: number
  microplasticsAvg: number
  healthExceedances: number
  legalExceedances: number
  trackedByUsCount: number
  qualityCounts: { verified: number; provisional: number; citizen: number }
  mapUtilities: Array<{
    id: string
    name: string
    city: string
    state: string
    pwsid: string
    latitude: number
    longitude: number
    population: number
    healthExceedances: number
    legalExceedances: number
    contaminantExceedances: {
      microplastics: boolean
      pfas: boolean
      lead: boolean
      dbp: boolean
    }
  }>
}

export type AdminUser = {
  id: string
  email: string
  name: string
  role: string
}
