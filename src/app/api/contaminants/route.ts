import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/contaminants  - list all contaminants
export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get('category')
  const where = category ? { category } : {}
  const contaminants = await db.contaminant.findMany({
    where,
    orderBy: [{ regulated: 'desc' }, { name: 'asc' }],
  })
  return NextResponse.json(contaminants)
}
