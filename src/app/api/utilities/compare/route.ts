import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/utilities/compare?ids=id1,id2,id3
// Returns full contaminant summaries for up to 3 utilities, formatted for
// side-by-side comparison. Each contaminant row includes per-utility levels
// + the health guideline / legal limit for reference.
export async function GET(req: NextRequest) {
  const idsParam = req.nextUrl.searchParams.get('ids') ?? ''
  const ids = idsParam.split(',').map((s) => s.trim()).filter(Boolean).slice(0, 3)

  if (ids.length < 2) {
    return NextResponse.json(
      { error: 'Provide at least 2 utility IDs (comma-separated, max 3).' },
      { status: 400 }
    )
  }

  const utilities = await db.utility.findMany({
    where: { id: { in: ids } },
    include: {
      samples: {
        include: { contaminant: true },
        orderBy: { sampleDate: 'desc' },
      },
    },
  })

  // Preserve the order requested
  const ordered = ids
    .map((id) => utilities.find((u) => u.id === id))
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
      // samples are ordered desc by date, so first is latest
      const latest = samplesForC[0]
      return {
        utilityId: u.id,
        level: latest.level,
        unit: latest.unit,
        sampleCount: samplesForC.length,
      }
    })

    // Determine the "winner" (lowest level) — nulls don't count.
    let bestUtilityId: string | null = null
    let bestLevel = Infinity
    for (const p of perUtility) {
      if (p.level != null && p.level < bestLevel) {
        bestLevel = p.level
        bestUtilityId = p.utilityId
      }
    }

    return {
      contaminant: c,
      perUtility,
      bestUtilityId,
    }
  })

  // Sort: microplastics first, then by name.
  rows.sort((a, b) => {
    if (a.contaminant.slug === 'microplastics') return -1
    if (b.contaminant.slug === 'microplastics') return 1
    return a.contaminant.name.localeCompare(b.contaminant.name)
  })

  return NextResponse.json({
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
  })
}
