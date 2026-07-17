import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'

// GET /api/stats - aggregated dashboard statistics
export async function GET() {
  // Auto-seed if DB is empty (prevents "search returns nothing" bug)
  await ensureSeeded()

  const [
    utilitiesCount,
    contaminantsCount,
    samplesCount,
    reportsCount,
    volunteersCount,
    chaptersCount,
    donations,
    trackedByUsCount,
    utilities,
    samples,
  ] = await Promise.all([
    db.utility.count(),
    db.contaminant.count(),
    db.sample.count(),
    db.report.count(),
    db.volunteer.count(),
    db.chapter.count(),
    db.donation.findMany({ select: { amount: true, status: true } }),
    db.contaminant.count({ where: { trackedByUs: true } }),
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
        quality: true,
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
  // + per-contaminant exceedance flags (for map contaminant filter chips)
  let healthExceedances = 0
  let legalExceedances = 0
  type UtilityExceed = {
    health: number
    legal: number
    microplastics: boolean
    pfas: boolean
    lead: boolean
    dbp: boolean
  }
  const utilityExceedances = new Map<string, UtilityExceed>()

  // Slugs grouped by contaminant filter bucket
  const PFAS_SLUGS = new Set(['pfoa', 'pfos'])
  const DBP_SLUGS = new Set(['thm', 'hAA5'])

  for (const s of samples) {
    const hg = s.contaminant.healthGuideline
    const ll = s.contaminant.legalLimit
    const slug = s.contaminant.slug
    const cur = utilityExceedances.get(s.utilityId) ?? {
      health: 0,
      legal: 0,
      microplastics: false,
      pfas: false,
      lead: false,
      dbp: false,
    }

    const healthExceeded = hg != null && hg > 0 && s.level > hg
    const legalExceeded = ll != null && ll > 0 && s.level > ll

    if (healthExceeded) {
      healthExceedances++
      cur.health++
    }
    if (legalExceeded) {
      legalExceedances++
      cur.legal++
    }

    // Per-contaminant flag tracking for map filter chips.
    // Microplastics has no federal legal limit and a healthGuideline of 0
    // (any detection is technically an exceedance), so we flag any utility
    // that has microplastics sample data at all.
    if (slug === 'microplastics') {
      cur.microplastics = true
    } else if (PFAS_SLUGS.has(slug)) {
      if (healthExceeded) cur.pfas = true
    } else if (slug === 'lead') {
      if (healthExceeded) cur.lead = true
    } else if (DBP_SLUGS.has(slug)) {
      if (healthExceeded) cur.dbp = true
    }

    utilityExceedances.set(s.utilityId, cur)
  }

  // Map-friendly utility list with exceedance counts + per-contaminant flags
  const mapUtilities = utilities
    .filter((u) => u.latitude != null && u.longitude != null)
    .map((u) => {
      const ex = utilityExceedances.get(u.id)
      return {
        id: u.id,
        name: u.name,
        city: u.city,
        state: u.state,
        pwsid: u.pwsid,
        latitude: u.latitude,
        longitude: u.longitude,
        population: u.population,
        healthExceedances: ex?.health ?? 0,
        legalExceedances: ex?.legal ?? 0,
        contaminantExceedances: {
          microplastics: ex?.microplastics ?? false,
          pfas: ex?.pfas ?? false,
          lead: ex?.lead ?? false,
          dbp: ex?.dbp ?? false,
        },
      }
    })

  const completedDonations = donations.filter((d) => d.status === 'completed')
  const donationsTotal = completedDonations.reduce((s, d) => s + d.amount, 0)

  // Quality breakdown: how many samples are verified vs provisional vs citizen.
  const qualityCounts = { verified: 0, provisional: 0, citizen: 0 }
  for (const s of samples) {
    const q = (s.quality ?? 'verified') as keyof typeof qualityCounts
    if (q in qualityCounts) qualityCounts[q]++
  }

  return NextResponse.json({
    utilitiesCount,
    contaminantsCount,
    samplesCount,
    reportsCount,
    volunteersCount,
    chaptersCount,
    donationsCount: completedDonations.length,
    donationsTotal,
    statesCovered: states.size,
    populationServed,
    microplasticsAvg: +microplasticsAvg.toFixed(2),
    healthExceedances,
    legalExceedances,
    trackedByUsCount,
    qualityCounts,
    mapUtilities,
  })
}
