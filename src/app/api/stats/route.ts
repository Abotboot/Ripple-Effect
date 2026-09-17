import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  isEligibleForScoring,
  getBenchmarkStatus,
  getProvenancePresentation,
  areUnitsCompatible,
} from '@/lib/provenance'

// GET /api/stats - returns high-level platform impact numbers
export async function GET() {

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
        unit: true,
        treatmentStatus: true,
        utilityId: true,
        quality: true,
        source: true,
        provenance: true,
        verificationStatus: true,
        contaminant: {
          select: {
            slug: true,
            healthGuideline: true,
            healthGuidelineUnit: true,
            legalLimit: true,
            legalLimitUnit: true,
          },
        },
      },
    }),
  ])

  const states = new Set(utilities.map((u) => u.state))
  const populationServed = utilities.reduce((s, u) => s + u.population, 0)

  // Microplastics average across eligible treated drinking water samples (null if no eligible samples)
  const mpEligibleTreated = samples.filter(
    (s) =>
      s.contaminant.slug === 'microplastics' &&
      s.treatmentStatus === 'Treated' &&
      isEligibleForScoring(s) &&
      areUnitsCompatible(s.unit, 'particles/l')
  )
  const microplasticsAvg = mpEligibleTreated.length
    ? +(mpEligibleTreated.reduce((s, x) => s + x.level, 0) / mpEligibleTreated.length).toFixed(2)
    : null
  const microplasticsCohortCount = mpEligibleTreated.length

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
    if (!s.utilityId) continue
    const slug = s.contaminant.slug
    const cur = utilityExceedances.get(s.utilityId) ?? {
      health: 0,
      legal: 0,
      microplastics: false,
      pfas: false,
      lead: false,
      dbp: false,
    }

    const healthStatus = getBenchmarkStatus({
      level: s.level,
      unit: s.unit,
      benchmark: s.contaminant.healthGuideline,
      benchmarkUnit: s.contaminant.healthGuidelineUnit,
      provenance: s.provenance,
      verificationStatus: s.verificationStatus,
      quality: s.quality,
      source: s.source,
    })

    const legalStatus = getBenchmarkStatus({
      level: s.level,
      unit: s.unit,
      benchmark: s.contaminant.legalLimit,
      benchmarkUnit: s.contaminant.legalLimitUnit,
      provenance: s.provenance,
      verificationStatus: s.verificationStatus,
      quality: s.quality,
      source: s.source,
    })

    const healthExceeded = healthStatus === 'above_benchmark'
    const legalExceeded = legalStatus === 'above_benchmark'

    if (healthExceeded) {
      healthExceedances++
      cur.health++
    }
    if (legalExceeded) {
      legalExceedances++
      cur.legal++
    }

    // Per-contaminant flag tracking for map filter chips:
    // Only flag verified/reviewed measurements, not synthetic demo data
    const eligible = isEligibleForScoring(s)
    if (slug === 'microplastics') {
      if (eligible && s.level > 0) cur.microplastics = true
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

  // Quality breakdown: classified via shared provenance presentation rules
  const qualityCounts = {
    verified: 0,
    provisional: 0,
    citizen: 0,
    unreviewed: 0,
    illustrative: 0,
  }
  for (const s of samples) {
    const pres = getProvenancePresentation(s)
    if (pres.badgeVariant === 'verified') {
      qualityCounts.verified++
    } else if (pres.badgeVariant === 'provisional') {
      qualityCounts.provisional++
    } else if (pres.badgeVariant === 'citizen') {
      qualityCounts.citizen++
    } else if (pres.badgeVariant === 'illustrative') {
      qualityCounts.illustrative++
    } else {
      qualityCounts.unreviewed++
    }
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
    microplasticsAvg,
    microplasticsCohortCount,
    healthExceedances,
    legalExceedances,
    trackedByUsCount,
    qualityCounts,
    mapUtilities,
  })
}
