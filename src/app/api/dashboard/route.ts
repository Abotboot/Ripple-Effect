import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'
import { computeSafetyScore } from '@/lib/safety-score'

// GET /api/dashboard
// Returns aggregated national water quality statistics for the public
// stats dashboard: safety score distribution, top exceedance contaminants,
// state rankings, and quality breakdown.
export async function GET() {
  await ensureSeeded()

  const [utilities, samples, contaminants] = await Promise.all([
    db.utility.findMany({
      select: {
        id: true, name: true, city: true, state: true, pwsid: true,
        population: true, latitude: true, longitude: true,
        samples: {
          select: {
            level: true, quality: true,
            contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true, category: true } },
          },
        },
      },
    }),
    db.sample.findMany({
      select: {
        level: true, quality: true, treatmentStatus: true,
        contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true, category: true } },
      },
    }),
    db.contaminant.findMany({ select: { id: true, name: true, slug: true, category: true, regulated: true, trackedByUs: true } }),
  ])

  // Safety score distribution
  const scoreBuckets = { a: 0, b: 0, c: 0, d: 0, f: 0 } // A: 90+, B: 80-89, C: 70-79, D: 60-69, F: <60
  const utilityScores: Array<{ id: string; name: string; city: string; state: string; score: number; grade: string; label: string }> = []

  for (const u of utilities) {
    let legalEx = 0, healthEx = 0, verified = 0, provisional = 0, citizen = 0
    const seenContam = new Set<string>()
    const seenLegal = new Set<string>()
    const seenHealth = new Set<string>()
    for (const s of u.samples) {
      seenContam.add(s.contaminant.id)
      const q = s.quality ?? 'verified'
      if (q === 'verified') verified++
      else if (q === 'provisional') provisional++
      else if (q === 'citizen') citizen++
      const hg = s.contaminant.healthGuideline
      const ll = s.contaminant.legalLimit
      const key = s.contaminant.id
      if (hg != null && hg > 0 && s.level > hg && !seenHealth.has(key)) { healthEx++; seenHealth.add(key) }
      if (ll != null && ll > 0 && s.level > ll && !seenLegal.has(key)) { legalEx++; seenLegal.add(key) }
    }
    const score = computeSafetyScore({
      legalExceedances: legalEx,
      healthExceedances: healthEx,
      totalContaminants: seenContam.size,
      totalSamples: u.samples.length,
      verifiedSamples: verified,
      provisionalSamples: provisional,
      citizenSamples: citizen,
    })
    if (score.score >= 90) scoreBuckets.a++
    else if (score.score >= 80) scoreBuckets.b++
    else if (score.score >= 70) scoreBuckets.c++
    else if (score.score >= 60) scoreBuckets.d++
    else scoreBuckets.f++
    utilityScores.push({
      id: u.id, name: u.name, city: u.city, state: u.state,
      score: score.score, grade: score.grade, label: score.label,
    })
  }

  // Top exceedance contaminants (by health exceedance count across all utilities)
  const exceedanceCounts = new Map<string, { name: string; slug: string; category: string; healthCount: number; legalCount: number }>()
  for (const s of samples) {
    const c = s.contaminant
    if (!exceedanceCounts.has(c.id)) {
      exceedanceCounts.set(c.id, { name: c.name, slug: c.slug, category: c.category, healthCount: 0, legalCount: 0 })
    }
    const entry = exceedanceCounts.get(c.id)!
    if (c.healthGuideline != null && c.healthGuideline > 0 && s.level > c.healthGuideline) entry.healthCount++
    if (c.legalLimit != null && c.legalLimit > 0 && s.level > c.legalLimit) entry.legalCount++
  }
  const topExceedances = Array.from(exceedanceCounts.values())
    .filter((e) => e.healthCount > 0 || e.legalCount > 0)
    .sort((a, b) => (b.healthCount + b.legalCount) - (a.healthCount + a.legalCount))
    .slice(0, 8)

  // State rankings (avg safety score per state)
  const stateMap = new Map<string, { total: number; count: number }>()
  for (const u of utilityScores) {
    const cur = stateMap.get(u.state) ?? { total: 0, count: 0 }
    cur.total += u.score
    cur.count++
    stateMap.set(u.state, cur)
  }
  const stateRankings = Array.from(stateMap.entries())
    .map(([state, { total, count }]) => ({ state, avgScore: Math.round(total / count), utilityCount: count }))
    .sort((a, b) => b.avgScore - a.avgScore)

  // Quality breakdown
  const qualityBreakdown = { verified: 0, provisional: 0, citizen: 0 }
  for (const s of samples) {
    const q = (s.quality ?? 'verified') as keyof typeof qualityBreakdown
    if (q in qualityBreakdown) qualityBreakdown[q]++
  }

  // Category breakdown (samples per contaminant category)
  const categoryMap = new Map<string, number>()
  for (const s of samples) {
    const cat = s.contaminant.category
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1)
  }
  const categoryBreakdown = Array.from(categoryMap.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  return NextResponse.json({
    scoreDistribution: scoreBuckets,
    topExceedances,
    stateRankings,
    qualityBreakdown,
    categoryBreakdown,
    totalUtilities: utilities.length,
    totalSamples: samples.length,
    totalContaminants: contaminants.length,
    trackedByUs: contaminants.filter((c) => c.trackedByUs).length,
    bestUtility: utilityScores.sort((a, b) => b.score - a.score)[0] ?? null,
    worstUtility: utilityScores.sort((a, b) => a.score - b.score)[0] ?? null,
  })
}
