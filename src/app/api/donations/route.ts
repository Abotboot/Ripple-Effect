import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { normalizeContactEmail } from '@/lib/reading-notes'
import { clientAddress, consumeThrottles, HOUR, MINUTE } from '@/lib/durable-throttle'

// GET /api/donations - list all donations (admin only)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const donations = await db.donation.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(donations)
}

// POST /api/donations - public pledge submission (rate-limited, records intent + optional message)
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
    ['donations:client', clientAddress(req), { windowMs: 10 * MINUTE, max: 5 }],
    ['donations:site', 'all', { windowMs: HOUR, max: 60 }],
  ])
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions right now. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  if (!body.name || body.amount == null) {
    return NextResponse.json({ error: 'Name and amount are required.' }, { status: 400 })
  }
  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount < 1) {
    return NextResponse.json({ error: 'Please enter a valid amount.' }, { status: 400 })
  }

  const tiers: Array<[number, string]> = [
    [1000, 'Founding'],
    [250, 'Champion'],
    [50, 'Friend'],
    [1, 'Supporter'],
  ]
  const tier = tiers.find(([min]) => amount >= min)?.[1] ?? 'Supporter'

  const email = body.email ? normalizeContactEmail(body.email) : null
  if (body.email && !email) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  if (amount > 1_000_000) {
    return NextResponse.json({ error: 'Please enter a valid amount.' }, { status: 400 })
  }

  const created = await db.donation.create({
    data: {
      name: String(body.name).trim().slice(0, 120),
      email,
      amount,
      tier,
      message: body.message ? String(body.message).trim().slice(0, 1000) : null,
      anonymous: Boolean(body.anonymous),
      status: 'pledged',
    },
  })
  return NextResponse.json({ id: created.id, amount: created.amount, tier: created.tier, status: created.status }, { status: 201 })
}
