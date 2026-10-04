import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { jevConfigured, jevModel, reviewPendingReadings } from '@/lib/reading-review'

// GET /api/readings/review - admin only. Whether Jev is set up.
export async function GET() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ configured: jevConfigured(), model: jevModel() })
}

// POST /api/readings/review - admin only.
// Ask Jev about everything still waiting (the backlog, or after an outage).
export async function POST() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!jevConfigured()) {
    return NextResponse.json({ error: 'Jev is not configured: set TYPESAFE_API_KEY on the server.' }, { status: 409 })
  }
  const counts = await reviewPendingReadings()
  return NextResponse.json(counts)
}
