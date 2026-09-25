import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/leaderboard
// Returns a chapter leaderboard: which chapters have submitted the most
// readings (samples via their city/region) + community reports + donations.
// Since chapters don't directly own samples yet (the identifier app is TBD),
// we rank by a blended score: reports filed from their region + their
// onboarding status + donations attributed. This is a starting point.
export async function GET() {

  // Only chapters the crew has onboarded are public, and only by chapter name:
  // applicants' personal names and pending/declined applications stay private.
  const [chapters, totalChapters] = await Promise.all([db.chapter.findMany({
    where: { status: { in: ['active', 'onboarded'] } },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      chapterName: true,
      city: true,
      state: true,
      waterBody: true,
      status: true,
      createdAt: true,
    },
  }), db.chapter.count()])

  // Count community reports by state (proxy for chapter activity in that region).
  const reports = await db.report.groupBy({
    by: ['state'],
    _count: { id: true },
  })
  const reportByState = new Map(reports.map((r) => [r.state ?? '', r._count.id]))

  // Count samples by utility state (proxy for data coverage), aggregated in
  // the database instead of loading every sample row.
  const [perUtility, utilities] = await Promise.all([
    db.sample.groupBy({ by: ['utilityId'], _count: { id: true } }),
    db.utility.findMany({ select: { id: true, state: true } }),
  ])
  const stateOf = new Map(utilities.map((u) => [u.id, u.state]))
  const sampleByState = new Map<string, number>()
  for (const row of perUtility) {
    const st = row.utilityId ? stateOf.get(row.utilityId) : undefined
    if (st) sampleByState.set(st, (sampleByState.get(st) ?? 0) + row._count.id)
  }

  const leaderboard = chapters.map((c) => {
    const st = c.state ?? ''
    const reportCount = reportByState.get(st) ?? 0
    const sampleCount = sampleByState.get(st) ?? 0
    // Score: 3 points per report from their state, 1 point per sample, +5 if active/onboarded.
    const statusBonus = c.status === 'active' ? 5 : c.status === 'onboarded' ? 3 : 0
    const score = reportCount * 3 + sampleCount + statusBonus
    return {
      ...c,
      chapterName: c.chapterName || (c.city ? `${c.city} chapter` : 'Community chapter'),
      reportCount,
      sampleCount,
      score,
    }
  })

  leaderboard.sort((a, b) => b.score - a.score)

  // Rank
  leaderboard.forEach((entry, i) => {
    ;(entry as typeof entry & { rank: number }).rank = i + 1
  })

  return NextResponse.json({
    leaderboard,
    totalChapters,
    activeChapters: chapters.filter((c) => c.status === 'active' || c.status === 'onboarded').length,
  })
}
