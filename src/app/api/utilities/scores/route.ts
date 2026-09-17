import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { computeSafetyScore } from '@/lib/safety-score'
import { isEligibleForScoring, normalizeProvenance, normalizeToBenchmarkUnit } from '@/lib/provenance'

// GET /api/utilities/scores
// Returns a lightweight safety score for every utility, for at-a-glance
// display on search result cards, map tooltips, and rankings.
export async function GET() {

  const utilities = await db.utility.findMany({
    select: {
      id: true,
      samples: {
        select: {
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
        },
      },
    },
  })

  const scores = utilities.map((u) => {
    let legalExceedances = 0
    let healthExceedances = 0
    let verified = 0
    let provisional = 0
    let citizen = 0

    const seenLegal = new Set<string>()
    const seenHealth = new Set<string>()
    const contamIds = new Set<string>()

    for (const s of u.samples) {
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
        if (c.healthGuideline != null && c.healthGuideline > 0 && !seenHealth.has(s.contaminantId)) {
          const norm = normalizeToBenchmarkUnit(s.level, s.unit, c.healthGuidelineUnit || s.unit)
          if (norm != null && norm > c.healthGuideline) {
            healthExceedances++
            seenHealth.add(s.contaminantId)
          }
        }
        if (c.legalLimit != null && c.legalLimit > 0 && !seenLegal.has(s.contaminantId)) {
          const norm = normalizeToBenchmarkUnit(s.level, s.unit, c.legalLimitUnit || s.unit)
          if (norm != null && norm > c.legalLimit) {
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
      totalSamples: u.samples.length,
      verifiedSamples: verified,
      provisionalSamples: provisional,
      citizenSamples: citizen,
    })

    return {
      id: u.id,
      score: score.score,
      grade: score.grade,
      status: score.status,
      label: score.label,
      color: score.color,
      bgColor: score.bgColor,
      dataConfidence: score.dataConfidence,
    }
  })

  return NextResponse.json({ scores })
}
