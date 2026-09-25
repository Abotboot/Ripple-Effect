import { NextResponse } from 'next/server'
import { readSamples, sampleReadHeaders } from '@/lib/sample-read'
import { sampleBenchmarkStatus } from '@/lib/sample-read-model'
import { getProvenancePresentation } from '@/lib/provenance'
import { loadCollectionPoints, loadContributorNames } from '@/lib/reading-contributors'

// GET /api/readings/recent
// Returns recent citizen-submitted readings for the public home feed.
// Only returns quality='citizen' samples (not lab/utility data - those are
// already shown in other feeds). Includes the contaminant + utility info
// for display, the contributor display name, and the collection point.
export async function GET() {

  const { samples: readings, dataStatus } = await readSamples({
      provenance: true, verificationStatus: true, quality: true,
      id: true,
      level: true,
      unit: true,
      location: true,
      treatmentStatus: true,
      sampleDate: true,
      createdAt: true,
      notes: true,
      source: true,
      robot: true,
      contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true,
        healthGuidelineUnit: true, legalLimitUnit: true } },
      utility: { select: { id: true, name: true, city: true, state: true } },
  }, { where: { quality: 'citizen' }, take: 12, orderBy: { createdAt: 'desc' } })

  // Display names come from SampleContributor, or legacy "name:" notes.
  const [names, points] = await Promise.all([
    loadContributorNames(readings),
    loadCollectionPoints(readings.map(r => r.id)),
  ])
  const items = readings.map((r) => {
    const reporterName = names.get(r.id) || 'Anonymous'
    const point = points.get(r.id) ?? null
    const c = r.contaminant
    const healthBenchmarkStatus = sampleBenchmarkStatus({ ...r, benchmark: c.healthGuideline, benchmarkUnit: c.healthGuidelineUnit })
    const legalBenchmarkStatus = sampleBenchmarkStatus({ ...r, benchmark: c.legalLimit, benchmarkUnit: c.legalLimitUnit })
    return {
      id: r.id,
      level: r.level,
      unit: r.unit,
      location: r.location,
      treatmentStatus: r.treatmentStatus,
      sampleDate: r.sampleDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
      source: r.source,
      provenance: r.provenance,
      verificationStatus: r.verificationStatus,
      reviewLabel: getProvenancePresentation(r).badgeLabel,
      healthBenchmarkStatus,
      legalBenchmarkStatus,
      robot: r.robot,
      reporterName,
      collectionPoint: point,
      contaminant: { name: c.name, slug: c.slug },
      utility: r.utility
        ? { name: r.utility.name, city: r.utility.city, state: r.utility.state }
        : null,
      exceedsHealth: healthBenchmarkStatus === 'above_benchmark',
      exceedsLegal: legalBenchmarkStatus === 'above_benchmark',
    }
  })

  return NextResponse.json({ items, count: items.length, dataStatus }, { headers: sampleReadHeaders(dataStatus) })
}
