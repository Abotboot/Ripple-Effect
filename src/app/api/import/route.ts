import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// POST /api/import
// Body: { table: 'utilities'|'contaminants'|'samples'|'reports', format: 'csv'|'json', content: string }
// Admin-only. Returns { imported, errors }.
export async function POST(req: NextRequest) {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json()
  const table = String(body?.table ?? '')
  const format = String(body?.format ?? 'json')
  const content = String(body?.content ?? '')

  const validTables = ['utilities', 'contaminants', 'samples', 'reports']
  if (!validTables.includes(table)) {
    return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
  }

  let rows: Record<string, unknown>[]
  try {
    if (format === 'json') {
      rows = JSON.parse(content)
      if (!Array.isArray(rows)) {
        return NextResponse.json(
          { error: 'JSON must be an array of objects' },
          { status: 400 }
        )
      }
    } else {
      rows = parseCSV(content)
    }
  } catch (e: unknown) {
    return NextResponse.json(
      { error: `Parse error: ${e instanceof Error ? e.message : 'invalid'}` },
      { status: 400 }
    )
  }

  const errors: string[] = []
  let imported = 0

  for (let i = 0; i < rows.length; i++) {
    try {
      const r = rows[i]
      switch (table) {
        case 'utilities':
          await importUtility(r)
          break
        case 'contaminants':
          await importContaminant(r)
          break
        case 'samples':
          await importSample(r)
          break
        case 'reports':
          await importReport(r)
          break
      }
      imported++
    } catch (e: unknown) {
      errors.push(`Row ${i + 1}: ${e instanceof Error ? e.message : 'unknown error'}`)
    }
  }

  return NextResponse.json({ imported, errors })
}

async function importUtility(r: Record<string, unknown>) {
  if (!r.pwsid || !r.name) throw new Error('pwsid and name required')
  await db.utility.upsert({
    where: { pwsid: String(r.pwsid) },
    update: {
      name: String(r.name),
      city: String(r.city ?? ''),
      state: String(r.state ?? ''),
      zipCodes: String(r.zipCodes ?? ''),
      county: r.county ? String(r.county) : null,
      population: Number(r.population ?? 0),
      systemType: String(r.systemType ?? 'Community'),
      sourceType: String(r.sourceType ?? 'Surface'),
      treatmentStatus: String(r.treatmentStatus ?? 'Treated'),
      latitude: r.latitude ? Number(r.latitude) : null,
      longitude: r.longitude ? Number(r.longitude) : null,
      website: r.website ? String(r.website) : null,
      notes: r.notes ? String(r.notes) : null,
    },
    create: {
      pwsid: String(r.pwsid),
      name: String(r.name),
      city: String(r.city ?? ''),
      state: String(r.state ?? ''),
      zipCodes: String(r.zipCodes ?? ''),
      county: r.county ? String(r.county) : null,
      population: Number(r.population ?? 0),
      systemType: String(r.systemType ?? 'Community'),
      sourceType: String(r.sourceType ?? 'Surface'),
      treatmentStatus: String(r.treatmentStatus ?? 'Treated'),
      latitude: r.latitude ? Number(r.latitude) : null,
      longitude: r.longitude ? Number(r.longitude) : null,
      website: r.website ? String(r.website) : null,
      notes: r.notes ? String(r.notes) : null,
    },
  })
}

async function importContaminant(r: Record<string, unknown>) {
  if (!r.slug || !r.name) throw new Error('slug and name required')
  const data = {
    name: String(r.name),
    chemicalName: r.chemicalName ? String(r.chemicalName) : null,
    category: String(r.category ?? 'Other'),
    legalLimit: r.legalLimit ? Number(r.legalLimit) : null,
    legalLimitUnit: r.legalLimitUnit ? String(r.legalLimitUnit) : null,
    healthGuideline: r.healthGuideline ? Number(r.healthGuideline) : null,
    healthGuidelineUnit: r.healthGuidelineUnit ? String(r.healthGuidelineUnit) : null,
    ewgHealthLimit: r.ewgHealthLimit ? Number(r.ewgHealthLimit) : null,
    description: r.description ? String(r.description) : null,
    healthEffects: r.healthEffects ? String(r.healthEffects) : null,
    sources: r.sources ? String(r.sources) : null,
    regulated: r.regulated !== undefined ? Boolean(r.regulated) : true,
  }
  await db.contaminant.upsert({
    where: { slug: String(r.slug) },
    update: data,
    create: { slug: String(r.slug), ...data },
  })
}

async function importSample(r: Record<string, unknown>) {
  let utilityId = r.utilityId ? String(r.utilityId) : null
  let contaminantId = r.contaminantId ? String(r.contaminantId) : null

  // If only slug/pwsid provided, resolve IDs
  if (!utilityId && r.utilityPwsid) {
    const u = await db.utility.findUnique({ where: { pwsid: String(r.utilityPwsid) } })
    utilityId = u?.id ?? null
  }
  if (!contaminantId && r.contaminantSlug) {
    const c = await db.contaminant.findUnique({ where: { slug: String(r.contaminantSlug) } })
    contaminantId = c?.id ?? null
  }
  if (!utilityId || !contaminantId || r.level == null) {
    throw new Error('utilityId (or utilityPwsid), contaminantId (or contaminantSlug), and level required')
  }
  await db.sample.create({
    data: {
      utilityId,
      contaminantId,
      level: Number(r.level),
      unit: String(r.unit ?? 'ppb'),
      sampleDate: r.sampleDate ? new Date(String(r.sampleDate)) : new Date(),
      source: String(r.source ?? 'Utility CCR'),
      treatmentStatus: String(r.treatmentStatus ?? 'Treated'),
      location: r.location ? String(r.location) : null,
      notes: r.notes ? String(r.notes) : null,
    },
  })
}

async function importReport(r: Record<string, unknown>) {
  if (!r.zipCode || !r.title || !r.description) {
    throw new Error('zipCode, title, and description required')
  }
  await db.report.create({
    data: {
      utilityId: r.utilityId ? String(r.utilityId) : null,
      reporterName: r.reporterName ? String(r.reporterName) : null,
      reporterEmail: r.reporterEmail ? String(r.reporterEmail) : null,
      zipCode: String(r.zipCode),
      city: r.city ? String(r.city) : null,
      state: r.state ? String(r.state) : null,
      title: String(r.title),
      description: String(r.description),
      contaminant: r.contaminant ? String(r.contaminant) : null,
      appearance: String(r.appearance ?? 'normal'),
      severity: String(r.severity ?? 'info'),
      status: String(r.status ?? 'pending'),
    },
  })
}

// Minimal CSV parser that handles quoted fields with embedded commas/newlines.
function parseCSV(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let cur: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        cur.push(field)
        field = ''
      } else if (ch === '\n' || ch === '\r') {
        // Handle \r\n
        if (ch === '\r' && text[i + 1] === '\n') i++
        cur.push(field)
        field = ''
        // Only push non-empty rows (skip trailing blank line)
        if (cur.some((c) => c !== '')) rows.push(cur)
        cur = []
      } else {
        field += ch
      }
    }
  }
  // last field
  if (field !== '' || cur.length > 0) {
    cur.push(field)
    if (cur.some((c) => c !== '')) rows.push(cur)
  }

  if (rows.length === 0) return []
  const headers = rows[0].map((h) => h.trim())
  return rows.slice(1).map((row) => {
    const obj: Record<string, string> = {}
    headers.forEach((h, i) => {
      obj[h] = row[i] ?? ''
    })
    return obj
  })
}
