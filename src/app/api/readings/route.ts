import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// POST /api/readings — public citizen-science reading submission.
// Creates a Sample with quality='citizen'. This is the public entry point
// for chapters and community members to push microplastics identifier
// readings (and other field measurements) into the database.
//
// Unlike POST /api/samples (admin-only), this endpoint:
//  - is public (no auth)
//  - forces quality='citizen'
//  - forces source='Citizen Test'
//  - allows optional utilityId (so readings can be tied to a known utility)
//    OR a free-text location string (for unmapped water bodies)
//  - rate-limits by reporter email (max 10 pending readings per email)

export async function POST(req: NextRequest) {
  await ensureSeeded()

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Required fields
  if (!body.contaminantId || body.level == null) {
    return NextResponse.json(
      { error: 'Contaminant and measured level are required.' },
      { status: 400 }
    )
  }
  if (!body.reporterName || !body.reporterEmail) {
    return NextResponse.json(
      { error: 'Your name and email are required so we can verify the reading.' },
      { status: 400 }
    )
  }

  const email = String(body.reporterEmail).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const level = Number(body.level)
  if (!Number.isFinite(level) || level < 0) {
    return NextResponse.json({ error: 'Level must be a non-negative number.' }, { status: 400 })
  }

  // Verify the contaminant exists
  const contaminant = await db.contaminant.findUnique({
    where: { id: String(body.contaminantId) },
  })
  if (!contaminant) {
    return NextResponse.json({ error: 'Contaminant not found.' }, { status: 404 })
  }

  // Optional: verify the utility exists if provided
  let utilityId: string | null = null
  if (body.utilityId) {
    const utility = await db.utility.findUnique({ where: { id: String(body.utilityId) } })
    if (!utility) {
      return NextResponse.json({ error: 'Utility not found.' }, { status: 404 })
    }
    utilityId = utility.id
  }

  // Rate-limit: max 10 citizen readings per email in the last 24h
  const since = new Date(Date.now() - 24 * 3600_000)
  const recentCount = await db.sample.count({
    where: {
      notes: { contains: `reporter:${email}` },
      createdAt: { gte: since },
    },
  })
  if (recentCount >= 10) {
    return NextResponse.json(
      { error: 'Rate limit reached: max 10 citizen readings per email per 24 hours. Please try again tomorrow.' },
      { status: 429 }
    )
  }

  // Build the notes field to store reporter metadata (since the Sample model
  // doesn't have dedicated reporter fields — this keeps the schema simple
  // while still recording who submitted it for verification follow-up).
  const notesParts = [
    `reporter:${email}`,
    `name:${String(body.reporterName).trim().slice(0, 80)}`,
  ]
  if (body.location) notesParts.push(`location:${String(body.location).trim().slice(0, 120)}`)
  if (body.notes) notesParts.push(`notes:${String(body.notes).trim().slice(0, 500)}`)
  const notes = notesParts.join(' | ')

  const created = await db.sample.create({
    data: {
      utilityId: utilityId ?? '', // empty string if no utility — TODO: consider nullable later
      contaminantId: contaminant.id,
      level,
      unit: body.unit ?? contaminant.legalLimitUnit ?? contaminant.healthGuidelineUnit ?? 'ppb',
      sampleDate: body.sampleDate ? new Date(body.sampleDate) : new Date(),
      source: 'Citizen Test',
      treatmentStatus: body.treatmentStatus ?? 'Treated',
      location: body.location ? String(body.location).trim().slice(0, 120) : null,
      quality: 'citizen',
      notes,
    },
  })

  return NextResponse.json(
    { ok: true, id: created.id, message: 'Citizen reading recorded. Thank you!' },
    { status: 201 }
  )
}
