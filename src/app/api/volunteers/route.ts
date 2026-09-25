import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { normalizeContactEmail } from '@/lib/reading-notes'
import { clientAddress, consumeThrottles, HOUR, MINUTE } from '@/lib/durable-throttle'

// GET /api/volunteers - list all volunteers (admin only)
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const status = req.nextUrl.searchParams.get('status')
  const where = status ? { status } : {}
  const volunteers = await db.volunteer.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(volunteers)
}

// POST /api/volunteers - public signup (rate-limited, no auth required)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body.' }, { status: 400 })
  }

  // Honeypot check for bots/scanners
  if (body.website || body.honeypot || body.hp_check) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
  }

  const limit = await consumeThrottles([
    ['volunteers:client', clientAddress(req), { windowMs: 10 * MINUTE, max: 5 }],
    ['volunteers:site', 'all', { windowMs: HOUR, max: 40 }],
  ])
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions right now. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  if (!body?.name || !body?.email) {
    return NextResponse.json(
      { error: 'name and email are required' },
      { status: 400 }
    )
  }

  const name = String(body.name).trim().slice(0, 100)
  const email = normalizeContactEmail(body.email)
  if (!name || !email) {
    return NextResponse.json({ error: 'Please enter your name and a valid email.' }, { status: 400 })
  }
  const validRoles = ['Engineering', 'Coding', 'Social Media', 'Public Relations', 'General']
  const role = validRoles.includes(body.role) ? body.role : 'General'

  // One reply whether or not the email was already registered, so the form
  // cannot be used to check who has signed up.
  await db.volunteer.create({
    data: {
      name,
      email,
      zipCode: body.zipCode ? String(body.zipCode).slice(0, 20) : null,
      city: body.city ? String(body.city).slice(0, 100) : null,
      state: body.state ? String(body.state).slice(0, 20) : null,
      role,
      skills: body.skills ? String(body.skills).slice(0, 500) : null,
      availability: body.availability ? String(body.availability).slice(0, 100) : null,
      message: body.message ? String(body.message).slice(0, 2000) : null,
      status: 'pending',
    },
  }).catch((error: { code?: string }) => {
    if (error?.code !== 'P2002') throw error
  })
  return NextResponse.json({ ok: true, message: 'Thanks for volunteering! The crew will reach out by email.' }, { status: 202 })
}
