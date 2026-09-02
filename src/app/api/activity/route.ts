import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/activity - recent activity across the platform.
// Returns a unified feed of the latest samples, reports, chapter signups,
// and donations - sorted by date, newest first. Used by the home page
// "Recent activity" feed to show the site is alive.
export async function GET() {
  await ensureSeeded()

  const [samples, reports, chapters, donations] = await Promise.all([
    db.sample.findMany({
      take: 5,
      orderBy: { sampleDate: 'desc' },
      select: {
        id: true,
        level: true,
        unit: true,
        sampleDate: true,
        treatmentStatus: true,
        source: true,
        utility: { select: { name: true, city: true, state: true } },
        contaminant: { select: { name: true, slug: true, healthGuideline: true, legalLimit: true } },
      },
    }),
    db.report.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        severity: true,
        city: true,
        state: true,
        zipCode: true,
        contaminant: true,
        createdAt: true,
      },
    }),
    db.chapter.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        chapterName: true,
        city: true,
        state: true,
        waterBody: true,
        createdAt: true,
      },
    }),
    db.donation.findMany({
      take: 4,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        amount: true,
        tier: true,
        anonymous: true,
        message: true,
        createdAt: true,
      },
    }),
  ])

  type ActivityItem = {
    id: string
    type: 'sample' | 'report' | 'chapter' | 'donation'
    date: string
    title: string
    subtitle: string
    meta?: string
    tone: 'default' | 'warning' | 'ok' | 'info'
  }

  const items: ActivityItem[] = []

  for (const s of samples) {
    const c = s.contaminant
    const exceedsHealth =
      c.healthGuideline != null && c.healthGuideline > 0 && s.level > c.healthGuideline
    const exceedsLegal =
      c.legalLimit != null && c.legalLimit > 0 && s.level > c.legalLimit
    items.push({
      id: 'sample-' + s.id,
      type: 'sample',
      date: s.sampleDate.toISOString(),
      title: `${s.level.toFixed(2)} ${s.unit} ${c.name}`,
      subtitle: `${s.utility.name} · ${s.utility.city}, ${s.utility.state}`,
      meta: `${s.treatmentStatus} · ${s.source}`,
      tone: exceedsLegal ? 'warning' : exceedsHealth ? 'warning' : 'ok',
    })
  }

  for (const r of reports) {
    items.push({
      id: 'report-' + r.id,
      type: 'report',
      date: r.createdAt.toISOString(),
      title: r.title,
      subtitle: [r.city, r.state].filter(Boolean).join(', ') || `ZIP ${r.zipCode}`,
      meta: r.contaminant ? `re: ${r.contaminant}` : undefined,
      tone: r.severity === 'critical' ? 'warning' : r.severity === 'warning' ? 'info' : 'default',
    })
  }

  for (const c of chapters) {
    items.push({
      id: 'chapter-' + c.id,
      type: 'chapter',
      date: c.createdAt.toISOString(),
      title: `New chapter: ${c.chapterName || c.name}`,
      subtitle: [c.city, c.state].filter(Boolean).join(', ') || 'Location TBD',
      meta: c.waterBody ? `testing: ${c.waterBody}` : undefined,
      tone: 'info',
    })
  }

  for (const d of donations) {
    items.push({
      id: 'donation-' + d.id,
      type: 'donation',
      date: d.createdAt.toISOString(),
      title: `$${d.amount} ${d.tier} donation`,
      subtitle: d.anonymous ? 'Anonymous supporter' : d.name,
      meta: d.message ? `"${d.message.slice(0, 60)}${d.message.length > 60 ? '…' : ''}"` : undefined,
      tone: 'ok',
    })
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({
    items: items.slice(0, 12),
    counts: {
      samples: samples.length,
      reports: reports.length,
      chapters: chapters.length,
      donations: donations.length,
    },
  })
}
