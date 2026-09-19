import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeSafetyScore } from '@/lib/safety-score'
import { isEligibleForScoring, normalizeProvenance } from '@/lib/provenance'
import { readSamples, sampleReadHeaders } from '@/lib/sample-read'
import { sampleBenchmarkStatus } from '@/lib/sample-read-model'

// GET /api/utilities/scores
// Returns a lightweight safety score for every utility, for at-a-glance
// display on search result cards, map tooltips, and rankings.
export async function GET() {

  const [utilities, { samples, dataStatus }] = await Promise.all([
    db.utility.findMany({ select: { id: true } }),
    readSamples({
          utilityId: true,
          level: true,
          unit: true,
          quality: true,
          source: true,
          provenance: true,
          verificationStatus: true,
          contaminantId: true,
          contaminant: {
            select: {
              id: true,
              healthGuideline: true,
              healthGuidelineUnit: true,
              legalLimit: true,
              legalLimitUnit: true,
            },
          },
    }),
  ])
  const byUtility = new Map<string, typeof samples>()
  for (const sample of samples) {
    if (!sample.utilityId) continue
    const list = byUtility.get(sample.utilityId) ?? []
    list.push(sample)
    byUtility.set(sample.utilityId, list)
  }

  const scores = utilities.map((u) => {
    const utilitySamples = byUtility.get(u.id) ?? []
    let legalExceedances = 0
    let healthExceedances = 0
    let verified = 0
    let provisional = 0
    let citizen = 0

    const seenLegal = new Set<string>()
    const seenHealth = new Set<string>()
    const contamIds = new Set<string>()

    for (const s of utilitySamples) {
      contamIds.add(s.contaminantId)
      const p = normalizeProvenance(s)
      const eligible = isEligibleForScoring(s)

      if (eligible) {
        verified++
      } else if (p === 'CITIZEN_CONTRIBUTED' || s.quality === 'citizen') {
        citizen++
      } else {
        provisional++
      }

      // Only reviewed regulatory or lab measurements can establish an exceedance
      if (eligible) {
        const c = s.contaminant
        if (!seenHealth.has(s.contaminantId)) {
          if (sampleBenchmarkStatus({ ...s, benchmark: c.healthGuideline, benchmarkUnit: c.healthGuidelineUnit }) === 'above_benchmark') {
            healthExceedances++
            seenHealth.add(s.contaminantId)
          }
        }
        if (!seenLegal.has(s.contaminantId)) {
          if (sampleBenchmarkStatus({ ...s, benchmark: c.legalLimit, benchmarkUnit: c.legalLimitUnit }) === 'above_benchmark') {
            legalExceedances++
            seenLegal.add(s.contaminantId)
          }
        }
      }
    }

    const score = computeSafetyScore({
      legalExceedances,
      healthExceedances,
      totalContaminants: contamIds.size,
      totalSamples: utilitySamples.length,
      verifiedSamples: verified,
      provisionalSamples: provisional,
      citizenSamples: citizen,
    })

    return {
      id: u.id,
      sampleCount: utilitySamples.length,
      eligibleSampleCount: verified,
      score: score.score,
      grade: score.grade,
      status: score.status,
      label: score.label,
      color: score.color,
      bgColor: score.bgColor,
      dataConfidence: score.dataConfidence,
    }
  })

  return NextResponse.json({ scores, dataStatus }, { headers: sampleReadHeaders(dataStatus) })
}
