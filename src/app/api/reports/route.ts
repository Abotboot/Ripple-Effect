import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendDiscordReportWebhook } from '@/lib/discord-webhook'
import { normalizeContactEmail } from '@/lib/reading-notes'
import { clientAddress, consumeThrottles, HOUR, MINUTE } from '@/lib/durable-throttle'

// GET /api/reports - list all community reports (newest first)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  const where = status ? { status: String(status).slice(0, 20) } : {}
  const reports = await db.report.findMany({
    where,
    include: { utility: { select: { name: true, city: true, state: true } } },
    orderBy: { createdAt: 'desc' },
    take: 500,
  })
  // Strip reporterEmail to protect user privacy
  const sanitized = reports.map(({ reporterEmail: _omit, ...rest }) => rest)
  return NextResponse.json(sanitized)
}

// POST /api/reports - public submission (rate-limited, no auth required)
const APPEARANCES = new Set(['normal', 'cloudy', 'discolored', 'odor', 'taste'])
const SEVERITIES = new Set(['info', 'warning', 'critical'])

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Honeypot check for automated bot scrapers/scanners
  if (body.website || body.honeypot || body.hp_check) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
  }

  const limit = await consumeThrottles([
    ['reports:client', clientAddress(req), { windowMs: 10 * MINUTE, max: 5 }],
    ['reports:site', 'all', { windowMs: HOUR, max: 120 }],
  ])
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many submissions right now. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    )
  }

  if (!body?.zipCode || !body?.title || !body?.description) {
    return NextResponse.json(
      { error: 'zipCode, title, and description are required' },
      { status: 400 }
    )
  }
  // Basic rate-limit-ish sanity: cap field lengths
  const title = String(body.title).slice(0, 200)
  const description = String(body.description).slice(0, 4000)
  const reporterEmail = body.reporterEmail
    ? normalizeContactEmail(body.reporterEmail)
    : null
  if (body.reporterEmail && !reporterEmail) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }
  const reporterName = body.reporterName
    ? String(body.reporterName).slice(0, 100)
    : null
  const appearance = body.appearance == null || body.appearance === '' ? 'normal' : String(body.appearance)
  const severity = body.severity == null || body.severity === '' ? 'info' : String(body.severity)
  if (!APPEARANCES.has(appearance) || !SEVERITIES.has(severity)) {
    return NextResponse.json({ error: 'Choose a listed appearance and severity.' }, { status: 400 })
  }
  let utilityId: string | null = null
  if (body.utilityId) {
    const utility = typeof body.utilityId === 'string'
      ? await db.utility.findUnique({ where: { id: body.utilityId }, select: { id: true } })
      : null
    if (!utility) return NextResponse.json({ error: 'Utility not found.' }, { status: 404 })
    utilityId = utility.id
  }

  const created = await db.report.create({
    data: {
      utilityId,
      reporterName,
      reporterEmail,
      zipCode: String(body.zipCode).slice(0, 20),
      city: body.city ? String(body.city).slice(0, 100) : null,
      state: body.state ? String(body.state).slice(0, 20) : null,
      title,
      description,
      contaminant: body.contaminant ? String(body.contaminant).slice(0, 100) : null,
      appearance,
      severity,
      status: 'pending',
    },
  })

  // Dispatch real-time report to Discord webhook
  await sendDiscordReportWebhook(created)

  const { reporterEmail: _private, ...publicReport } = created
  return NextResponse.json(publicReport, { status: 201 })
}

