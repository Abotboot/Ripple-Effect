import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { normalizeContactEmail } from '@/lib/reading-notes'
import { clientAddress, consumeThrottles, HOUR, MINUTE } from '@/lib/durable-throttle'

// One reply for new and existing subscriptions. Without proof that the caller
// controls the mailbox, the response must not reveal whether it already had
// alerts, and never returns a record ID.
const ACCEPTED = { ok: true, message: 'Alert request received for this address.' }

const PER_CLIENT = { windowMs: 10 * MINUTE, max: 5 }
const PER_EMAIL = { windowMs: 24 * HOUR, max: 10 }
const SITE_WIDE = { windowMs: HOUR, max: 200 }

function optionalId(value: unknown): string | null | undefined {
  if (value == null || value === '') return null
  return typeof value === 'string' && value.length <= 64 ? value : undefined
}

// POST /api/alerts - subscribe to email alerts.
// Body: { email, utilityId?, zipCode?, contaminantId?, threshold? }
// At least one of utilityId or zipCode must be provided.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || !body.email) {
    return NextResponse.json({ error: 'Email is required.' }, { status: 400 })
  }

  // Honeypot check for automated bot scrapers/scanners
  if (body.website || body.honeypot || body.hp_check) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
  }

  const email = normalizeContactEmail(body.email)
  if (!email) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  const utilityId = optionalId(body.utilityId)
  const contaminantId = optionalId(body.contaminantId)
  const zipCode = typeof body.zipCode === 'string' || typeof body.zipCode === 'number'
    ? String(body.zipCode).trim().slice(0, 16) || null
    : null
  if (utilityId === undefined || contaminantId === undefined) {
    return NextResponse.json({ error: 'Invalid alert selection.' }, { status: 400 })
  }
  if (!utilityId && !zipCode) {
    return NextResponse.json({ error: 'Select a utility or enter a ZIP code.' }, { status: 400 })
  }
  if (zipCode && !/^[0-9A-Za-z -]{3,16}$/.test(zipCode)) {
    return NextResponse.json({ error: 'Please enter a valid ZIP code.' }, { status: 400 })
  }
  const threshold = body.threshold == null || body.threshold === '' ? null : Number(body.threshold)
  if (threshold !== null && (!Number.isFinite(threshold) || threshold < 0)) {
    return NextResponse.json({ error: 'Threshold must be a non-negative number.' }, { status: 400 })
  }

  const limit = await consumeThrottles([
    ['alerts:client', clientAddress(req), PER_CLIENT],
    ['alerts:email', email, PER_EMAIL],
    ['alerts:site', 'all', SITE_WIDE],
  ])
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many subscriptions. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  if (utilityId && !(await db.utility.findUnique({ where: { id: utilityId }, select: { id: true } }))) {
    return NextResponse.json({ error: 'Utility not found.' }, { status: 404 })
  }
  if (contaminantId && !(await db.contaminant.findUnique({ where: { id: contaminantId }, select: { id: true } }))) {
    return NextResponse.json({ error: 'Contaminant not found.' }, { status: 404 })
  }

  // Idempotent: an identical active subscription is left as it is.
  const existing = await db.alertSubscription.findFirst({
    where: { email, utilityId, zipCode, contaminantId, active: true },
    select: { id: true },
  })
  if (!existing) {
    await db.alertSubscription.create({
      data: { email, utilityId, zipCode, contaminantId, threshold, active: true },
    })
  }
  return NextResponse.json(ACCEPTED, { status: 202 })
}

// GET /api/alerts - list active subscriptions count (public, for display)
export async function GET() {
  const count = await db.alertSubscription.count({ where: { active: true } })
  return NextResponse.json({ count })
}
