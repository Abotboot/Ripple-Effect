import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { reviewReading } from '@/lib/reading-review'

// POST /api/readings/[id]/review - admin only.
// Ask Jev again about one reading (after a fix, or when it was unreachable).
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const exists = await db.sample.findUnique({ where: { id }, select: { id: true } })
  if (!exists) return NextResponse.json({ error: 'Reading not found.' }, { status: 404 })

  const review = await reviewReading(id)
  return NextResponse.json({ id, review })
}
