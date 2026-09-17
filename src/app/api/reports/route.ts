import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendDiscordReportWebhook } from '@/lib/discord-webhook'
import { checkRateLimit } from '@/lib/rate-limit'

// GET /api/reports - list all community reports (newest first)
export async function GET(req: NextRequest) {
  const status = req.nextUrl.searchParams.get('status')
  const where = status ? { status } : {}
  const reports = await db.report.findMany({
    where,
    include: { utility: { select: { name: true, city: true, state: true } } },
    orderBy: { createdAt: 'desc' },
  })
  // Strip reporterEmail to protect user privacy
  const sanitized = reports.map(({ reporterEmail: _omit, ...rest }) => rest)
  return NextResponse.json(sanitized)
}

// POST /api/reports - public submission (rate-limited, no auth required)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Honeypot check for automated bot scrapers/scanners
  if (body.website || body.honeypot || body.hp_check) {
    return NextResponse.json({ error: 'Submission rejected.' }, { status: 400 })
  }

  // IP rate-limiting (max 5 submissions per 10 minutes)
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip') || 'unknown'
  if (!checkRateLimit(`report:${ip}`, { windowMs: 10 * 60 * 1000, max: 5 })) {
    return NextResponse.json(
      { error: 'Too many submissions. Please wait 10 minutes before submitting again.' },
      { status: 429 }
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
    ? String(body.reporterEmail).slice(0, 200)
    : null
  const reporterName = body.reporterName
    ? String(body.reporterName).slice(0, 100)
    : null

  const created = await db.report.create({
    data: {
      utilityId: body.utilityId ?? null,
      reporterName,
      reporterEmail,
      zipCode: String(body.zipCode).slice(0, 20),
      city: body.city ? String(body.city).slice(0, 100) : null,
      state: body.state ? String(body.state).slice(0, 20) : null,
      title,
      description,
      contaminant: body.contaminant ? String(body.contaminant).slice(0, 100) : null,
      appearance: body.appearance ?? 'normal',
      severity: body.severity ?? 'info',
      status: 'pending',
    },
  })

  // Dispatch real-time report to Discord webhook
  await sendDiscordReportWebhook(created)

  return NextResponse.json(created, { status: 201 })
}

