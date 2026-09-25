import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { normalizeContactEmail } from '@/lib/reading-notes'
import { clientAddress, consumeThrottles, HOUR } from '@/lib/durable-throttle'

// GET /api/chapters  - list all chapter signups (admin only)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const chapters = await db.chapter.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(chapters)
}

// Unverified public signups are bounded three ways: per client, per email,
// and a site-wide hourly ceiling that holds even if client addresses rotate.
const PER_CLIENT = { windowMs: HOUR, max: 3 }
const PER_EMAIL = { windowMs: 24 * HOUR, max: 3 }
const SITE_WIDE = { windowMs: HOUR, max: 40 }

// The same reply for new and existing emails, so the endpoint cannot be used
// to discover who has signed up.
const ACCEPTED = { ok: true, message: 'Thanks! If this is a new signup, the crew will reach out by email.' }

// POST /api/chapters - public signup to start a chapter
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || !body.name || !body.email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
  }
  if (body.website || body.honeypot || body.hp_check) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
  }
  const email = normalizeContactEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const limit = await consumeThrottles([
    ['chapters:client', clientAddress(req), PER_CLIENT],
    ['chapters:email', email, PER_EMAIL],
    ['chapters:site', 'all', SITE_WIDE],
  ])
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many signups right now. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  const text = (value: unknown, max: number) => {
    if (typeof value !== 'string' && typeof value !== 'number') return null
    const trimmed = String(value).trim().slice(0, max)
    return trimmed || null
  }
  const name = text(body.name, 120)
  if (!name) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
  }

  const existing = await db.chapter.findUnique({ where: { email }, select: { id: true } })
  if (!existing) {
    await db.chapter.create({
      data: {
        name,
        email,
        chapterName: text(body.chapterName, 120),
        city: text(body.city, 120),
        state: text(body.state, 2)?.toUpperCase() ?? null,
        zipCode: text(body.zipCode, 16),
        waterBody: text(body.waterBody, 200),
        organization: text(body.organization, 200),
        identifier: body.identifier === true,
        message: text(body.message, 2000),
        status: 'pending',
      },
    }).catch((error: { code?: string }) => {
      // A concurrent duplicate lands here; the reply stays identical.
      if (error?.code !== 'P2002') throw error
    })
  }
  return NextResponse.json(ACCEPTED, { status: 202 })
}
