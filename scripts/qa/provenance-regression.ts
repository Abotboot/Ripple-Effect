import assert from 'node:assert/strict'
import {
  normalizeProvenance,
  normalizeVerification,
  isIllustrative,
  isEligibleForScoring,
  areUnitsCompatible,
  normalizeToBenchmarkUnit,
  getBenchmarkStatus,
  getProvenancePresentation,
} from '../../src/lib/provenance'
import { buildContaminantSummary } from '../../src/lib/aggregate'
import { computeSafetyScore } from '../../src/lib/safety-score'
import { fixtureContaminant, fixtureSample } from './fixtures'

console.log('[QA-Provenance] Starting data safety & provenance regression tests...')

// 1. Legacy verified string test
{
  const legacyRecord = {
    source: 'EPA UCMR',
    quality: 'verified',
    provenance: undefined,
    verificationStatus: undefined,
  }
  assert.equal(normalizeProvenance(legacyRecord), 'UNKNOWN', 'Legacy record without provenance column must normalize to UNKNOWN')
  assert.equal(normalizeVerification(legacyRecord), 'UNREVIEWED', 'Legacy record without verificationStatus column must normalize to UNREVIEWED')
  assert.equal(isEligibleForScoring(legacyRecord), false, 'Legacy unreviewed record must not be eligible for scoring')

  const pres = getProvenancePresentation(legacyRecord)
  assert.equal(pres.badgeVariant, 'unreviewed', 'Legacy verified string without verificationStatus VERIFIED must never show verified badge')
  assert.equal(pres.badgeLabel, 'Unreviewed', 'Badge label must be Unreviewed')
  assert.equal(pres.isVerified, false, 'isVerified must be false')
  console.log('[QA-Provenance] PASS: Legacy raw verified string correctly mapped to Unreviewed.')
}

// 2. Illustrative synthetic demo record test
{
  const syntheticRecord = {
    source: 'Synthetic demo data',
    quality: 'illustrative',
    provenance: 'ILLUSTRATIVE',
    verificationStatus: 'UNREVIEWED',
  }
  assert.equal(isIllustrative(syntheticRecord), true)
  assert.equal(isEligibleForScoring(syntheticRecord), false)

  const pres = getProvenancePresentation(syntheticRecord)
  assert.equal(pres.badgeVariant, 'illustrative')
  assert.equal(pres.badgeLabel, 'Illustrative')
  assert.equal(pres.isIllustrative, true)
  console.log('[QA-Provenance] PASS: Synthetic demo data correctly identified as Illustrative.')
}

// 3. True verified institutional record test
{
  const verifiedRecord = {
    source: 'City Water CCR',
    quality: 'verified',
    provenance: 'REGULATORY_REPORTED',
    verificationStatus: 'VERIFIED',
    verifiedAt: new Date(),
  }
  assert.equal(isEligibleForScoring(verifiedRecord), true)
  const pres = getProvenancePresentation(verifiedRecord)
  assert.equal(pres.badgeVariant, 'verified')
  assert.equal(pres.badgeLabel, 'Verified')
  assert.equal(pres.isVerified, true)
  console.log('[QA-Provenance] PASS: True regulatory record correctly identified as Verified.')
}

// 4. Cohort isolation test (1000 illustrative + 1 verified)
{
  const contaminant = fixtureContaminant({
    id: 'lead-id',
    slug: 'lead',
    name: 'Lead',
    chemicalName: 'Pb',
    category: 'Heavy Metals',
    legalLimit: 15,
    legalLimitUnit: 'ppb',
    healthGuideline: 0,
    healthGuidelineUnit: 'ppb',
    regulated: true,
    trackedByUs: true,
  })

  const illustrativeSamples = Array.from({ length: 1000 }, (_, i) => fixtureSample({
    id: `ill-${i}`,
    utilityId: 'util-1',
    contaminantId: 'lead-id',
    level: 1000,
    unit: 'ppb',
    sampleDate: new Date('2024-01-01'),
    source: 'Synthetic demo data',
    treatmentStatus: 'Treated',
    location: null,
    quality: 'illustrative',
    provenance: 'ILLUSTRATIVE',
    verificationStatus: 'UNREVIEWED',
    notes: null,
  }))

  const verifiedSample = fixtureSample({
    id: 'ver-1',
    utilityId: 'util-1',
    contaminantId: 'lead-id',
    level: 1,
    unit: 'ppb',
    sampleDate: new Date('2024-06-01'),
    source: 'EPA CCR',
    treatmentStatus: 'Treated',
    location: null,
    quality: 'verified',
    provenance: 'REGULATORY_REPORTED',
    verificationStatus: 'VERIFIED',
    notes: null,
  })

  const allSamples = [...illustrativeSamples, verifiedSample]
  const summary = buildContaminantSummary(contaminant, allSamples)

  // Verified cohort must NOT blend with 1000 illustrative samples!
  assert.equal(summary.latestLevel, 1, 'Latest level from verified record must be 1')
  assert.equal(summary.avgLevel, 1, 'Verified cohort average must be 1 (NOT 500.5)')
  assert.equal(summary.maxLevel, 1, 'Verified cohort max must be 1')
  assert.equal(summary.isVerified, true, 'Cohort is verified')
  assert.equal(summary.sampleCount, 1, 'Sample count must describe active verified cohort')
  assert.equal(summary.legalBenchmarkStatus, 'below_benchmark', '1 ppb is below legal limit 15 ppb')

  // Trend must also isolate the active verified cohort (not joining 1000 illustrative points)
  assert.equal(summary.trend.length, 1, 'Trend line must only include active verified cohort')
  assert.equal(summary.trend[0].level, 1, 'Plotted point must be verified level 1')
  assert.equal(summary.trend[0].provenance, 'REGULATORY_REPORTED')

  console.log('[QA-Provenance] PASS: Cohort isolation verified for averages AND trend dataset.');
}

// 5. Unit compatibility and bidirectional normalization tests
{
  // Compatibility
  assert.equal(areUnitsCompatible('ppb', 'ppm'), true)
  assert.equal(areUnitsCompatible('ug/l', 'µg/l'), true)
  assert.equal(areUnitsCompatible('ppm', 'ppt'), true)
  assert.equal(areUnitsCompatible('ppb', 'ug/l'), true)
  assert.equal(areUnitsCompatible('ppm', 'mg/l'), true)
  assert.equal(areUnitsCompatible('ppb', 'particles/L'), false)
  assert.equal(areUnitsCompatible('particles/l', 'fibers/l'), false)
  assert.equal(areUnitsCompatible('particles/l', 'particles/liter'), true)

  // Normalization in all directions
  assert.equal(normalizeToBenchmarkUnit(1, 'ug/l', 'µg/l'), 1, '1 ug/l = 1 µg/l')
  assert.equal(normalizeToBenchmarkUnit(1, 'µg/l', 'ug/l'), 1, '1 µg/l = 1 ug/l')
  assert.equal(normalizeToBenchmarkUnit(1, 'ppm', 'ppt'), 1000000, '1 ppm = 1,000,000 ppt')
  assert.equal(normalizeToBenchmarkUnit(1000000, 'ppt', 'ppm'), 1, '1,000,000 ppt = 1 ppm')
  assert.equal(normalizeToBenchmarkUnit(1, 'ppb', 'ug/l'), 1, '1 ppb = 1 ug/l')
  assert.equal(normalizeToBenchmarkUnit(1, 'ug/l', 'ppb'), 1, '1 ug/l = 1 ppb')
  assert.equal(normalizeToBenchmarkUnit(1, 'ppm', 'mg/l'), 1, '1 ppm = 1 mg/l')
  assert.equal(normalizeToBenchmarkUnit(1, 'mg/l', 'ppm'), 1, '1 mg/l = 1 ppm')
  assert.equal(normalizeToBenchmarkUnit(5000, 'ppb', 'ppm'), 5, '5000 ppb = 5 ppm')
  assert.equal(normalizeToBenchmarkUnit(2, 'ppm', 'ppb'), 2000, '2 ppm = 2000 ppb')

  // Incompatible & edge cases
  assert.equal(normalizeToBenchmarkUnit(5, 'ppb', 'particles/l'), null)
  assert.equal(normalizeToBenchmarkUnit(NaN, 'ppb', 'ppm'), null)
  assert.equal(normalizeToBenchmarkUnit(Infinity, 'ppb', 'ppm'), null)

  const statusIncompat = getBenchmarkStatus({
    level: 25,
    unit: 'particles/L',
    benchmark: 15,
    benchmarkUnit: 'ppb',
    provenance: 'REGULATORY_REPORTED',
    verificationStatus: 'VERIFIED',
  })
  assert.equal(statusIncompat, 'incompatible_units', 'Mismatched units must yield incompatible_units status')
  console.log('[QA-Provenance] PASS: Bidirectional unit conversions and compatibility verified.');
}

// 6. Contradictory metadata and non-authoritative string rejection
{
  // Illustrative provenance with VERIFIED status must never score or show verified badge
  const contradictoryIllustrative = {
    source: 'EPA CCR Official Database',
    quality: 'verified',
    provenance: 'ILLUSTRATIVE' as const,
    verificationStatus: 'VERIFIED' as const,
  }
  assert.equal(isEligibleForScoring(contradictoryIllustrative), false)
  const pres1 = getProvenancePresentation(contradictoryIllustrative)
  assert.equal(pres1.badgeVariant, 'illustrative')
  assert.equal(pres1.isVerified, false)

  // REJECTED status must never score
  const rejectedRecord = {
    source: 'State Lab',
    quality: 'verified',
    provenance: 'LAB_REPORTED' as const,
    verificationStatus: 'REJECTED' as const,
  }
  assert.equal(isEligibleForScoring(rejectedRecord), false)
  const pres2 = getProvenancePresentation(rejectedRecord)
  assert.equal(pres2.badgeVariant, 'unreviewed')
  assert.equal(pres2.isVerified, false)

  // UNKNOWN provenance with VERIFIED status must never score
  const unverifiedRecord = {
    source: 'Unknown Provider',
    quality: 'verified',
    provenance: 'UNKNOWN' as const,
    verificationStatus: 'VERIFIED' as const,
  }
  assert.equal(isEligibleForScoring(unverifiedRecord), false)
  const pres3 = getProvenancePresentation(unverifiedRecord)
  assert.equal(pres3.badgeVariant, 'unreviewed')
  assert.equal(pres3.isVerified, false)

  console.log('[QA-Provenance] PASS: Contradictory & rejected metadata correctly guarded.');
}

// 7. Whole-system safety score suppression test
{
  const score = computeSafetyScore({
    legalExceedances: 0,
    healthExceedances: 0,
    totalContaminants: 15,
    totalSamples: 1,
    verifiedSamples: 1,
    provisionalSamples: 0,
    citizenSamples: 0,
  })
  assert.equal(score.score, null, 'Score must be null (suppressed)')
  assert.equal(score.grade, '—', 'Grade must be —')
  assert.equal(score.status, 'insufficient_verified_data', 'Status must be insufficient_verified_data')
  assert.equal(score.label, 'Not enough reviewed data')
  console.log('[QA-Provenance] PASS: Single-observation score correctly suppressed.');
}

console.log('[QA-Provenance] ALL REGRESSION TESTS PASSED CLEANLY.')
