import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { contributorNotes, loadCollectionPoints, loadContributors } from '@/lib/reading-contributors'
import { SUBMITTED_WHERE } from '@/lib/published-samples'
import { jevConfigured, jevModel, loadReviews } from '@/lib/reading-review'

// GET /api/readings/pending?status=pending|published|rejected|all - admin only.
// The review queue: every submitted reading (public form or device), newest
// first, with the review that decided it (see lib/reading-review.ts).
//  - pending (default): still unreviewed, waiting for Jev or a person
//  - published: on the site
//  - rejected: kept out of the site
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const status = req.nextUrl.searchParams.get('status') ?? 'pending'
  const verification =
    status === 'published' ? { verificationStatus: 'VERIFIED' as const }
    : status === 'rejected' ? { verificationStatus: 'REJECTED' as const }
    : status === 'all' ? {}
    : { verificationStatus: 'UNREVIEWED' as const }

  const readings = await db.sample.findMany({
    where: { AND: [SUBMITTED_WHERE, verification] },
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
      verificationStatus: true,
      verifiedAt: true,
      contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true } },
      utility: { select: { id: true, name: true, city: true, state: true } },
    },
  })

  const ids = readings.map(r => r.id)
  const [contributors, points, reviews] = await Promise.all([
    loadContributors(readings),
    loadCollectionPoints(ids),
    loadReviews(ids),
  ])
  const items = readings.map((r) => {
    const contributor = contributors.get(r.id)
    return {
      ...r,
      reporterEmail: contributor?.email ?? '',
      reporterName: contributor?.name ?? '',
      userNotes: r.robot ? (r.notes ?? '') : contributorNotes(r.notes),
      collectionPoint: points.get(r.id) ?? null,
      review: reviews.get(r.id) ?? null,
      notes: undefined, // don't re-send the raw notes blob
    }
  })

  return NextResponse.json({
    items,
    count: items.length,
    jev: { configured: jevConfigured(), model: jevModel() },
  })
}
