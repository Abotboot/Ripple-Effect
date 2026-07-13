import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/samples?utilityId=&contaminantId=&treatmentStatus=&limit=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const utilityId = sp.get('utilityId')
  const contaminantId = sp.get('contaminantId')
  const treatmentStatus = sp.get('treatmentStatus')
  const limit = Math.min(parseInt(sp.get('limit') ?? '500'), 5000)

  const where: Record<string, unknown> = {}
  if (utilityId) where.utilityId = utilityId
  if (contaminantId) where.contaminantId = contaminantId
  if (treatmentStatus) where.treatmentStatus = treatmentStatus

  const samples = await db.sample.findMany({
    where,
    include: { contaminant: true, utility: true },
    orderBy: { sampleDate: 'desc' },
    take: limit,
  })

  return NextResponse.json(samples)
}

// POST /api/samples (admin only) - add a single measurement
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  if (!body?.utilityId || !body?.contaminantId || body?.level == null) {
    return NextResponse.json(
      { error: 'utilityId, contaminantId, and level are required' },
      { status: 400 }
    )
  }
  const created = await db.sample.create({
    data: {
      utilityId: body.utilityId,
      contaminantId: body.contaminantId,
      level: Number(body.level),
      unit: body.unit ?? 'ppb',
      sampleDate: body.sampleDate ? new Date(body.sampleDate) : new Date(),
      source: body.source ?? 'Utility CCR',
      treatmentStatus: body.treatmentStatus ?? 'Treated',
      location: body.location ?? null,
      notes: body.notes ?? null,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
