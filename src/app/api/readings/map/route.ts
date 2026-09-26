import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { isMissingTable } from '@/lib/reading-contributors'
import { sampleBenchmarkStatus } from '@/lib/sample-read-model'
import { getProvenancePresentation } from '@/lib/provenance'
import { isMissingSampleMetadataColumn } from '@/lib/sample-read'
import type { WaterReading } from '@/lib/api'

// GET /api/readings/map
// Public: readings that carry a collection point, so the map can draw each
// one on the water body where it was taken. Contact details are never read.
// Rejected records are excluded; unreviewed and illustrative records keep
// their labels and never count as benchmark findings.

const MAX_POINTS = 2000

export async function GET(request: Request) {
  // ?limit=N returns only the newest N (the ticker shows a handful).
  const requested = Number(new URL(request.url).searchParams.get('limit'))
  const take = Number.isInteger(requested) && requested > 0 ? Math.min(requested, MAX_POINTS) : MAX_POINTS
  const select = {
    latitude: true,
    longitude: true,
    waterBody: true,
    sample: {
      select: {
        id: true, level: true, unit: true, sampleDate: true, source: true, robot: true,
        location: true, quality: true, provenance: true, verificationStatus: true,
        contaminant: { select: { name: true, slug: true, healthGuideline: true, healthGuidelineUnit: true, legalLimit: true, legalLimitUnit: true } },
        utility: { select: { id: true, name: true, city: true, state: true } },
      },
    },
  } as const

  let rows
  try {
    rows = await db.sampleCollectionPoint.findMany({
      select,
      where: { sample: { verificationStatus: { not: 'REJECTED' } } },
      orderBy: { sample: { sampleDate: 'desc' } },
      take,
    })
  } catch (error) {
    if (isMissingTable(error) || isMissingSampleMetadataColumn(error)) {
      return NextResponse.json({ items: [], available: false }, { headers: { 'Cache-Control': 'no-store' } })
    }
    throw error
  }

  const items: WaterReading[] = rows.map(({ latitude, longitude, waterBody, sample }) => {
    const c = sample.contaminant
    const legal = sampleBenchmarkStatus({ ...sample, benchmark: c.legalLimit, benchmarkUnit: c.legalLimitUnit })
    const health = sampleBenchmarkStatus({ ...sample, benchmark: c.healthGuideline, benchmarkUnit: c.healthGuidelineUnit })
    const status: WaterReading['status'] = legal === 'above_benchmark' ? 'legal'
      : health === 'above_benchmark' ? 'health'
      : legal === 'below_benchmark' || health === 'below_benchmark' ? 'below'
      : 'unassessed'
    return {
      id: sample.id,
      latitude,
      longitude,
      waterBody,
      location: sample.location,
      level: sample.level,
      unit: sample.unit,
      sampleDate: sample.sampleDate.toISOString(),
      source: sample.source,
      robot: sample.robot,
      reviewLabel: getProvenancePresentation(sample).badgeLabel,
      status,
      contaminant: { name: c.name, slug: c.slug },
      utility: sample.utility,
    }
  })

  return NextResponse.json({ items, available: true }, {
    headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
  })
}
