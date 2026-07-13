import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/stats - aggregated dashboard statistics
export async function GET() {
  const [
    utilitiesCount,
    contaminantsCount,
    samplesCount,
    reportsCount,
    volunteersCount,
    utilities,
    samples,
  ] = await Promise.all([
    db.utility.count(),
    db.contaminant.count(),
    db.sample.count(),
    db.report.count(),
    db.volunteer.count(),
    db.utility.findMany({
      select: {
        id: true, state: true, population: true, latitude: true,
        longitude: true, name: true, city: true, pwsid: true,
      },
    }),
    db.sample.findMany({
      select: {
        level: true,
        treatmentStatus: true,
        utilityId: true,
        contaminant: { select: { slug: true, healthGuideline: true, legalLimit: true } },
      },
    }),
  ])

  const states = new Set(utilities.map((u) => u.state))
  const populationServed = utilities.reduce((s, u) => s + u.population, 0)

  // Microplastics average across treated samples
  const mpTreated = samples.filter(
    (s) =>
      s.contaminant.slug === 'microplastics' && s.treatmentStatus === 'Treated'
  )
  const microplasticsAvg = mpTreated.length
    ? mpTreated.reduce((s, x) => s + x.level, 0) / mpTreated.length
    : 0

  // Exceedance counts + per-utility exceedance counts (for map coloring)
  let healthExceedances = 0
  let legalExceedances = 0
  const utilityExceedances = new Map<string, { health: number; legal: number }>()
  for (const s of samples) {
    const hg = s.contaminant.healthGuideline
    const ll = s.contaminant.legalLimit
    const cur = utilityExceedances.get(s.utilityId) ?? { health: 0, legal: 0 }
    if (hg != null && hg > 0 && s.level > hg) {
      healthExceedances++
      cur.health++
    }
    if (ll != null && ll > 0 && s.level > ll) {
      legalExceedances++
      cur.legal++
    }
    utilityExceedances.set(s.utilityId, cur)
  }

  // Map-friendly utility list with exceedance counts
  const mapUtilities = utilities
    .filter((u) => u.latitude != null && u.longitude != null)
    .map((u) => ({
      id: u.id,
      name: u.name,
      city: u.city,
      state: u.state,
      pwsid: u.pwsid,
      latitude: u.latitude,
      longitude: u.longitude,
      population: u.population,
      healthExceedances: utilityExceedances.get(u.id)?.health ?? 0,
      legalExceedances: utilityExceedances.get(u.id)?.legal ?? 0,
    }))

  return NextResponse.json({
    utilitiesCount,
    contaminantsCount,
    samplesCount,
    reportsCount,
    volunteersCount,
    statesCovered: states.size,
    populationServed,
    microplasticsAvg: +microplasticsAvg.toFixed(2),
    healthExceedances,
    legalExceedances,
    mapUtilities,
  })
}
