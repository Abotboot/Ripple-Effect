import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readSamples, SAMPLE_READ_FIELDS, sampleReadHeaders } from '@/lib/sample-read'
import { buildContaminantSummary } from '@/lib/aggregate'

// GET /api/utilities/compare?ids=id1,id2,id3
// Returns full contaminant summaries for up to 3 utilities, formatted for
// side-by-side comparison. Each contaminant row includes per-utility levels
// + the health guideline / legal limit for reference.
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids') ?? ''
  const ids = [...new Set(idsParam.split(',').map((s) => s.trim()).filter(Boolean))].slice(0, 3)

  if (ids.length < 2) {
    return NextResponse.json(
      { error: 'Provide at least 2 utility IDs (comma-separated, max 3).' },
      { status: 400 }
    )
  }

  const [utilities, { samples, dataStatus }] = await Promise.all([
    db.utility.findMany({ where: { id: { in: ids } } }),
    readSamples({ ...SAMPLE_READ_FIELDS, contaminant: true }, {
      where: { utilityId: { in: ids } }, orderBy: { sampleDate: 'desc' },
    }),
  ])

  // Preserve the order requested
  const ordered = ids
    .map((id) => {
      const utility = utilities.find(u => u.id === id)
      return utility ? { ...utility, samples: samples.filter(s => s.utilityId === id) } : null
    })
    .filter((u): u is NonNullable<typeof u> => u != null)

  if (ordered.length < 2) {
    return NextResponse.json(
      { error: 'Could not find 2+ of the requested utilities.' },
      { status: 404 }
    )
  }

  // Build the master contaminant list (union of all contaminants measured
  // across the selected utilities).
  const contaminantMap = new Map<string, {
    id: string
    name: string
    slug: string
    unit: string
    healthGuideline: number | null
    legalLimit: number | null
    regulated: boolean
  }>()
  for (const u of ordered) {
    for (const s of u.samples) {
      if (!contaminantMap.has(s.contaminantId)) {
        contaminantMap.set(s.contaminantId, {
          id: s.contaminant.id,
          name: s.contaminant.name,
          slug: s.contaminant.slug,
          unit: s.contaminant.legalLimitUnit || s.contaminant.healthGuidelineUnit || s.unit,
          healthGuideline: s.contaminant.healthGuideline,
          legalLimit: s.contaminant.legalLimit,
          regulated: s.contaminant.regulated,
        })
      }
    }
  }

  // For each contaminant, get the latest level per utility.
  const rows = Array.from(contaminantMap.values()).map((c) => {
    const perUtility = ordered.map((u) => {
      const samplesForC = u.samples.filter((s) => s.contaminantId === c.id)
      if (samplesForC.length === 0) {
        return { utilityId: u.id, level: null, sampleCount: 0 }
      }
      const summary = buildContaminantSummary(samplesForC[0].contaminant, samplesForC)
      return {
        utilityId: u.id,
        level: summary.latestLevel,
        unit: summary.unit,
        sampleCount: samplesForC.length,
        cohortSampleCount: summary.sampleCount,
        source: summary.source,
        provenance: summary.provenance,
        verificationStatus: summary.verificationStatus,
        healthBenchmarkStatus: summary.healthBenchmarkStatus,
        legalBenchmarkStatus: summary.legalBenchmarkStatus,
        sampleDate: summary.latestDate,
      }
    })

    return {
      contaminant: c,
      perUtility,
      // Separate sources, dates, units and coverage do not establish a system winner.
      bestUtilityId: null,
    }
  })

  // Sort: microplastics first, then by name.
  rows.sort((a, b) => {
    if (a.contaminant.slug === 'microplastics') return -1
    if (b.contaminant.slug === 'microplastics') return 1
    return a.contaminant.name.localeCompare(b.contaminant.name)
  })

  return NextResponse.json({
    dataStatus,
    utilities: ordered.map((u) => ({
      id: u.id,
      name: u.name,
      city: u.city,
      state: u.state,
      pwsid: u.pwsid,
      population: u.population,
      sourceType: u.sourceType,
      treatmentStatus: u.treatmentStatus,
    })),
    rows,
  }, { headers: sampleReadHeaders(dataStatus) })
}
