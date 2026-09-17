import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'
import { computeSafetyScore } from '@/lib/safety-score'
import { isEligibleForScoring, normalizeProvenance, normalizeVerification } from '@/lib/provenance'

// GET /api/utilities/scores
// Returns a lightweight safety score for every utility, for at-a-glance
// display on search result cards, map tooltips, and rankings.
export async function GET() {
  await ensureSeeded()

  const utilities = await db.utility.findMany({
    select: {
      id: true,
      samples: {
        select: {
          level: true,
          unit: true,
          quality: true,
          source: true,
          contaminant: { select: { healthGuideline: true, legalLimit: true } },
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
      contamIds.add(s.contaminant.healthGuideline + '|' + s.contaminant.legalLimit + '|' + s.level)
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
        const hg = s.contaminant.healthGuideline
        const ll = s.contaminant.legalLimit
        const key = hg + '|' + ll
        if (hg != null && hg > 0 && s.level > hg && !seenHealth.has(key)) {
          healthExceedances++
          seenHealth.add(key)
        }
        if (ll != null && ll > 0 && s.level > ll && !seenLegal.has(key)) {
          legalExceedances++
          seenLegal.add(key)
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
