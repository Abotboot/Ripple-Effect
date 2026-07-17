import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/donations/[id] - update donation status (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const updated = await db.donation.update({
    where: { id },
    data: {
      ...(body.status ? { status: String(body.status) } : {}),
      ...(body.tier ? { tier: String(body.tier) } : {}),
    },
  })
  return NextResponse.json(updated)
}

// DELETE /api/donations/[id] - remove a donation record (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.donation.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
