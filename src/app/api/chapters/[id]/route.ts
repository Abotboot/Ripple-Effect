import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/chapters/[id] - update status (admin only)
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const updated = await db.chapter.update({
    where: { id },
    data: { status: String(body.status ?? 'pending') },
  })
  return NextResponse.json(updated)
}

// DELETE /api/chapters/[id] - remove a chapter signup (admin only)
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.chapter.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
