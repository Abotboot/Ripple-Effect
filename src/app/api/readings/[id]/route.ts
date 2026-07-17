import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/readings/[id]
// Admin moderation: update a citizen reading's quality (promote to
// 'provisional' or 'verified') or delete it. Body: { quality?: 'citizen'|'provisional'|'verified' }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const data: { quality?: string } = {}
  if (body.quality && ['citizen', 'provisional', 'verified'].includes(String(body.quality))) {
    data.quality = String(body.quality)
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 })
  }

  const updated = await db.sample.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/readings/[id] — admin only, remove a reading
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.sample.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
