import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readSamples, SAMPLE_READ_FIELDS, sampleReadHeaders } from '@/lib/sample-read'
import { buildContaminantSummary } from '@/lib/aggregate'
import { summarizeReviewedConcentrations } from '@/lib/sample-read-cohort'

// GET /api/contaminants/[id] - single contaminant with aggregated stats across all utilities
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    return await getContaminantDetail(id)
  } catch (err) {
    console.error('[api/contaminants/[id]] read failed', { code: err && typeof err === 'object' && 'code' in err ? err.code : 'unknown' })
    return NextResponse.json({ error: 'Failed to load contaminant detail' }, { status: 500 })
  }
}

async function getContaminantDetail(id: string) {
  const contaminant = await db.contaminant.findUnique({ where: { id } })
  if (!contaminant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const { samples, dataStatus } = await readSamples({ ...SAMPLE_READ_FIELDS, utility: true }, {
    where: { contaminantId: id },
    orderBy: { sampleDate: 'asc' },
  })

  // Aggregate by utility (skip citizen readings not tied to a utility,
    // e.g. lake/bay samples. Their utility relation is intentionally null).
  const byUtility = new Map<string, typeof samples>()
  for (const s of samples) {
    if (!s.utilityId || !s.utility) continue
    const arr = byUtility.get(s.utilityId) ?? []
    arr.push(s)
    byUtility.set(s.utilityId, arr)
  }

  const utilityStats = Array.from(byUtility.entries()).map(([utilityId, ss]) => {
    const summary = buildContaminantSummary(contaminant, ss)
    const u = ss[0].utility
    return {
      utilityId,
      utilityName: u?.name ?? 'Unknown Utility',
      city: u?.city ?? '',
      state: u?.state ?? '',
      pwsid: u?.pwsid ?? '',
      latestLevel: summary.latestLevel,
      avgLevel: summary.avgLevel,
      maxLevel: summary.maxLevel,
      sampleCount: ss.length,
      unit: summary.unit,
      source: summary.source,
      provenance: summary.provenance,
      verificationStatus: summary.verificationStatus,
      cohortSampleCount: summary.sampleCount,
      healthBenchmarkStatus: summary.healthBenchmarkStatus,
      legalBenchmarkStatus: summary.legalBenchmarkStatus,
    }
  })

  utilityStats.sort((a, b) => (b.latestLevel ?? -Infinity) - (a.latestLevel ?? -Infinity))

  // Treated vs untreated comparison (for microplastics spotlight)
  const treatedSamples = samples.filter((s) => s.treatmentStatus === 'Treated')
  const untreatedSamples = samples.filter((s) => s.treatmentStatus === 'Untreated')
  const unit = contaminant.slug === 'microplastics' ? 'particles/l' :
    contaminant.healthGuidelineUnit ?? contaminant.legalLimitUnit ?? samples.at(-1)?.unit ?? ''
  const treated = summarizeReviewedConcentrations(treatedSamples, unit)
  const untreated = summarizeReviewedConcentrations(untreatedSamples, unit)
  const reviewed = summarizeReviewedConcentrations(samples, unit)

  return NextResponse.json({
    dataStatus,
    contaminant,
    utilityStats,
    totals: {
      samples: samples.length,
      utilities: byUtility.size,
      avgTreated: treated.average,
      avgUntreated: untreated.average,
      maxLevel: reviewed.maximum,
      unit,
      reviewedSampleCount: reviewed.sampleCount,
      treatedCohortCount: treated.sampleCount,
      untreatedCohortCount: untreated.sampleCount,
      cohort: 'reviewed_institutional',
    },
  }, { headers: sampleReadHeaders(dataStatus) })
}
