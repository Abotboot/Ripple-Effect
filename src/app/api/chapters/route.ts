import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/chapters  - list all chapter signups (admin only)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const chapters = await db.chapter.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(chapters)
}

// POST /api/chapters - public signup to start a chapter
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.name || !body.email) {
    return NextResponse.json({ error: 'Name and email are required.' }, { status: 400 })
  }
  const email = String(body.email).trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Please enter a valid email.' }, { status: 400 })
  }

  const existing = await db.chapter.findUnique({ where: { email } }).catch(() => null)
  if (existing) {
    return NextResponse.json(
      { error: 'A chapter signup already exists for that email. We will be in touch!' },
      { status: 409 }
    )
  }

  const created = await db.chapter.create({
    data: {
      name: String(body.name).trim().slice(0, 120),
      email,
      chapterName: body.chapterName ? String(body.chapterName).trim().slice(0, 120) : null,
      city: body.city ? String(body.city).trim().slice(0, 120) : null,
      state: body.state ? String(body.state).trim().slice(0, 2).toUpperCase() : null,
      zipCode: body.zipCode ? String(body.zipCode).trim().slice(0, 16) : null,
      waterBody: body.waterBody ? String(body.waterBody).trim().slice(0, 200) : null,
      organization: body.organization ? String(body.organization).trim().slice(0, 200) : null,
      identifier: Boolean(body.identifier),
      message: body.message ? String(body.message).trim().slice(0, 2000) : null,
      status: 'pending',
    },
  })
  return NextResponse.json(created, { status: 201 })
}
