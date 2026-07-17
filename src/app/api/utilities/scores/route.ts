import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { ensureSeeded } from '@/lib/ensure-seeded'
import { computeSafetyScore } from '@/lib/safety-score'

// GET /api/utilities/scores
// Returns a lightweight safety score for every utility, for at-a-glance
// display on search result cards, map tooltips, and rankings. This avoids
// the need to fetch each utility's full detail just to show a grade.
export async function GET() {
  await ensureSeeded()

  const utilities = await db.utility.findMany({
    select: {
      id: true,
      samples: {
        select: {
          level: true,
          quality: true,
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

    // Track latest level per contaminant to avoid double-counting
    // (simplified: count any sample that exceeds)
    const seenLegal = new Set<string>()
    const seenHealth = new Set<string>()
    let contaminantCount = 0
    const contamIds = new Set<string>()

    for (const s of u.samples) {
      contamIds.add(s.contaminant.healthGuideline + '|' + s.contaminant.legalLimit + '|' + s.level)
      const q = s.quality ?? 'verified'
      if (q === 'verified') verified++
      else if (q === 'provisional') provisional++
      else if (q === 'citizen') citizen++

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
    contaminantCount = contamIds.size

    const score = computeSafetyScore({
      legalExceedances,
      healthExceedances,
      totalContaminants: contaminantCount,
      totalSamples: u.samples.length,
      verifiedSamples: verified,
      provisionalSamples: provisional,
      citizenSamples: citizen,
    })

    return {
      id: u.id,
      score: score.score,
      grade: score.grade,
      label: score.label,
      color: score.color,
      bgColor: score.bgColor,
      dataConfidence: score.dataConfidence,
    }
  })

  return NextResponse.json({ scores })
}
