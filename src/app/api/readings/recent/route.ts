import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/readings/recent
// Returns recent citizen-submitted readings for the public home feed.
// Only returns quality='citizen' samples (not lab/utility data - those are
// already shown in other feeds). Includes the contaminant + utility info
// for display, and parses the reporter name out of the notes field.
export async function GET() {
  await ensureSeeded()

  const readings = await db.sample.findMany({
    where: { quality: 'citizen' },
    take: 12,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      level: true,
      unit: true,
      location: true,
      treatmentStatus: true,
      sampleDate: true,
      createdAt: true,
      notes: true,
      contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true } },
      utility: { select: { id: true, name: true, city: true, state: true } },
    },
  })

  // Parse reporter name from notes (format: "reporter:email | name:Jane | ...")
  const items = readings.map((r) => {
    let reporterName = 'Anonymous'
    if (r.notes) {
      const m = r.notes.match(/name:([^|]+)/)
      if (m) reporterName = m[1].trim()
    }
    const c = r.contaminant
    const exceedsHealth =
      c.healthGuideline != null && c.healthGuideline > 0 && r.level > c.healthGuideline
    const exceedsLegal =
      c.legalLimit != null && c.legalLimit > 0 && r.level > c.legalLimit
    return {
      id: r.id,
      level: r.level,
      unit: r.unit,
      location: r.location,
      treatmentStatus: r.treatmentStatus,
      sampleDate: r.sampleDate.toISOString(),
      createdAt: r.createdAt.toISOString(),
      reporterName,
      contaminant: { name: c.name, slug: c.slug },
      utility: r.utility
        ? { name: r.utility.name, city: r.utility.city, state: r.utility.state }
        : null,
      exceedsHealth,
      exceedsLegal,
    }
  })

  return NextResponse.json({ items, count: items.length })
}
