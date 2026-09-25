import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { contributorNotes, loadCollectionPoints, loadContributors } from '@/lib/reading-contributors'

// GET /api/readings/pending?status=pending|approved|all - admin only.
// Returns citizen-quality samples for moderation, newest first.
//  - pending (default): quality='citizen' — awaiting review
//  - approved: quality in ('provisional','verified') — already approved
//  - all: everything
// Includes parsed reporter info from the notes field and the robot flag so
// the admin can tell robot data from citizen data at a glance.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  const qualityWhere =
    status === 'approved'
      ? { quality: { in: ['provisional', 'verified'] } }
      : status === 'all'
      ? {}
      : { quality: 'citizen' }

  const readings = await db.sample.findMany({
    where: qualityWhere,
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      level: true,
      unit: true,
      source: true,
      robot: true,
      location: true,
      treatmentStatus: true,
      sampleDate: true,
      createdAt: true,
      notes: true,
      quality: true,
      contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true } },
      utility: { select: { id: true, name: true, city: true, state: true } },
    },
  })

  const [contributors, points] = await Promise.all([
    loadContributors(readings),
    loadCollectionPoints(readings.map(r => r.id)),
  ])
  const items = readings.map((r) => {
    const contributor = contributors.get(r.id)
    return {
      ...r,
      reporterEmail: contributor?.email ?? '',
      reporterName: contributor?.name ?? '',
      userNotes: contributorNotes(r.notes),
      collectionPoint: points.get(r.id) ?? null,
      notes: undefined, // don't re-send the raw notes blob
    }
  })

  return NextResponse.json({ items, count: items.length })
}
