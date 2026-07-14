import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// PATCH /api/reports/[id] - update status (admin only)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()
  const allowedStatus = ['pending', 'reviewed', 'resolved']
  const status = String(body.status)
  if (!allowedStatus.includes(status)) {
    return NextResponse.json(
      { error: `status must be one of: ${allowedStatus.join(', ')}` },
      { status: 400 }
    )
  }
  const updated = await db.report.update({ where: { id }, data: { status } })
  return NextResponse.json(updated)
}

// DELETE /api/reports/[id] (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.report.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
