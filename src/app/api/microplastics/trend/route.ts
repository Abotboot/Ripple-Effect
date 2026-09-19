import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readSamples, sampleReadHeaders } from '@/lib/sample-read'
import { reviewedConcentration } from '@/lib/sample-read-cohort'

// GET /api/microplastics/trend
// Returns microplastics levels over time (avg per quarter) for treated
// vs untreated water, so we can visualize whether levels are changing.
export async function GET() {

  const mp = await db.contaminant.findUnique({ where: { slug: 'microplastics' } })
  if (!mp) {
    return NextResponse.json({ error: 'Microplastics contaminant not found.' }, { status: 404 })
  }

  const { samples, dataStatus } = await readSamples({
      provenance: true, verificationStatus: true, source: true, quality: true,
      level: true,
      unit: true,
      sampleDate: true,
      treatmentStatus: true,
      utility: { select: { city: true, state: true } },
  }, {
    where: { contaminantId: mp.id },
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
  let reviewedSampleCount = 0

  for (const s of samples) {
    const level = reviewedConcentration(s, 'particles/l')
    if (level == null || !['Treated', 'Untreated'].includes(s.treatmentStatus)) continue
    const d = new Date(s.sampleDate)
    if (!Number.isFinite(d.getTime())) continue
    reviewedSampleCount++
    const year = d.getUTCFullYear()
    const month = d.getUTCMonth()
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
      entry.untreatedSum += level
      entry.untreatedCount++
    } else {
      entry.treatedSum += level
      entry.treatedCount++
    }
    if (level > entry.maxLevel) entry.maxLevel = level
  }

  const trend = Array.from(quarterMap.values())
    .sort((a, b) => a.quarter.localeCompare(b.quarter))
    .map((q) => ({
      quarter: q.quarter,
      label: q.label,
      treatedAvg: q.treatedCount > 0 ? +(q.treatedSum / q.treatedCount).toFixed(2) : null,
      untreatedAvg: q.untreatedCount > 0 ? +(q.untreatedSum / q.untreatedCount).toFixed(2) : null,
      treatedCount: q.treatedCount,
      untreatedCount: q.untreatedCount,
      maxLevel: +q.maxLevel.toFixed(2),
    }))

  // Compute overall trend direction (first vs last treated avg).
  const treatedValues = trend.flatMap(t => t.treatedAvg == null ? [] : [t.treatedAvg])
  let direction: 'up' | 'down' | 'flat' | null = null
  let pctChange: number | null = null
  if (treatedValues.length >= 2) {
    const first = treatedValues[0]
    const last = treatedValues[treatedValues.length - 1]
    if (first > 0) {
      pctChange = Math.round(((last - first) / first) * 100)
      direction = pctChange > 5 ? 'up' : pctChange < -5 ? 'down' : 'flat'
    }
  }

  return NextResponse.json({
    dataStatus,
    reviewedSampleCount,
    cohort: 'reviewed_institutional',
    unit: 'particles/l',
    trend,
    direction,
    pctChange,
    totalSamples: samples.length,
    dateRange: trend.length > 0
      ? { from: trend[0].label, to: trend[trend.length - 1].label }
      : null,
  }, { headers: sampleReadHeaders(dataStatus) })
}
