import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/utilities?q=...
// Search by ZIP code, utility name, city, state, or PWSID.
export async function GET(req: NextRequest) {
  // Auto-seed if DB is empty (prevents "search returns nothing" bug)
  await ensureSeeded()

  const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
  const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '50'), 200)

  let utilities
  if (!q) {
    utilities = await db.utility.findMany({
      take: limit,
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    })
  } else {
    const upper = q.toUpperCase()
    utilities = await db.utility.findMany({
      where: {
        OR: [
          { name: { contains: q } },
          { city: { contains: q } },
          { state: { contains: q } },
          { state: { contains: upper } },
          { pwsid: { contains: upper } },
          { zipCodes: { contains: q } },
          { county: { contains: q } },
        ],
      },
      take: limit,
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    })
  }

  return NextResponse.json(utilities)
}

// POST /api/utilities  (admin only)
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  // Required fields
  if (!body?.pwsid || !body?.name || !body?.state) {
    return NextResponse.json(
      { error: 'pwsid, name, and state are required' },
      { status: 400 }
    )
  }
  try {
    const created = await db.utility.create({
      data: {
        pwsid: body.pwsid,
        name: body.name,
        city: body.city ?? '',
        state: body.state,
        zipCodes: body.zipCodes ?? '',
        county: body.county ?? null,
        population: Number(body.population ?? 0),
        systemType: body.systemType ?? 'Community',
        sourceType: body.sourceType ?? 'Surface',
        treatmentStatus: body.treatmentStatus ?? 'Treated',
        latitude: body.latitude ? Number(body.latitude) : null,
        longitude: body.longitude ? Number(body.longitude) : null,
        website: body.website ?? null,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
