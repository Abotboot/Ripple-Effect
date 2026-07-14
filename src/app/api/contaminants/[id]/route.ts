import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/contaminants/[id] - single contaminant with aggregated stats across all utilities
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const contaminant = await db.contaminant.findUnique({ where: { id } })
  if (!contaminant) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const samples = await db.sample.findMany({
    where: { contaminantId: id },
    include: { utility: true },
    orderBy: { sampleDate: 'asc' },
  })

  // Aggregate by utility
  const byUtility = new Map<string, typeof samples>()
  for (const s of samples) {
    const arr = byUtility.get(s.utilityId) ?? []
    arr.push(s)
    byUtility.set(s.utilityId, arr)
  }

  const utilityStats = Array.from(byUtility.entries()).map(([utilityId, ss]) => {
    const treated = ss.filter((s) => s.treatmentStatus === 'Treated')
    const pool = treated.length > 0 ? treated : ss
    const latest = pool[pool.length - 1]
    return {
      utilityId,
      utilityName: ss[0].utility.name,
      city: ss[0].utility.city,
      state: ss[0].utility.state,
      pwsid: ss[0].utility.pwsid,
      latestLevel: latest?.level ?? 0,
      avgLevel: pool.reduce((sum, s) => sum + s.level, 0) / (pool.length || 1),
      maxLevel: Math.max(...pool.map((s) => s.level)),
      sampleCount: ss.length,
      unit: latest?.unit ?? '',
    }
  })

  utilityStats.sort((a, b) => b.latestLevel - a.latestLevel)

  // Treated vs untreated comparison (for microplastics spotlight)
  const treatedSamples = samples.filter((s) => s.treatmentStatus === 'Treated')
  const untreatedSamples = samples.filter((s) => s.treatmentStatus === 'Untreated')
  const avg = (arr: typeof samples) =>
    arr.length ? arr.reduce((s, x) => s + x.level, 0) / arr.length : 0

  return NextResponse.json({
    contaminant,
    utilityStats,
    totals: {
      samples: samples.length,
      utilities: byUtility.size,
      avgTreated: avg(treatedSamples),
      avgUntreated: avg(untreatedSamples),
      maxLevel: Math.max(...samples.map((s) => s.level), 0),
    },
  })
}
