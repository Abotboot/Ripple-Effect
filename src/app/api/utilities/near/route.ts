import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/utilities/near?lat=41.88&lng=-87.63&radius=500
// Returns utilities within `radius` miles of the given point, sorted by distance.
// Uses the haversine formula to compute great-circle distance — a PostGIS
// alternative that works with SQLite (which has no native geo functions).
//
// In a production deployment with PostgreSQL + PostGIS, this query would be:
//   SELECT *, ST_Distance(location, ST_MakePoint(lng, lat)::geography) / 1609.34 AS distance_miles
//   FROM "Utility"
//   WHERE ST_DWithin(location, ST_MakePoint(lng, lat)::geography, radius * 1609.34)
//   ORDER BY distance_miles
//
// We replicate that logic in the application layer here.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const lat = parseFloat(sp.get('lat') ?? '')
  const lng = parseFloat(sp.get('lng') ?? '')
  const radius = parseFloat(sp.get('radius') ?? '100')

  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng query params are required (decimal degrees)' },
      { status: 400 }
    )
  }

  const radiusMiles = Math.min(Math.max(radius, 1), 3000) // clamp 1–3000 miles

  // Fetch all utilities with coordinates (SQLite has no geo index, so we filter in JS).
  // For a larger dataset you'd switch to Postgres+PostGIS with a GIST index.
  const utilities = await db.utility.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
  })

  const withDistance = utilities
    .map((u) => {
      const dist = haversine(lat, lng, u.latitude!, u.longitude!)
      return { ...u, distanceMiles: +dist.toFixed(1) }
    })
    .filter((u) => u.distanceMiles <= radiusMiles)
    .sort((a, b) => a.distanceMiles - b.distanceMiles)

  return NextResponse.json({
    center: { lat, lng },
    radiusMiles,
    count: withDistance.length,
    utilities: withDistance,
  })
}

// Haversine formula — great-circle distance between two lat/lng points, in miles.
function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 3958.8 // Earth radius in miles
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
