import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { db } from '@/lib/db'
import { sendDiscordReadingWebhook } from '@/lib/discord-webhook'
import { normalizeContactEmail } from '@/lib/reading-notes'
import { isMissingTable, parseCollectionPoint } from '@/lib/reading-contributors'
import { clientAddress, consumeThrottles, HOUR, MINUTE } from '@/lib/durable-throttle'

// Constant-time comparison so a wrong key leaks no timing information.
function robotKeyMatches(presented: string | null, expected: string | undefined): boolean {
  if (!presented || !expected) return false
  const a = Buffer.from(presented)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

// POST /api/readings - public citizen-science reading submission.
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
//  - accepts an optional collection point (latitude/longitude on the water,
//    plus the water body's name) so the reading can be drawn where it was taken
//  - rate-limits by client, by reporter email, and site-wide, in the database

const PER_CLIENT = { windowMs: 10 * MINUTE, max: 5 }
const PER_EMAIL = { windowMs: 24 * HOUR, max: 10 }
const SITE_WIDE = { windowMs: HOUR, max: 120 }
const TREATMENT = new Set(['Treated', 'Untreated', 'Mixed', 'Unknown'])

function sampleDateFrom(value: unknown): Date | null {
  if (value == null || value === '') return new Date()
  if (typeof value !== 'string' && typeof value !== 'number') return null
  const date = new Date(value)
  const time = date.getTime()
  // No dates before 1900 or more than a day ahead (timezone slack).
  if (!Number.isFinite(time) || time < Date.UTC(1900, 0, 1) || time > Date.now() + 24 * HOUR) return null
  return date
}

function unitFrom(value: unknown, fallback: string): string | null {
  if (value == null || value === '') return fallback
  if (typeof value !== 'string') return null
  const unit = value.trim()
  return unit && unit.length <= 24 ? unit : null
}

function textFrom(value: unknown, max: number): string | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null
  return String(value).trim().slice(0, max) || null
}

export async function POST(req: NextRequest) {

  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }
  const place = parseCollectionPoint(body)
  if (!place.ok) {
    return NextResponse.json({ error: place.error }, { status: 400 })
  }
  const sampleDate = sampleDateFrom(body.sampleDate)
  if (!sampleDate) {
    return NextResponse.json({ error: 'Collection date must be a valid date that is not in the future.' }, { status: 400 })
  }
  const treatmentStatus = body.treatmentStatus == null || body.treatmentStatus === '' ? 'Treated' : String(body.treatmentStatus)
  if (!TREATMENT.has(treatmentStatus)) {
    return NextResponse.json({ error: 'Treatment status must be Treated, Untreated, Mixed, or Unknown.' }, { status: 400 })
  }
  const location = textFrom(body.location, 120)

  // Honeypot check for bots/scanners
  if (body.website || body.honeypot || body.hp_check) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
  }

  // -- Robot ingestion path --
  // The A Ripple Effect identifier robot posts readings with the shared
  // secret in the X-Robot-Key header (ROBOT_API_KEY env var on the server).
  // Robot data is labeled distinctly (source='Ripple Robot', robot=true) so
  // the UI can separate our own robot's measurements from external sources.
  // It skips the citizen review queue as 'provisional'. If ROBOT_API_KEY is
  // not set on the server, this path is disabled and cannot be spoofed.
  const isRobot = robotKeyMatches(req.headers.get('x-robot-key'), process.env.ROBOT_API_KEY)
  if (isRobot) {
    const robotLevel = Number(body.level)
    if (!body.contaminantId || !Number.isFinite(robotLevel) || robotLevel < 0) {
      return NextResponse.json(
        { error: 'contaminantId and a non-negative level are required.' },
        { status: 400 }
      )
    }
    const robotContaminant = await db.contaminant.findUnique({
      where: { id: String(body.contaminantId) },
    })
    if (!robotContaminant) {
      return NextResponse.json({ error: 'Contaminant not found.' }, { status: 404 })
    }
    let robotUtilityId: string | null = null
    let robotUtilityName: string | null = null
    if (body.utilityId) {
      const robotUtility = await db.utility.findUnique({ where: { id: String(body.utilityId) } })
      if (!robotUtility) {
        return NextResponse.json({ error: 'Utility not found.' }, { status: 404 })
      }
      robotUtilityId = robotUtility.id
      robotUtilityName = robotUtility.name
    }
    const robotUnit = unitFrom(body.unit, robotContaminant.legalLimitUnit ?? robotContaminant.healthGuidelineUnit ?? 'ppb')
    if (!robotUnit) {
      return NextResponse.json({ error: 'Unit must be a short text label.' }, { status: 400 })
    }
    const robotData = {
      utilityId: robotUtilityId,
      contaminantId: robotContaminant.id,
      level: robotLevel,
      unit: robotUnit,
      sampleDate,
      source: 'Ripple Robot',
      robot: true,
      treatmentStatus,
      location,
      quality: 'provisional',
      notes: body.deviceId ? `device:${String(body.deviceId).slice(0, 60)}` : null,
    }
    const robotCreated = await db.sample.create({
      data: place.point ? { ...robotData, collectionPoint: { create: place.point } } : robotData,
    }).catch(error => {
      if (!place.point || !isMissingTable(error)) throw error
      return db.sample.create({ data: robotData })
    })
    await sendDiscordReadingWebhook({
      contaminantName: robotContaminant.name,
      level: robotLevel,
      unit: robotUnit,
      location: place.point?.waterBody ?? location,
      reporterName: '🤖 Ripple Robot' + (body.deviceId ? ` (${String(body.deviceId).slice(0, 40)})` : ''),
      utilityName: robotUtilityName || body.utilityName || null,
      notes: body.notes,
      reviewState: 'provisional-device',
    })
    return NextResponse.json(
      { ok: true, id: robotCreated.id, message: 'Robot reading recorded.', robot: true },
      { status: 201 }
    )
  }

  // Required fields
  if (!body.contaminantId || body.level == null || body.level === '') {
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

  const email = normalizeContactEmail(body.reporterEmail)
  if (!email) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  const reporterName = textFrom(body.reporterName, 80)
  if (!reporterName) {
    return NextResponse.json({ error: 'Your name and email are required so we can verify the reading.' }, { status: 400 })
  }

  const level = Number(body.level)
  if (!Number.isFinite(level) || level < 0) {
    return NextResponse.json({ error: 'Level must be a non-negative number.' }, { status: 400 })
  }

  const limit = await consumeThrottles([
    ['readings:client', clientAddress(req), PER_CLIENT],
    ['readings:email', email, PER_EMAIL],
    ['readings:site', 'all', SITE_WIDE],
  ])
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions right now. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
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
  let utilityName: string | null = null
  if (body.utilityId) {
    const utility = await db.utility.findUnique({ where: { id: String(body.utilityId) } })
    if (!utility) {
      return NextResponse.json({ error: 'Utility not found.' }, { status: 404 })
    }
    utilityId = utility.id
    utilityName = utility.name
  }

  const unit = unitFrom(body.unit, contaminant.legalLimitUnit ?? contaminant.healthGuidelineUnit ?? 'ppb')
  if (!unit) {
    return NextResponse.json({ error: 'Unit must be a short text label.' }, { status: 400 })
  }
  const userNotes = textFrom(body.notes, 500)

  const base = {
    utilityId,
    contaminantId: contaminant.id,
    level,
    unit,
    sampleDate,
    source: 'Citizen Test',
    treatmentStatus,
    location,
    quality: 'citizen',
  }
  // Contact details live in SampleContributor, never in the public notes.
  // Until that table exists, fall back to the legacy notes format; the strict
  // email rules above keep '|' out of it, and public reads drop the segment.
  const created = await db.sample.create({
    data: {
      ...base,
      notes: userNotes,
      contributor: { create: { email, name: reporterName } },
      ...(place.point ? { collectionPoint: { create: place.point } } : {}),
    },
  }).catch(error => {
    if (!isMissingTable(error)) throw error
    const legacy = [`reporter:${email}`, `name:${reporterName}`]
    if (location) legacy.push(`location:${location}`)
    if (userNotes) legacy.push(`notes:${userNotes}`)
    return db.sample.create({ data: { ...base, notes: legacy.join(' | ') } })
  })

  // Queue/receipt notification only. A public citizen submission is unreviewed
  // evidence and cannot trigger a threshold/safety alert from its raw value.
  await sendDiscordReadingWebhook({
    contaminantName: contaminant.name,
    level,
    unit,
    location: place.point?.waterBody ?? location,
    reporterName,
    utilityName: utilityName || (utilityId ? 'Mapped Utility' : null),
    notes: userNotes,
    reviewState: 'unreviewed',
  })

  return NextResponse.json(
    { ok: true, id: created.id, message: 'Citizen reading recorded. Thank you!' },
    { status: 201 }
  )
}

