// Client-side API helper. All requests are relative (per gateway requirement).

import type {
  Utility,
  Contaminant,
  UtilityWithStats,
  Report,
  Stats,
  AdminUser,
  Volunteer,
  Chapter,
  Donation,
  SampleAssessment,
  DataReadStatus,
} from './types'

async function req<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    let msg = `Request failed: ${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      if (body?.error) msg = body.error
    } catch {
      /* ignore */
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export type WaterReading = {
  id: string
  latitude: number
  longitude: number
  waterBody: string | null
  location: string | null
  level: number
  unit: string
  sampleDate: string
  source: string
  robot: boolean
  reviewLabel: string
  status: 'legal' | 'health' | 'below' | 'unassessed'
  contaminant: { name: string; slug: string }
  utility: { id: string; name: string; city: string; state: string } | null
}

// -- Utilities --
let statsRequest: { at: number; promise: Promise<Stats> } | null = null

export const api = {
  // Readings placed at their collection point on the water.
  getWaterReadings: (signal?: AbortSignal, limit?: number) =>
    req<{ items: WaterReading[]; available: boolean }>(`/api/readings/map${limit ? `?limit=${limit}` : ''}`, { signal }),

  searchUtilities: (q: string) =>
    req<Utility[]>(`/api/utilities?q=${encodeURIComponent(q)}`),

  getUtility: (id: string) => req<UtilityWithStats>(`/api/utilities/${id}`),

  listUtilities: () => req<Utility[]>(`/api/utilities`),

  // Geospatial search - find utilities within `radius` miles of a point.
  // PostGIS alternative (haversine in the app layer).
  nearbyUtilities: (lat: number, lng: number, radius = 100) =>
    req<{
      center: { lat: number; lng: number }
      radiusMiles: number
      count: number
      utilities: Array<Utility & { distanceMiles: number }>
    }>(`/api/utilities/near?lat=${lat}&lng=${lng}&radius=${radius}`),

  listContaminants: () => req<Contaminant[]>(`/api/contaminants`),

  listReports: () => req<Report[]>(`/api/reports`),

  submitReport: (data: Partial<Report>) =>
    req<Report>(`/api/reports`, { method: 'POST', body: JSON.stringify(data) }),

  submitVolunteer: (data: Partial<Volunteer>) =>
    req<{ ok: true; message: string }>(`/api/volunteers`, { method: 'POST', body: JSON.stringify(data) }),

  listVolunteers: () => req<Volunteer[]>(`/api/volunteers`),

  updateVolunteerStatus: (id: string, status: string) =>
    req<Volunteer>(`/api/volunteers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // Several parts of a page read the national summary at once; they share
  // one request, reused for 30 seconds (a failed request is not reused).
  getStats: (): Promise<Stats> => {
    if (statsRequest && Date.now() - statsRequest.at < 30_000) return statsRequest.promise
    const promise = req<Stats>(`/api/stats`)
    statsRequest = { at: Date.now(), promise }
    promise.catch(() => { if (statsRequest?.promise === promise) statsRequest = null })
    return promise
  },

  getMapLocations: (signal?: AbortSignal) => req<{
    mapUtilities: Array<Pick<Utility, 'id' | 'name' | 'city' | 'state' | 'pwsid' | 'population'> & {
      latitude: number
      longitude: number
      assessment: SampleAssessment
    }>
    locationsCount: number
    unmappedCount: number
    assessments: 'not_requested'
  }>('/api/stats?view=map', { signal }),

  // -- Admin --
  login: (email: string, password: string) =>
    req<{ user: AdminUser }>(`/api/auth/login`, {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),

  logout: () => req<{ ok: true }>(`/api/auth/logout`, { method: 'POST' }),

  me: () => req<{ user: AdminUser | null }>(`/api/auth/me`),

  createUtility: (data: Partial<Utility>) =>
    req<Utility>(`/api/utilities`, { method: 'POST', body: JSON.stringify(data) }),

  updateUtility: (id: string, data: Partial<Utility>) =>
    req<Utility>(`/api/utilities/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  deleteUtility: (id: string) =>
    req<{ ok: true }>(`/api/utilities/${id}`, { method: 'DELETE' }),

  updateReportStatus: (id: string, status: string) =>
    req<Report>(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // -- Chapters (Start a Chapter program) --
  submitChapter: (data: Partial<Chapter>) =>
    req<{ ok: true; message: string }>(`/api/chapters`, { method: 'POST', body: JSON.stringify(data) }),

  listChapters: () => req<Chapter[]>(`/api/chapters`),

  updateChapterStatus: (id: string, status: string) =>
    req<Chapter>(`/api/chapters/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // -- Donations --
  submitDonation: (data: Partial<Donation>) =>
    req<Pick<Donation, 'id' | 'amount' | 'tier' | 'status'>>(`/api/donations`, { method: 'POST', body: JSON.stringify(data) }),

  listDonations: () => req<Donation[]>(`/api/donations`),

  // Pull donations made through the embedded HCB form into the database
  // (idempotent - keyed by the HCB donation id).
  syncDonations: () =>
    req<{ ok: true; created: number; updated: number; total: number }>(`/api/donations/sync`, { method: 'POST' }),

  updateDonationStatus: (id: string, status: string) =>
    req<Donation>(`/api/donations/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // -- Activity feed --
  getActivity: () => req<{ items: Array<{ id: string; type: string; date: string; title: string; subtitle: string; meta?: string; tone: string }>; counts: { samples: number; reports: number; chapters: number; donations: number } }>(`/api/activity`),

  // -- Alert subscriptions --
  subscribeAlert: (data: { email: string; utilityId?: string; zipCode?: string; contaminantId?: string; threshold?: number }) =>
    req<{ ok: true; message: string }>(`/api/alerts`, { method: 'POST', body: JSON.stringify(data) }),

  getAlertCount: () => req<{ count: number }>(`/api/alerts`),

  // -- Utility comparison --
  compareUtilities: (ids: string[]) =>
    req<{
      utilities: Array<{ id: string; name: string; city: string; state: string; pwsid: string; population: number; sourceType: string; treatmentStatus: string }>
      rows: Array<{
        contaminant: { id: string; name: string; slug: string; unit: string; healthGuideline: number | null; legalLimit: number | null; regulated: boolean }
        perUtility: Array<{ utilityId: string; level: number | null; unit?: string; sampleCount: number }>
        bestUtilityId: string | null
      }>
    }>(`/api/utilities/compare?ids=${ids.join(',')}`),

  // -- Chapter leaderboard --
  getLeaderboard: () => req<{
    leaderboard: Array<{ id: string; chapterName: string; city: string | null; state: string | null; waterBody: string | null; status: string; createdAt: string; reportCount: number; sampleCount: number; score: number; rank: number }>
    totalChapters: number
    activeChapters: number
  }>(`/api/leaderboard`),

  // -- Citizen reading submission (public) --
  submitReading: (data: {
    contaminantId: string
    level: number
    unit?: string
    utilityId?: string
    location?: string
    treatmentStatus?: string
    sampleDate?: string
    reporterName: string
    reporterEmail: string
    notes?: string
    latitude?: number
    longitude?: number
    waterBody?: string
  }) => req<{ ok: true; id: string; message: string }>(`/api/readings`, {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  getRecentReadings: () => req<{
    items: Array<{
      id: string
      level: number
      unit: string
      location: string | null
      treatmentStatus: string
      sampleDate: string
      createdAt: string
      source: string
      robot: boolean
      reporterName: string
      collectionPoint: { latitude: number; longitude: number; waterBody: string | null } | null
      contaminant: { name: string; slug: string }
      utility: { name: string; city: string; state: string } | null
      exceedsHealth: boolean
      exceedsLegal: boolean
    }>
    count: number
  }>(`/api/readings/recent`),

  getPendingReadings: (status: 'pending' | 'approved' | 'all' = 'pending') => req<{
    items: Array<{
      id: string
      level: number
      unit: string
      source: string
      robot: boolean
      location: string | null
      treatmentStatus: string
      sampleDate: string
      createdAt: string
      quality: string
      reporterEmail: string
      reporterName: string
      userNotes: string
      contaminant: { id: string; name: string; slug: string; healthGuideline: number | null; legalLimit: number | null }
      utility: { id: string; name: string; city: string; state: string } | null
    }>
    count: number
  }>(`/api/readings/pending?status=${status}`),

  updateReadingQuality: (id: string, quality: 'citizen' | 'provisional' | 'verified') =>
    req<{ id: string; quality: string }>(`/api/readings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ quality }),
    }),

  deleteReading: (id: string) =>
    req<{ ok: true }>(`/api/readings/${id}`, { method: 'DELETE' }),

  // -- Dashboard (national stats) --
  getDashboard: () => req<{
    scoreDistribution: { a: number; b: number; c: number; d: number; f: number }
    topExceedances: Array<{ name: string; slug: string; category: string; healthCount: number; legalCount: number }>
    stateRankings: Array<{ state: string; avgScore: number; utilityCount: number }>
    qualityBreakdown: { verified: number; provisional: number; citizen: number }
    categoryBreakdown: Array<{ category: string; count: number }>
    totalUtilities: number
    totalSamples: number
    totalContaminants: number
    trackedByUs: number
    bestUtility: { id: string; name: string; city: string; state: string; score: number; grade: string; label: string } | null
    worstUtility: { id: string; name: string; city: string; state: string; score: number; grade: string; label: string } | null
  }>(`/api/dashboard`),

  // -- Utility safety scores (lightweight, all utilities) --
  getUtilityScores: () => req<{
    scores: Array<{
      id: string
      score: number
      grade: string
      label: string
      color: string
      bgColor: string
      dataConfidence: number
    }>
  }>(`/api/utilities/scores`),

  // -- Recently added utilities --
  getRecentUtilities: () => req<{
    utilities: Array<{
      id: string
      name: string
      city: string
      state: string
      pwsid: string
      population: number
      sourceType: string
      treatmentStatus: string
      createdAt: string
      sampleCount: number
    }>
  }>(`/api/utilities/recent`),

  // -- Microplastics trend --
  getMicroplasticsTrend: () => req<{
    trend: Array<{ quarter: string; label: string; treatedAvg: number | null; untreatedAvg: number | null; maxLevel: number | null }>
    direction: 'up' | 'down' | 'flat' | null
    pctChange: number | null
    totalSamples: number
    reviewedSampleCount?: number
    dataStatus?: DataReadStatus
    dateRange: { from: string; to: string } | null
  }>(`/api/microplastics/trend`),

  // -- Import / Export --
  exportUrl: (
    format: 'csv' | 'json',
    table: 'utilities' | 'contaminants' | 'samples' | 'reports' | 'volunteers' | 'chapters' | 'donations'
  ) => `/api/export?format=${format}&table=${table}`,

  importData: (
    table: 'utilities' | 'contaminants' | 'samples' | 'reports' | 'volunteers' | 'chapters' | 'donations',
    format: 'csv' | 'json',
    content: string
  ) =>
    req<{ imported: number; errors: string[] }>(`/api/import`, {
      method: 'POST',
      body: JSON.stringify({ table, format, content }),
    }),
}
