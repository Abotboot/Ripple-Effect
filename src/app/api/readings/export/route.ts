import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// GET /api/readings/export — admin only.
// Returns all citizen-quality readings as a CSV file for offline analysis.
export async function GET(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const format = req.nextUrl.searchParams.get('format') ?? 'csv'
  const readings = await db.sample.findMany({
    where: { quality: 'citizen' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      level: true,
      unit: true,
      source: true,
      location: true,
      treatmentStatus: true,
      sampleDate: true,
      createdAt: true,
      quality: true,
      notes: true,
      contaminant: { select: { name: true, slug: true, healthGuideline: true, legalLimit: true } },
      utility: { select: { name: true, city: true, state: true, pwsid: true } },
    },
  })

  // Parse reporter info from notes
  const rows = readings.map((r) => {
    let reporterEmail = ''
    let reporterName = ''
    let userNotes = ''
    if (r.notes) {
      const em = r.notes.match(/reporter:([^|]+)/)
      if (em) reporterEmail = em[1].trim()
      const nm = r.notes.match(/name:([^|]+)/)
      if (nm) reporterName = nm[1].trim()
      const un = r.notes.match(/notes:([^|]+)/)
      if (un) userNotes = un[1].trim()
    }
    return {
      id: r.id,
      createdAt: r.createdAt.toISOString(),
      sampleDate: r.sampleDate.toISOString(),
      contaminant: r.contaminant.name,
      contaminantSlug: r.contaminant.slug,
      level: r.level,
      unit: r.unit,
      treatmentStatus: r.treatmentStatus,
      location: r.location ?? '',
      quality: r.quality,
      reporterName,
      reporterEmail,
      userNotes,
      utilityName: r.utility?.name ?? '',
      utilityCity: r.utility?.city ?? '',
      utilityState: r.utility?.state ?? '',
      pwsid: r.utility?.pwsid ?? '',
      healthGuideline: r.contaminant.healthGuideline ?? '',
      legalLimit: r.contaminant.legalLimit ?? '',
      exceedsHealth:
        r.contaminant.healthGuideline != null && r.contaminant.healthGuideline > 0 && r.level > r.contaminant.healthGuideline ? 'yes' : 'no',
      exceedsLegal:
        r.contaminant.legalLimit != null && r.contaminant.legalLimit > 0 && r.level > r.contaminant.legalLimit ? 'yes' : 'no',
    }
  })

  if (format === 'json') {
    return NextResponse.json({ readings: rows, count: rows.length })
  }

  // CSV
  const headers = [
    'id', 'createdAt', 'sampleDate', 'contaminant', 'contaminantSlug',
    'level', 'unit', 'treatmentStatus', 'location', 'quality',
    'reporterName', 'reporterEmail', 'userNotes',
    'utilityName', 'utilityCity', 'utilityState', 'pwsid',
    'healthGuideline', 'legalLimit', 'exceedsHealth', 'exceedsLegal',
  ]

  const escapeCsv = (val: string | number | boolean): string => {
    const s = String(val ?? '')
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }

  const csvLines = [
    headers.join(','),
    ...rows.map((r) => headers.map((h) => escapeCsv((r as Record<string, string | number | boolean>)[h] ?? '')).join(',')),
  ]

  return new NextResponse(csvLines.join('\n'), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="citizen-readings-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
