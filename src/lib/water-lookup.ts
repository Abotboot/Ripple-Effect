// Water-body names for collection points, from OpenStreetMap's Nominatim.
// Usage policy: at most one request per second, cached results, and search
// only on an explicit submit (never autocomplete). Every call is optional:
// callers fall back to the name the contributor types.

const ENDPOINT = 'https://nominatim.openstreetmap.org'
const MIN_INTERVAL_MS = 1100

let lastRequest = 0
const cache = new Map<string, unknown>()

async function politeFetch<T>(path: string, signal?: AbortSignal): Promise<T> {
  const url = `${ENDPOINT}${path}`
  if (cache.has(url)) return cache.get(url) as T
  const wait = lastRequest + MIN_INTERVAL_MS - Date.now()
  if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait))
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  lastRequest = Date.now()
  const response = await fetch(url, { signal, headers: { Accept: 'application/json' }, referrerPolicy: 'strict-origin-when-cross-origin' })
  if (!response.ok) throw new Error(`Lookup failed (${response.status})`)
  const body = await response.json() as T
  cache.set(url, body)
  return body
}

type NominatimPlace = {
  lat: string
  lon: string
  name?: string
  display_name?: string
  category?: string
  class?: string
  type?: string
}

const WATER_TYPES = new Set([
  'water', 'lake', 'reservoir', 'pond', 'river', 'stream', 'canal', 'bay', 'strait', 'lagoon',
  'basin', 'riverbank', 'wetland', 'coastline', 'sea', 'ocean', 'creek', 'ditch', 'drain', 'spring',
])

function isWater(place: NominatimPlace): boolean {
  const category = place.category ?? place.class
  if (category === 'waterway') return true
  if (category === 'natural' || category === 'water' || category === 'landuse') return WATER_TYPES.has(place.type ?? '')
  if (category === 'place') return place.type === 'sea' || place.type === 'ocean'
  return false
}

function nameOf(place: NominatimPlace): string | null {
  const name = place.name?.trim() || place.display_name?.split(',')[0]?.trim()
  return name ? name.slice(0, 120) : null
}

export type WaterMatch = { name: string; latitude: number; longitude: number; detail: string }

/** Name of the water feature under a point, or null when the point is on land. */
export async function waterBodyAt(latitude: number, longitude: number, signal?: AbortSignal): Promise<string | null> {
  const lat = latitude.toFixed(5), lon = longitude.toFixed(5)
  const place = await politeFetch<NominatimPlace & { error?: string }>(
    `/reverse?format=jsonv2&layer=natural&zoom=14&lat=${lat}&lon=${lon}`, signal)
  if (!place || place.error || !isWater(place)) return null
  return nameOf(place)
}

/** Explicit, submitted search for a named lake, river, bay or stream. */
export async function searchWaterBodies(query: string, signal?: AbortSignal): Promise<WaterMatch[]> {
  const q = query.trim().slice(0, 120)
  if (q.length < 2) return []
  const places = await politeFetch<NominatimPlace[]>(
    `/search?format=jsonv2&limit=8&countrycodes=us&q=${encodeURIComponent(q)}`, signal)
  return (Array.isArray(places) ? places : [])
    .filter(isWater)
    .map(place => ({
      name: nameOf(place) ?? q,
      latitude: Number(place.lat),
      longitude: Number(place.lon),
      detail: place.display_name?.split(',').slice(1, 3).join(',').trim() ?? '',
    }))
    .filter(match => Number.isFinite(match.latitude) && Number.isFinite(match.longitude))
}
