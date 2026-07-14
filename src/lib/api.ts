// Client-side API helper. All requests are relative (per gateway requirement).

import type {
  Utility,
  Contaminant,
  UtilityWithStats,
  Report,
  Stats,
  AdminUser,
  Volunteer,
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

// ── Utilities ────────────────────────────────────────────────────────
export const api = {
  searchUtilities: (q: string) =>
    req<Utility[]>(`/api/utilities?q=${encodeURIComponent(q)}`),

  getUtility: (id: string) => req<UtilityWithStats>(`/api/utilities/${id}`),

  listUtilities: () => req<Utility[]>(`/api/utilities`),

  // Geospatial search — find utilities within `radius` miles of a point.
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
    req<Volunteer>(`/api/volunteers`, { method: 'POST', body: JSON.stringify(data) }),

  listVolunteers: () => req<Volunteer[]>(`/api/volunteers`),

  updateVolunteerStatus: (id: string, status: string) =>
    req<Volunteer>(`/api/volunteers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  getStats: () => req<Stats>(`/api/stats`),

  // ── Admin ──────────────────────────────────────────────────────────
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

  // ── Import / Export ───────────────────────────────────────────────
  exportUrl: (format: 'csv' | 'json', table: 'utilities' | 'contaminants' | 'samples' | 'reports') =>
    `/api/export?format=${format}&table=${table}`,

  importData: (table: 'utilities' | 'contaminants' | 'samples' | 'reports', format: 'csv' | 'json', content: string) =>
    req<{ imported: number; errors: string[] }>(`/api/import`, {
      method: 'POST',
      body: JSON.stringify({ table, format, content }),
    }),
}
