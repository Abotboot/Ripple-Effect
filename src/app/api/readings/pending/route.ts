import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/readings/pending - admin only.
// Returns all citizen-quality samples for moderation, newest first.
// Includes parsed reporter info from the notes field.
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const readings = await db.sample.findMany({
    where: { quality: 'citizen' },
    orderBy: { createdAt: 'desc' },
    take: 200,
    select: {
      id: true,
      level: true,
      unit: true,
      source: true,
      location: true,
      treatmentStatus: true,
      sampleDate: true,
      createdAt: true,
      notes: true,
      quality: true,
      contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, legalLimit: true } },
      utility: { select: { id: true, name: true, city: true, state: true } },
    },
  })

  const items = readings.map((r) => {
    let reporterEmail = ''
    let reporterName = ''
    let userNotes = ''
    if (r.notes) {
      const emailMatch = r.notes.match(/reporter:([^|]+)/)
      if (emailMatch) reporterEmail = emailMatch[1].trim()
      const nameMatch = r.notes.match(/name:([^|]+)/)
      if (nameMatch) reporterName = nameMatch[1].trim()
      const notesMatch = r.notes.match(/notes:([^|]+)/)
      if (notesMatch) userNotes = notesMatch[1].trim()
    }
    return {
      ...r,
      reporterEmail,
      reporterName,
      userNotes,
      notes: undefined, // don't re-send the raw notes blob
    }
  })

  return NextResponse.json({ items, count: items.length })
}
