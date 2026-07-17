import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// POST /api/alerts - subscribe to email alerts.
// Body: { email, utilityId?, zipCode?, contaminantId?, threshold? }
// At least one of utilityId or zipCode must be provided.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }
  const email = String(body.email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  if (!body.utilityId && !body.zipCode) {
    return NextResponse.json({ error: 'Select a utility or enter a ZIP code.' }, { status: 400 })
  }

  // De-duplicate: if the same email already has an active sub for the same
  // utility + contaminant, just return success (idempotent).
  const existing = await db.alertSubscription.findFirst({
    where: {
      email,
      utilityId: body.utilityId ?? null,
      contaminantId: body.contaminantId ?? null,
      active: true,
    },
  })
  if (existing) {
    return NextResponse.json({ ok: true, alreadySubscribed: true, id: existing.id })
  }

  const created = await db.alertSubscription.create({
    data: {
      email,
      utilityId: body.utilityId ?? null,
      zipCode: body.zipCode ? String(body.zipCode).trim().slice(0, 16) : null,
      contaminantId: body.contaminantId ?? null,
      threshold: body.threshold != null ? Number(body.threshold) : null,
      active: true,
    },
  })
  return NextResponse.json({ ok: true, id: created.id }, { status: 201 })
}

// GET /api/alerts - list active subscriptions count (public, for display)
export async function GET() {
  const count = await db.alertSubscription.count({ where: { active: true } })
  return NextResponse.json({ count })
}
