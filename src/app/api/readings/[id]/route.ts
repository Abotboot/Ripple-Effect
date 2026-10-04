import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { recordAdminDecision, type ReviewDecision } from '@/lib/reading-review'

const DECISIONS = new Set<ReviewDecision>(['publish', 'hold', 'reject'])

// PATCH /api/readings/[id] - admin only.
// An admin's call on a submitted reading, overruling Jev when they differ.
// Body: { decision: 'publish' | 'hold' | 'reject' }
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
  const decision = String(body.decision ?? '') as ReviewDecision
  if (!DECISIONS.has(decision)) {
    return NextResponse.json({ error: 'decision must be publish, hold or reject.' }, { status: 400 })
  }
  const exists = await db.sample.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Reading not found.' }, { status: 404 })

  const review = await recordAdminDecision(id, decision, admin)
  return NextResponse.json({ id, review })
}

// DELETE /api/readings/[id] - admin only, remove a reading
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
