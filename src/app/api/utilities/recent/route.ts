import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/utilities/recent
// Returns the most recently added utilities (by createdAt), with a small
// summary of their latest sample + exceedance count. Used by the home page
// "Recently added utilities" feed.
export async function GET() {
  await ensureSeeded()

  const recent = await db.utility.findMany({
    take: 6,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      pwsid: true,
      population: true,
      sourceType: true,
      treatmentStatus: true,
      createdAt: true,
      _count: { select: { samples: true } },
    },
  })

  return NextResponse.json({
    utilities: recent.map((u) => ({
      ...u,
      sampleCount: u._count.samples,
      _count: undefined,
    })),
  })
}
