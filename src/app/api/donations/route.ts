import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/donations - list all donations (admin only)
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const donations = await db.donation.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(donations)
}

// POST /api/donations - public pledge submission (records intent + optional message)
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null)
  if (!body || !body.name || body.amount == null) {
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

  const created = await db.donation.create({
    data: {
      name: String(body.name).trim().slice(0, 120),
      email: body.email ? String(body.email).trim().slice(0, 200) : null,
      amount,
      tier,
      message: body.message ? String(body.message).trim().slice(0, 1000) : null,
      anonymous: Boolean(body.anonymous),
      status: 'pledged',
    },
  })
  return NextResponse.json(created, { status: 201 })
}
