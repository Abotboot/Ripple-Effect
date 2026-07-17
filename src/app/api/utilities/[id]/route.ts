import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'
import { buildContaminantSummary } from '@/lib/aggregate'
import { computeSafetyScore } from '@/lib/safety-score'
import type { UtilityWithStats } from '@/lib/types'
import type { Sample, Contaminant } from '@prisma/client'

// GET /api/utilities/[id] - returns the utility with contaminant summaries
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const utility = await db.utility.findUnique({ where: { id } })
  if (!utility) {
    return NextResponse.json({ error: 'Utility not found' }, { status: 404 })
  }

  const samples = await db.sample.findMany({
    where: { utilityId: id },
    include: { contaminant: true },
  })

  // Group samples by contaminant
  type SampleWithC = Sample & { contaminant: Contaminant }
  const byContaminant = new Map<string, SampleWithC[]>()
  for (const s of samples) {
    const arr = byContaminant.get(s.contaminantId) ?? []
    arr.push(s as SampleWithC)
    byContaminant.set(s.contaminantId, arr)
  }

  const contaminantSummaries = Array.from(byContaminant.entries()).map(
    ([, ss]) => {
      const first = ss[0]
      const cont = first.contaminant
      // strip contaminant from each sample for the aggregator
      const plainSamples: Sample[] = ss.map(({ contaminant: _c, ...rest }) => rest as Sample)
      return buildContaminantSummary(cont, plainSamples)
    }
  )

  // Sort: exceedances first, then by health ratio desc
  contaminantSummaries.sort((a, b) => {
    if (a.exceedsLegalLimit && !b.exceedsLegalLimit) return -1
    if (!a.exceedsLegalLimit && b.exceedsLegalLimit) return 1
    const aH = a.healthRatio ?? 0
    const bH = b.healthRatio ?? 0
    return bH - aH
  })

  const exceedances = contaminantSummaries.filter((s) => s.exceedsLegalLimit).length
  const healthExceedances = contaminantSummaries.filter(
    (s) => s.exceedsHealthGuideline
  ).length

  // Compute water safety score
  const verifiedSamples = samples.filter((s) => (s.quality ?? 'verified') === 'verified').length
  const provisionalSamples = samples.filter((s) => s.quality === 'provisional').length
  const citizenSamples = samples.filter((s) => s.quality === 'citizen').length
  const safetyScore = computeSafetyScore({
    legalExceedances: exceedances,
    healthExceedances,
    totalContaminants: contaminantSummaries.length,
    totalSamples: samples.length,
    verifiedSamples,
    provisionalSamples,
    citizenSamples,
  })

  const result: UtilityWithStats = {
    ...utility,
    contaminantSummaries,
    totalSamples: samples.length,
    exceedances,
    healthExceedances,
    safetyScore,
  }

  return NextResponse.json(result)
}

// PUT /api/utilities/[id] (admin only)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  const body = await req.json()

  const allowed = [
    'pwsid', 'name', 'city', 'state', 'zipCodes', 'county', 'population',
    'systemType', 'sourceType', 'treatmentStatus', 'latitude', 'longitude',
    'website', 'notes',
  ] as const
  const data: Record<string, unknown> = {}
  for (const k of allowed) {
    if (body[k] !== undefined) {
      if (k === 'population' || k === 'latitude' || k === 'longitude') {
        data[k] = body[k] === null || body[k] === '' ? null : Number(body[k])
      } else {
        data[k] = body[k]
      }
    }
  }

  try {
    const updated = await db.utility.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 400 })
  }
}

// DELETE /api/utilities/[id] (admin only)
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { id } = await params
  await db.utility.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
