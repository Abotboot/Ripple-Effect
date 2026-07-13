import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/export?format=csv|json&table=utilities|contaminants|samples|reports
// Returns the entire table as a downloadable file.
export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams
  const format = sp.get('format') === 'csv' ? 'csv' : 'json'
  const table = sp.get('table') ?? 'utilities'
  const validTables = ['utilities', 'contaminants', 'samples', 'reports']
  if (!validTables.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  let rows: Record<string, unknown>[]
  switch (table) {
    case 'utilities':
      rows = await db.utility.findMany({ orderBy: { state: 'asc' } })
      break
    case 'contaminants':
      rows = await db.contaminant.findMany({ orderBy: { name: 'asc' } })
      break
    case 'samples':
      rows = await db.sample.findMany({
        orderBy: { sampleDate: 'desc' },
        include: {
          contaminant: { select: { slug: true, name: true } },
          utility: { select: { pwsid: true, name: true } },
        },
      })
      // Flatten related fields for CSV friendliness
      rows = rows.map((r) => ({
        id: r.id,
        utilityId: r.utilityId,
        utilityPwsid: (r.utility as { pwsid?: string })?.pwsid ?? '',
        utilityName: (r.utility as { name?: string })?.name ?? '',
        contaminantId: r.contaminantId,
        contaminantSlug: (r.contaminant as { slug?: string })?.slug ?? '',
        contaminantName: (r.contaminant as { name?: string })?.name ?? '',
        level: r.level,
        unit: r.unit,
        sampleDate: (r.sampleDate as Date).toISOString(),
        source: r.source,
        treatmentStatus: r.treatmentStatus,
        location: r.location ?? '',
        notes: r.notes ?? '',
        createdAt: (r.createdAt as Date).toISOString(),
      }))
      break
    case 'reports':
      rows = await db.report.findMany({ orderBy: { createdAt: 'desc' } })
      rows = rows.map((r) => ({
        ...r,
        createdAt: (r.createdAt as Date).toISOString(),
        updatedAt: (r.updatedAt as Date).toISOString(),
      }))
      break
  }

  if (format === 'json') {
    return new NextResponse(JSON.stringify(rows, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="aquaguard-${table}.json"`,
      },
    })
  }

  // CSV
  const csv = toCSV(rows)
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="aquaguard-${table}.csv"`,
    },
  })
}

// Minimal CSV serializer that handles commas, quotes, newlines.
function toCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Array.from(
    rows.reduce<Set<string>>((set, r) => {
      Object.keys(r).forEach((k) => set.add(k))
      return set
    }, new Set())
  )
  const escape = (v: unknown) => {
    if (v == null) return ''
    const s = String(v)
    if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
    return s
  }
  const lines = [headers.join(',')]
  for (const r of rows) {
    lines.push(headers.map((h) => escape(r[h])).join(','))
  }
  return lines.join('\n')
}
