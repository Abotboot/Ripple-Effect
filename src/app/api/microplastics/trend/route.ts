import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/microplastics/trend
// Returns microplastics levels over time (avg per quarter) for treated
// vs untreated water, so we can visualize whether levels are changing.
export async function GET() {
  await ensureSeeded()

  const mp = await db.contaminant.findUnique({ where: { slug: 'microplastics' } })
  if (!mp) {
    return NextResponse.json({ error: 'Microplastics contaminant not found.' }, { status: 404 })
  }

  const samples = await db.sample.findMany({
    where: { contaminantId: mp.id },
    select: {
      level: true,
      unit: true,
      sampleDate: true,
      treatmentStatus: true,
      utility: { select: { city: true, state: true } },
    },
    orderBy: { sampleDate: 'asc' },
  })

  // Group by quarter (YYYY-QN) + treatment status.
  type Quarter = {
    quarter: string
    label: string
    treatedSum: number
    treatedCount: number
    untreatedSum: number
    untreatedCount: number
    maxLevel: number
  }
  const quarterMap = new Map<string, Quarter>()

  for (const s of samples) {
    const d = new Date(s.sampleDate)
    const year = d.getFullYear()
    const month = d.getMonth()
    const q = Math.floor(month / 3) + 1
    const key = `${year}-Q${q}`
    const label = `Q${q} ${year}`

    if (!quarterMap.has(key)) {
      quarterMap.set(key, {
        quarter: key,
        label,
        treatedSum: 0,
        treatedCount: 0,
        untreatedSum: 0,
        untreatedCount: 0,
        maxLevel: 0,
      })
    }
    const entry = quarterMap.get(key)!
    if (s.treatmentStatus === 'Untreated') {
      entry.untreatedSum += s.level
      entry.untreatedCount++
    } else {
      entry.treatedSum += s.level
      entry.treatedCount++
    }
    if (s.level > entry.maxLevel) entry.maxLevel = s.level
  }

  const trend = Array.from(quarterMap.values())
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
    .map((q) => ({
      quarter: q.quarter,
      label: q.label,
      treatedAvg: q.treatedCount > 0 ? +(q.treatedSum / q.treatedCount).toFixed(2) : 0,
      untreatedAvg: q.untreatedCount > 0 ? +(q.untreatedSum / q.untreatedCount).toFixed(2) : 0,
      maxLevel: +q.maxLevel.toFixed(2),
    }))

  // Compute overall trend direction (first vs last treated avg).
  const treatedValues = trend.filter((t) => t.treatedAvg > 0)
  let direction: 'up' | 'down' | 'flat' = 'flat'
  let pctChange = 0
  if (treatedValues.length >= 2) {
    const first = treatedValues[0].treatedAvg
    const last = treatedValues[treatedValues.length - 1].treatedAvg
    if (first > 0) {
      pctChange = Math.round(((last - first) / first) * 100)
      direction = pctChange > 5 ? 'up' : pctChange < -5 ? 'down' : 'flat'
    }
  }

  return NextResponse.json({
    trend,
    direction,
    pctChange,
    totalSamples: samples.length,
    dateRange: trend.length > 0
      ? { from: trend[0].label, to: trend[trend.length - 1].label }
      : null,
  })
}
