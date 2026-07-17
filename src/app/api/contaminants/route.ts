import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/contaminants  - list all contaminants.
// Ordering: microplastics FIRST (we track it; almost no one else does),
// then other contaminants we actively track, then regulated, then by name.
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')
  const where = category ? { category } : {}
  const contaminants = await db.contaminant.findMany({ where })

  const rank = (slug: string): number => {
    if (slug === 'microplastics') return 0
    return 1
  }
  contaminants.sort((a, b) => {
    const ra = rank(a.slug)
    const rb = rank(b.slug)
    if (ra !== rb) return ra - rb
    if (a.trackedByUs !== b.trackedByUs) return a.trackedByUs ? -1 : 1
    if (a.regulated !== b.regulated) return a.regulated ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  return NextResponse.json(contaminants)
}
