import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/leaderboard
// Returns a chapter leaderboard: which chapters have submitted the most
// readings (samples via their city/region) + community reports + donations.
// Since chapters don't directly own samples yet (the identifier app is TBD),
// we rank by a blended score: reports filed from their region + their
// onboarding status + donations attributed. This is a starting point.
export async function GET() {
  await ensureSeeded()

  const chapters = await db.chapter.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      chapterName: true,
      city: true,
      state: true,
      waterBody: true,
      status: true,
      createdAt: true,
    },
  })

  // Count community reports by state (proxy for chapter activity in that region).
  const reports = await db.report.groupBy({
    by: ['state'],
    _count: { id: true },
  })
  const reportByState = new Map(reports.map((r) => [r.state ?? '', r._count.id]))

  // Count samples by utility state (proxy for data coverage).
  const samples = await db.sample.findMany({
    select: { utility: { select: { state: true } } },
  })
  const sampleByState = new Map<string, number>()
  for (const s of samples) {
    const st = s.utility.state
    sampleByState.set(st, (sampleByState.get(st) ?? 0) + 1)
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
    totalChapters: chapters.length,
    activeChapters: chapters.filter((c) => c.status === 'active' || c.status === 'onboarded').length,
  })
}
