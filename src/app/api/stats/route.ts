import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { readSamples, sampleReadHeaders } from '@/lib/sample-read'
import { hasFiniteCoordinates, unavailableAssessment, sampleBenchmarkStatus } from '@/lib/sample-read-model'
import type { SampleAssessment } from '@/lib/types'
import {
  isEligibleForScoring,
  getProvenancePresentation,
  normalizeToBenchmarkUnit,
} from '@/lib/provenance'

// GET /api/stats - returns high-level platform impact numbers
export async function GET(req?: NextRequest) {
  // The map can load real locations even when a separate measurement read fails.
  // No Sample table, scores, donations, or counts are queried by this view.
  if (req?.nextUrl.searchParams.get('view') === 'map') {
    const utilities = await db.utility.findMany({
      select: { id: true, state: true, population: true, latitude: true,
        longitude: true, name: true, city: true, pwsid: true },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    })
    const mapUtilities = utilities.filter(hasFiniteCoordinates).map(u => ({
      ...u, assessment: unavailableAssessment(),
    }))
    return NextResponse.json({ mapUtilities, locationsCount: mapUtilities.length,
      unmappedCount: utilities.length - mapUtilities.length, assessments: 'not_requested' },
    { headers: { 'Cache-Control': 'no-store' } })
  }

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
    sampleRead,
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
    readSamples({
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
    }),
  ])
  const { samples, dataStatus } = sampleRead

  const states = new Set(utilities.map((u) => u.state))
  const populationServed = utilities.reduce((s, u) => s + u.population, 0)

  // Microplastics average across eligible treated drinking water samples (null if no eligible samples)
  // Normalizes each measurement to particles/l before averaging
  const mpValues = samples.flatMap((s) => {
    if (
      s.contaminant.slug !== 'microplastics' ||
      s.treatmentStatus !== 'Treated' ||
      !isEligibleForScoring(s)
    ) {
      return []
    }
    const v = normalizeToBenchmarkUnit(s.level, s.unit, 'particles/l')
    return v != null && Number.isFinite(v) && v >= 0 ? [v] : []
  })
  const microplasticsAvg = mpValues.length
    ? +(mpValues.reduce((sum, v) => sum + v, 0) / mpValues.length).toFixed(2)
    : null
  const microplasticsCohortCount = mpValues.length

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
    sampleCount: number
    eligibleSampleCount: number
    healthCompared: number
    legalCompared: number
  }
  const utilityExceedances = new Map<string, UtilityExceed>()

  // Slugs grouped by contaminant filter bucket
  const PFAS_SLUGS = new Set(['pfoa', 'pfos'])
  const DBP_SLUGS = new Set(['thm', 'haa5'])
  let healthCompared = 0
  let legalCompared = 0
  let eligibleSampleCount = 0

  for (const s of samples) {
    const slug = s.contaminant.slug.toLowerCase()
    const cur = (s.utilityId ? utilityExceedances.get(s.utilityId) : undefined) ?? {
      health: 0,
      legal: 0,
      microplastics: false,
      pfas: false,
      lead: false,
      dbp: false,
      sampleCount: 0,
      eligibleSampleCount: 0,
      healthCompared: 0,
      legalCompared: 0,
    }
    cur.sampleCount++

    const healthStatus = sampleBenchmarkStatus({
      level: s.level,
      unit: s.unit,
      benchmark: s.contaminant.healthGuideline,
      benchmarkUnit: s.contaminant.healthGuidelineUnit,
      provenance: s.provenance,
      verificationStatus: s.verificationStatus,
      quality: s.quality,
      source: s.source,
    })

    const legalStatus = sampleBenchmarkStatus({
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
    if (healthExceeded || healthStatus === 'below_benchmark') { healthCompared++; cur.healthCompared++ }
    if (legalExceeded || legalStatus === 'below_benchmark') { legalCompared++; cur.legalCompared++ }

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
    if (eligible) { eligibleSampleCount++; cur.eligibleSampleCount++ }
    if (slug === 'microplastics') {
      const normalized = normalizeToBenchmarkUnit(s.level, s.unit, 'particles/l')
      if (eligible && normalized != null && Number.isFinite(normalized) && normalized > 0) cur.microplastics = true
    } else if (PFAS_SLUGS.has(slug)) {
      if (healthExceeded) cur.pfas = true
    } else if (slug === 'lead') {
      if (healthExceeded) cur.lead = true
    } else if (DBP_SLUGS.has(slug)) {
      if (healthExceeded) cur.dbp = true
    }

    if (s.utilityId) utilityExceedances.set(s.utilityId, cur)
  }

  const assess = (counts: { sampleCount: number; eligibleSampleCount: number;
    healthCompared: number; legalCompared: number; health: number; legal: number }): SampleAssessment => ({
    status: counts.healthCompared + counts.legalCompared > 0 ? 'assessed' : 'not_assessed',
    sampleCount: counts.sampleCount, eligibleSampleCount: counts.eligibleSampleCount,
    healthCompared: counts.healthCompared, legalCompared: counts.legalCompared,
    healthAbove: counts.healthCompared > 0 ? counts.health : null,
    legalAbove: counts.legalCompared > 0 ? counts.legal : null,
  })

  // Map-friendly utility list with exceedance counts + per-contaminant flags
  const mapUtilities = utilities
    .filter(hasFiniteCoordinates)
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
        assessment: assess({ sampleCount: ex?.sampleCount ?? 0, eligibleSampleCount: ex?.eligibleSampleCount ?? 0,
          healthCompared: ex?.healthCompared ?? 0, legalCompared: ex?.legalCompared ?? 0,
          health: ex?.health ?? 0, legal: ex?.legal ?? 0 }),
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
    dataStatus,
    sampleAssessment: assess({ sampleCount: samples.length, eligibleSampleCount, healthCompared, legalCompared,
      health: healthExceedances, legal: legalExceedances }),
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
  }, { headers: sampleReadHeaders(dataStatus) })
}
