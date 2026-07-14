import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

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

// POST /api/volunteers - public signup (no auth required)
export async function POST(req: NextRequest) {
  const body = await req.json()
  if (!body?.name || !body?.email) {
    return NextResponse.json(
      { error: 'name and email are required' },
      { status: 400 }
    )
  }

  const name = String(body.name).slice(0, 100)
  const email = String(body.email).toLowerCase().trim().slice(0, 200)
  const validRoles = ['Engineering', 'Coding', 'Social Media', 'Public Relations', 'General']
  const role = validRoles.includes(body.role) ? body.role : 'General'

  try {
    const created = await db.volunteer.create({
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
    })
    return NextResponse.json(created, { status: 201 })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    if (msg.includes('Unique constraint')) {
      return NextResponse.json(
        { error: 'Someone has already signed up with that email. Want to update your info? Contact hello@aquaguard.org.' },
        { status: 409 }
      )
    }
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}
