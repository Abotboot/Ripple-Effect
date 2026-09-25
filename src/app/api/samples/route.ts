import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { readSamples, SAMPLE_READ_FIELDS, sampleReadHeaders } from '@/lib/sample-read'
import { publicSampleNotes } from '@/lib/reading-notes'

// GET /api/samples?utilityId=&contaminantId=&treatmentStatus=&limit=
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const utilityId = sp.get('utilityId')
  const contaminantId = sp.get('contaminantId')
  const treatmentStatus = sp.get('treatmentStatus')
  const requestedLimit = sp.get('limit') ?? '500'
  if (!/^\d+$/.test(requestedLimit) || Number(requestedLimit) < 1 || !Number.isSafeInteger(Number(requestedLimit))) {
    return NextResponse.json({ error: 'limit must be a positive integer' }, { status: 400 })
  }
  const limit = Math.min(Number(requestedLimit), 5000)

  const where: Record<string, unknown> = {}
  if (utilityId) where.utilityId = utilityId
  if (contaminantId) where.contaminantId = contaminantId
  if (treatmentStatus) where.treatmentStatus = treatmentStatus

  const { samples, dataStatus } = await readSamples({ ...SAMPLE_READ_FIELDS, contaminant: true, utility: true }, {
    where,
    orderBy: { sampleDate: 'desc' },
    take: limit,
  })

  // Contributor contact details never leave the server: drop every legacy
  // "reporter:" segment whole, splitting on the exact field separator.
  const sanitized = samples.map((s) => ({
    ...s,
    notes: publicSampleNotes(s.notes),
  }))

  return NextResponse.json(sanitized, { headers: sampleReadHeaders(dataStatus) })
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
      source: body.source ?? (body.robot ? 'Ripple Robot' : 'Unknown'),
      robot: body.robot === true,
      treatmentStatus: body.treatmentStatus ?? 'Treated',
      quality: body.quality ?? 'unreviewed',
      location: body.location ?? null,
      notes: body.notes ?? null,
    },
  })
  return NextResponse.json(created, { status: 201 })
}
