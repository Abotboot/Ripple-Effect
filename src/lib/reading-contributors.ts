import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { parseReadingNotes } from '@/lib/reading-notes'

/** Prisma reports an absent side table (migration not applied yet) as P2021. */
export function isMissingTable(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: unknown }).code === 'P2021')
}

export type Contributor = { email: string; name: string }

/**
 * Private contributor details for admin views. Reads SampleContributor first
 * and falls back to the legacy "reporter:" notes format for older rows.
 */
export async function loadContributors(samples: Array<{ id: string; notes: string | null }>): Promise<Map<string, Contributor>> {
  const found = new Map<string, Contributor>()
  if (samples.length) {
    try {
      const rows = await db.sampleContributor.findMany({
        where: { sampleId: { in: samples.map(sample => sample.id) } },
        select: { sampleId: true, email: true, name: true },
      })
      for (const row of rows) found.set(row.sampleId, { email: row.email, name: row.name })
    } catch (error) {
      if (!isMissingTable(error)) throw error
    }
  }
  for (const sample of samples) {
    if (found.has(sample.id)) continue
    const legacy = parseReadingNotes(sample.notes)
    if (legacy.reporter || legacy.name) found.set(sample.id, { email: legacy.reporter ?? '', name: legacy.name ?? '' })
  }
  return found
}

/** Public display names only; never exposes contact details. */
export async function loadContributorNames(samples: Array<{ id: string; notes: string | null }>): Promise<Map<string, string>> {
  const names = new Map<string, string>()
  if (samples.length) {
    try {
      const rows = await db.sampleContributor.findMany({
        where: { sampleId: { in: samples.map(sample => sample.id) } },
        select: { sampleId: true, name: true },
      })
      for (const row of rows) names.set(row.sampleId, row.name)
    } catch (error) {
      if (!isMissingTable(error)) throw error
    }
  }
  for (const sample of samples) {
    if (names.has(sample.id)) continue
    const legacy = parseReadingNotes(sample.notes).name
    if (legacy) names.set(sample.id, legacy)
  }
  return names
}

/** Free-text notes a contributor wrote, without any structured prefixes. */
export function contributorNotes(notes: string | null): string {
  const parsed = parseReadingNotes(notes)
  if (parsed.structured) return parsed.notes ?? ''
  return notes ?? ''
}

export type CollectionPoint = { latitude: number; longitude: number; waterBody: string | null }

export async function loadCollectionPoints(sampleIds: string[]): Promise<Map<string, CollectionPoint>> {
  const points = new Map<string, CollectionPoint>()
  if (!sampleIds.length) return points
  try {
    const rows = await db.sampleCollectionPoint.findMany({
      where: { sampleId: { in: sampleIds } },
      select: { sampleId: true, latitude: true, longitude: true, waterBody: true },
    })
    for (const row of rows) points.set(row.sampleId, { latitude: row.latitude, longitude: row.longitude, waterBody: row.waterBody })
  } catch (error) {
    if (!isMissingTable(error)) throw error
  }
  return points
}

/** Validates an optional collection point from a request body. */
export function parseCollectionPoint(body: Record<string, unknown>):
  | { ok: true; point: Omit<Prisma.SampleCollectionPointUncheckedCreateInput, 'sampleId'> | null }
  | { ok: false; error: string } {
  const hasLat = body.latitude != null && body.latitude !== ''
  const hasLng = body.longitude != null && body.longitude !== ''
  if (!hasLat && !hasLng) return { ok: true, point: null }
  const latitude = Number(body.latitude)
  const longitude = Number(body.longitude)
  if (!hasLat || !hasLng || !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
    return { ok: false, error: 'Collection point must be a valid latitude and longitude.' }
  }
  const waterBody = typeof body.waterBody === 'string' ? body.waterBody.replace(/\s+/g, ' ').trim().slice(0, 120) || null : null
  // Six decimals is ~10 cm; more precision adds nothing but fingerprinting.
  const round = (value: number) => Math.round(value * 1e6) / 1e6
  return { ok: true, point: { latitude: round(latitude), longitude: round(longitude), waterBody } }
}
