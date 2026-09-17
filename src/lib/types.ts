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
  createdAt: string | Date
  updatedAt: string | Date
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
  utilityId: string | null
  contaminantId: string
  level: number
  unit: string
  sampleDate: string
  source: string
  treatmentStatus: string
  location: string | null
  quality: string
  provenance?: string
  verificationStatus?: string
  sourceUrl?: string | null
  sourceRecordId?: string | null
  reportingPeriod?: string | null
  method?: string | null
  verifiedAt?: string | null
  notes: string | null
  // True when the sample was measured by our own identifier robot
  // (vs. pulled in from an external source like EPA or a utility).
  robot?: boolean
}

// Sample joined with contaminant & utility for display
export type SampleWithRelations = Sample & {
  contaminant: Contaminant
  utility: Utility
}

// Aggregated contaminant measurement for a single utility
export type ContaminantSummary = {
  contaminant: Contaminant
  latestLevel: number | null
  latestDate: string | null
  avgLevel: number | null
  maxLevel: number | null
  unit: string
  source: string
  robot?: boolean
  quality: string
  provenance?: string
  verificationStatus?: string
  sampleCount: number
  exceedsHealthGuideline: boolean
  exceedsLegalLimit: boolean
  healthRatio: number | null
  legalRatio: number | null
  healthBenchmarkStatus?: import('./provenance').BenchmarkStatus
  legalBenchmarkStatus?: import('./provenance').BenchmarkStatus
  trend: Array<{
    date: string
    level: number
    treatmentStatus: string
    provenance?: string
    verificationStatus?: string
  }>
}

export type UtilityWithStats = Utility & {
  contaminantSummaries: ContaminantSummary[]
  totalSamples: number
  exceedances: number
  healthExceedances: number
  safetyScore?: {
    score: number | null
    grade: string
    status?: string
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
  externalId?: string | null
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
  microplasticsAvg: number | null
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
