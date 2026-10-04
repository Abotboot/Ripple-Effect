import { Prisma } from '@prisma/client'
import { TypeSafeClient, choice, noul, score, type JsonValue, type SystemOneResult } from '@typesafe-ai/sdk'
import { db } from '@/lib/db'
import { readSamples, SAMPLE_READ_FIELDS, isMissingSampleMetadataColumn } from '@/lib/sample-read'
import { isMissingTable, loadCollectionPoints, loadContributors, contributorNotes, type CollectionPoint, type Contributor } from '@/lib/reading-contributors'
import { areUnitsCompatible, normalizeToBenchmarkUnit } from '@/lib/provenance'
import { waterBodyAt } from '@/lib/water-lookup'
import { published, SUBMITTED_WHERE } from '@/lib/published-samples'

// Who decides whether a submitted reading goes on the site: Jev, TypeSafe
// AI's decision model (docs.typesafe.ai), with admins able to overrule.
//
// Every reading, from the public form or the identifier device, starts hidden.
// A checklist is computed here (is the source device-signed, is the value
// believable against benchmarks and the published history, is it an outlier
// for its water, is it a duplicate, is the pin on water, who sent it...), then
// Jev is asked three typed questions about the reading and that checklist.
// Its answers come back with probabilities, and the thresholds below turn
// them into publish / hold / reject. Anything failing a hard check can never
// auto-publish; anything Jev is unsure about waits for a person. Without a
// TYPESAFE_API_KEY nothing publishes on its own.

export type CheckStatus = 'pass' | 'warn' | 'fail' | 'info' | 'skip'
export type ReviewCheck = { id: string; label: string; status: CheckStatus; detail: string }
export type ReviewDecision = 'publish' | 'hold' | 'reject'
export type ReadingReview = {
  decision: ReviewDecision
  /** "jev", "checks" (Jev did not answer) or the admin's email. */
  decidedBy: string
  confidence: number | null
  model: string | null
  summary: string
  checks: ReviewCheck[]
  answers: JevAnswers | null
  createdAt: string
}

// Jev must be at least this sure to publish or reject with no one looking.
const PUBLISH_CONFIDENCE = 0.8
const REJECT_CONFIDENCE = 0.9
// ...and its yes/no on believability has to agree.
const PLAUSIBLE_TO_PUBLISH = 0.6
const PLAUSIBLE_TO_REJECT = 0.4

const QUESTIONS = {
  decision: choice(
    'Should this water-quality reading be published on the public map, held for a human reviewer, or rejected?',
    {
      publish: 'Publish now: every check passes or is only informational, and the value is believable for this contaminant, its source and its place.',
      hold: 'Hold for a person: a check warns, context is missing, or the reading would be a notable finding that deserves a second look.',
      reject: 'Reject: the value is impossible for this contaminant, the reading duplicates an earlier one, or it reads as a test, a joke or spam.',
    },
  ),
  plausible: noul(
    'Is the measured value believable for this contaminant, its source, the place and the date?',
    { true: 'Believable', false: 'Not believable' },
  ),
  evidence: score('How strong is this reading as evidence?', ['Unusable', 'Weak', 'Fair', 'Good', 'Strong']),
}
export type JevAnswers = SystemOneResult<typeof QUESTIONS>['answers']

export function jevConfigured(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY?.trim())
}
export function jevModel(): string {
  return process.env.TYPESAFE_DEFAULT_MODEL?.trim() || 'jev-latest'
}

let client: TypeSafeClient | null = null
function jev(): TypeSafeClient | null {
  if (!jevConfigured()) return null
  // A submission waits on this call, so one retry and a short timeout.
  client ??= new TypeSafeClient({ timeout: 8000, retry: { maxRetries: 1 }, logLevel: 'error' })
  return client
}

// -- Loading ----------------------------------------------------------------

const REVIEW_SELECT = {
  ...SAMPLE_READ_FIELDS,
  contaminant: { select: { id: true, name: true, slug: true, healthGuideline: true, healthGuidelineUnit: true, legalLimit: true, legalLimitUnit: true } },
  utility: { select: { id: true, name: true, city: true, state: true, latitude: true, longitude: true } },
} as const
type Loaded = Prisma.SampleGetPayload<{ select: typeof REVIEW_SELECT }>

async function loadSample(id: string): Promise<Loaded> {
  const { samples } = await readSamples(REVIEW_SELECT, { where: { id } })
  if (!samples[0]) throw new Error(`Reading ${id} not found`)
  return samples[0]
}

// -- Arithmetic -------------------------------------------------------------

const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b)
const median = (xs: number[]) => { const s = sorted(xs); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }
const percentile = (xs: number[], p: number) => { const s = sorted(xs); return s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))] }
const fmt = (n: number) => n.toLocaleString('en-US', { maximumSignificantDigits: 3 })
const times = (ratio: number) => `${fmt(ratio)}×`
const earlier = (hours: number) => hours < 1 / 60 ? 'moments earlier' : hours < 2 ? `${Math.round(hours * 60)} minutes earlier` : `${fmt(hours)} hours earlier`

function distanceKm(a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }): number {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad, dLng = (b.longitude - a.longitude) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371 * Math.asin(Math.sqrt(h))
}

// -- The checklist ----------------------------------------------------------

type Benchmark = { kind: 'legal limit' | 'health guideline'; value: number; unit: string | null }
function benchmarks(c: Loaded['contaminant']): Benchmark[] {
  const list: Benchmark[] = []
  if (c.legalLimit != null && c.legalLimit > 0) list.push({ kind: 'legal limit', value: c.legalLimit, unit: c.legalLimitUnit })
  if (c.healthGuideline != null && c.healthGuideline > 0) list.push({ kind: 'health guideline', value: c.healthGuideline, unit: c.healthGuidelineUnit })
  return list
}

/** The candidate's level expressed in another unit, when the units are comparable. */
function inUnit(level: number, from: string, to: string | null | undefined): number | null {
  if (!to || !areUnitsCompatible(from, to)) return null
  const value = normalizeToBenchmarkUnit(level, from, to)
  return value != null && Number.isFinite(value) ? value : null
}

type History = { levels: number[]; local: number[] }

/** Published readings of the same contaminant, in the candidate's unit; `local` is the same utility or water within 5 km. */
async function publishedHistory(sample: Loaded, point: CollectionPoint | null): Promise<History> {
  const { samples } = await readSamples(
    { id: true, level: true, unit: true, utilityId: true },
    { where: published({ contaminantId: sample.contaminantId, NOT: { id: sample.id } }), orderBy: { sampleDate: 'desc' }, take: 400 },
  )
  const points = point ? await loadCollectionPoints(samples.map(s => s.id)) : new Map<string, CollectionPoint>()
  const history: History = { levels: [], local: [] }
  for (const s of samples) {
    const value = inUnit(s.level, s.unit, sample.unit)
    if (value == null) continue
    history.levels.push(value)
    const near = point && points.get(s.id)
    if ((sample.utilityId && s.utilityId === sample.utilityId) || (near && distanceKm(point, near) <= 5)) history.local.push(value)
  }
  return history
}

type ReporterHistory = { published: number; rejected: number; pending: number; lastHour: number; duplicateHoursAgo: number | null }

async function reporterHistory(sample: Loaded, email: string): Promise<ReporterHistory | null> {
  try {
    const rows = await db.sampleContributor.findMany({
      where: { email, NOT: { sampleId: sample.id } },
      select: { createdAt: true, sample: { select: { level: true, unit: true, contaminantId: true, verificationStatus: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    })
    const history: ReporterHistory = { published: 0, rejected: 0, pending: 0, lastHour: 0, duplicateHoursAgo: null }
    const now = sample.createdAt.getTime()
    for (const row of rows) {
      const status = row.sample.verificationStatus
      if (status === 'VERIFIED') history.published++
      else if (status === 'REJECTED') history.rejected++
      else history.pending++
      const hoursAgo = (now - row.createdAt.getTime()) / 3600e3
      if (hoursAgo >= 0 && hoursAgo <= 1) history.lastHour++
      const same = row.sample.contaminantId === sample.contaminantId && areUnitsCompatible(row.sample.unit, sample.unit)
        && Math.abs((inUnit(row.sample.level, row.sample.unit, sample.unit) ?? NaN) - sample.level) <= Math.max(sample.level, 1e-9) * 0.01
      if (same && hoursAgo >= 0 && hoursAgo <= 48 && history.duplicateHoursAgo == null) history.duplicateHoursAgo = hoursAgo
    }
    return history
  } catch (error) {
    if (isMissingTable(error) || isMissingSampleMetadataColumn(error)) return null
    throw error
  }
}

/** An identical reading from the device in the last hour (a retried post). */
async function deviceDuplicate(sample: Loaded): Promise<Date | null> {
  const earlier = await db.sample.findFirst({
    where: {
      robot: true, contaminantId: sample.contaminantId, level: sample.level, utilityId: sample.utilityId,
      NOT: { id: sample.id }, createdAt: { gte: new Date(sample.createdAt.getTime() - 3600e3), lte: sample.createdAt },
    },
    select: { createdAt: true },
  })
  return earlier?.createdAt ?? null
}

async function placeOnWater(point: CollectionPoint): Promise<{ status: CheckStatus; detail: string }> {
  try {
    const name = await waterBodyAt(point.latitude, point.longitude, AbortSignal.timeout(4000))
    if (name) return { status: 'pass', detail: `The pin is on the water: ${name}.` }
    return { status: 'warn', detail: 'The pin is on land, not on water.' }
  } catch {
    return { status: 'info', detail: 'Could not check the map for this point.' }
  }
}

type JevState = { [key: string]: JsonValue }

async function runChecks(sample: Loaded, point: CollectionPoint | null, contributor: Contributor | null): Promise<{ checks: ReviewCheck[]; state: JevState }> {
  const checks: ReviewCheck[] = []
  const add = (id: string, label: string, status: CheckStatus, detail: string) => checks.push({ id, label, status, detail })
  const device = sample.robot
  const c = sample.contaminant
  const level = sample.level

  const [history, reporter, deviceRepeat, water] = await Promise.all([
    publishedHistory(sample, point),
    !device && contributor?.email ? reporterHistory(sample, contributor.email) : Promise.resolve(null),
    device ? deviceDuplicate(sample) : Promise.resolve(null),
    point ? placeOnWater(point) : Promise.resolve(null),
  ])

  // 1. Where it came from.
  if (device) add('source', 'Source', 'pass', 'Sent by our interceptor; the device key matched.')
  else add('source', 'Source', 'info', 'Sent through the public form, so it carries no device signature.')

  // 2. The value against the benchmarks (a legal limit first, else a health guideline).
  const refs = benchmarks(c)
  const ref = refs.find(b => inUnit(level, sample.unit, b.unit) != null)
  const normalized = ref ? inUnit(level, sample.unit, ref.unit) : null
  if (!Number.isFinite(level) || level < 0) add('value', 'Value', 'fail', 'The value is not a usable number.')
  else if (level > 1e9) add('value', 'Value', 'fail', 'The value is beyond any physical measurement.')
  else if (ref && normalized != null) {
    const ratio = normalized / ref.value
    if (ratio >= 1000) add('value', 'Value', 'fail', `${times(ratio)} the ${ref.kind}; not a credible field measurement.`)
    else if (ratio >= 50) add('value', 'Value', 'warn', `${times(ratio)} the ${ref.kind}; far beyond anything expected.`)
    else if (ratio > 1) add('value', 'Value', 'pass', `${times(ratio)} the ${ref.kind}.`)
    else add('value', 'Value', 'pass', `Below the ${ref.kind}.`)
  } else if (refs.length) add('value', 'Value', 'warn', `Unit ${sample.unit} cannot be compared with the benchmark unit ${refs[0].unit ?? '?'}.`)
  else add('value', 'Value', 'info', `No legal limit or health guideline exists for ${c.name}; judged against published readings instead.`)

  // 3. Against every published reading of this contaminant.
  const n = history.levels.length
  if (n >= 5) {
    const med = median(history.levels), p95 = percentile(history.levels, 0.95)
    if (med > 0 && (level > 20 * med || level < med / 20)) add('history', 'Published readings', 'warn', `${times(level / med)} the median of ${n} published readings (${fmt(med)} ${sample.unit}).`)
    else if (p95 > 0 && level > 10 * p95) add('history', 'Published readings', 'warn', `Above every one of ${n} published readings; the 95th percentile is ${fmt(p95)} ${sample.unit}.`)
    else add('history', 'Published readings', 'pass', `In line with ${n} published readings (median ${fmt(med)} ${sample.unit}).`)
  } else add('history', 'Published readings', 'info', n ? `Only ${n} published reading${n === 1 ? '' : 's'} to compare with.` : 'No published readings of this contaminant to compare with.')

  // 4. Against the same utility or water body.
  const local = history.local
  if (local.length >= 2) {
    const med = median(local)
    if (med > 0 && (level > 10 * med || level < med / 10)) add('local', 'Nearby readings', 'warn', `${times(level / med)} the median of ${local.length} earlier readings here (${fmt(med)} ${sample.unit}).`)
    else add('local', 'Nearby readings', 'pass', `In line with ${local.length} earlier readings here.`)
  } else if (sample.utilityId || point) add('local', 'Nearby readings', 'info', 'Few or no earlier readings from this utility or water body.')
  else add('local', 'Nearby readings', 'skip', 'No utility or point to compare by place.')

  // 5. Would it be a notable finding? (Device readings are trusted, so only noted.)
  const above = refs.filter(b => { const v = inUnit(level, sample.unit, b.unit); return v != null && v > b.value })
  if (above.length) add('benchmark', 'Benchmarks', device ? 'info' : 'warn', `Above the ${above.map(b => b.kind).join(' and the ')}: a notable finding.`)
  else if (refs.length && ref) add('benchmark', 'Benchmarks', 'pass', 'Below the benchmarks.')
  else add('benchmark', 'Benchmarks', 'skip', 'No benchmark to compare with.')

  // 6. When it was sampled.
  const ageDays = (sample.createdAt.getTime() - sample.sampleDate.getTime()) / 86400e3
  if (ageDays < -1) add('date', 'Sample date', 'fail', 'The sample date is in the future.')
  else if (ageDays > 730) add('date', 'Sample date', 'warn', `Sampled ${fmt(ageDays / 365)} years before it was submitted.`)
  else add('date', 'Sample date', 'pass', `Sampled ${sample.sampleDate.toISOString().slice(0, 10)}.`)

  // 7. Where it was collected.
  if (point && water) add('place', 'Place', water.status, water.detail)
  else if (sample.utility) add('place', 'Place', 'info', `No point on the water; tied to ${sample.utility.name} only.`)
  else add('place', 'Place', 'warn', 'No location: neither a point on the water nor a utility.')

  // 8. Does the point fit the utility?
  const u = sample.utility
  if (point && u && u.latitude != null && u.longitude != null) {
    const km = distanceKm(point, { latitude: u.latitude, longitude: u.longitude })
    if (km <= 150) add('distance', 'Distance', 'pass', `${fmt(km)} km from ${u.name}.`)
    else add('distance', 'Distance', 'warn', `${fmt(km)} km from ${u.name}; is the utility right?`)
  } else add('distance', 'Distance', 'skip', 'Needs both a point and a utility with coordinates.')

  // 9. Duplicates.
  if (device) {
    if (deviceRepeat) add('duplicate', 'Duplicate', 'warn', `The device sent an identical reading ${earlier((sample.createdAt.getTime() - deviceRepeat.getTime()) / 3600e3)}.`)
    else add('duplicate', 'Duplicate', 'pass', 'No identical device reading in the last hour.')
  } else if (reporter?.duplicateHoursAgo != null) add('duplicate', 'Duplicate', 'fail', `The same value for the same contaminant was sent by this reporter ${earlier(reporter.duplicateHoursAgo)}.`)
  else if (reporter) add('duplicate', 'Duplicate', 'pass', 'No duplicate from this reporter in the last two days.')
  else add('duplicate', 'Duplicate', 'info', 'Reporter history is not available to check for duplicates.')

  // 10. Who sent it.
  if (device) add('reporter', 'Reporter', 'skip', 'Device readings have no reporter.')
  else if (!reporter) add('reporter', 'Reporter', 'info', 'No reporter history available.')
  else if (reporter.rejected >= 2) add('reporter', 'Reporter', 'warn', `${reporter.rejected} earlier readings from this reporter were rejected.`)
  else if (reporter.lastHour >= 3) add('reporter', 'Reporter', 'warn', `${reporter.lastHour} readings from this reporter in the last hour.`)
  else if (reporter.published >= 1) add('reporter', 'Reporter', 'pass', `${reporter.published} earlier reading${reporter.published === 1 ? '' : 's'} from this reporter ${reporter.published === 1 ? 'was' : 'were'} published.`)
  else add('reporter', 'Reporter', 'info', 'First reading from this reporter.')

  // What Jev reads. Plain facts, the checklist, and the house rules.
  const state: JevState = {
    task: 'Decide whether a water-quality reading submitted to a community database should be published on its public map.',
    reading: {
      contaminant: c.name,
      value: `${level} ${sample.unit}`,
      source: device ? 'The initiative\'s own identifier device (device key verified)' : 'Public web form, filled in by a citizen scientist',
      treatment: sample.treatmentStatus,
      location: sample.location,
      water_body: point?.waterBody ?? null,
      utility: u ? `${u.name}, ${u.city}, ${u.state}` : null,
      sample_date: sample.sampleDate.toISOString().slice(0, 10),
      submitted_at: sample.createdAt.toISOString(),
      notes: device ? sample.notes : contributorNotes(sample.notes) || null,
    },
    benchmarks: refs.map(b => `${b.kind}: ${b.value} ${b.unit ?? ''}`.trim()),
    published_history: {
      count: n,
      median: n ? fmt(median(history.levels)) : null,
      p95: n ? fmt(percentile(history.levels, 0.95)) : null,
      nearby_count: local.length,
      nearby_median: local.length ? fmt(median(local)) : null,
      unit: sample.unit,
    },
    reporter: device ? null : reporter ? { published_before: reporter.published, rejected_before: reporter.rejected, pending: reporter.pending, sent_in_last_hour: reporter.lastHour } : 'unknown',
    checks: checks.map(check => `${check.status.toUpperCase()} · ${check.label}: ${check.detail}`),
    rules: [
      'Publish only when every check passes or is informational and the value is believable for this contaminant and source.',
      'Hold when a check warns or something is unclear; a person will look at it.',
      'Reject when the value is impossible, the reading is a duplicate, or it looks like a test, a joke or spam.',
      'Microplastics have no legal limit and vary over orders of magnitude; bottled water can legitimately read hundreds of thousands of particles per litre.',
    ],
  }
  return { checks, state }
}

// -- Deciding ---------------------------------------------------------------

function decide(checks: ReviewCheck[], answers: JevAnswers): { decision: ReviewDecision; confidence: number } {
  const failed = checks.some(check => check.status === 'fail')
  const { choice: pick, confidence } = answers.decision
  const believable = answers.plausible.noul
  if (pick === 'reject' && confidence >= REJECT_CONFIDENCE && believable <= PLAUSIBLE_TO_REJECT) return { decision: 'reject', confidence }
  if (!failed && pick === 'publish' && confidence >= PUBLISH_CONFIDENCE && believable >= PLAUSIBLE_TO_PUBLISH) return { decision: 'publish', confidence }
  return { decision: 'hold', confidence }
}

const VERB: Record<ReviewDecision, string> = { publish: 'published', hold: 'held for a reviewer', reject: 'rejected' }

function summarize(by: string, decision: ReviewDecision, confidence: number | null, checks: ReviewCheck[]): string {
  const pct = confidence == null ? '' : ` (${Math.round(confidence * 100)}%)`
  const notable = [...checks.filter(c => c.status === 'fail'), ...checks.filter(c => c.status === 'warn')]
  const detail = notable.length
    ? notable.slice(0, 2).map(c => c.detail).join(' ')
    : decision === 'publish'
      ? [checks.find(c => c.id === 'source'), checks.find(c => c.id === 'history')].filter(Boolean).map(c => c!.detail).join(' ')
      : 'No check flagged it; this is Jev\'s own reading of the submission.'
  return `${by} ${VERB[decision]}${pct}. ${detail}`.trim().slice(0, 300)
}

// -- Persisting -------------------------------------------------------------

async function saveReview(sampleId: string, review: ReadingReview): Promise<void> {
  const row = {
    decision: review.decision,
    decidedBy: review.decidedBy,
    confidence: review.confidence,
    model: review.model,
    summary: review.summary,
    checks: review.checks as unknown as Prisma.InputJsonValue,
    answers: review.answers == null ? Prisma.JsonNull : (review.answers as unknown as Prisma.InputJsonValue),
    createdAt: new Date(review.createdAt),
  }
  try {
    await db.sampleReview.upsert({ where: { sampleId }, create: { sampleId, ...row }, update: row })
  } catch (error) {
    // Before the migration the decision still applies; only the detail is lost.
    if (!isMissingTable(error)) throw error
  }
  await db.sample.update({
    where: { id: sampleId },
    data: {
      verificationStatus: review.decision === 'publish' ? 'VERIFIED' : review.decision === 'reject' ? 'REJECTED' : 'UNREVIEWED',
      verifiedAt: review.decision === 'publish' ? new Date(review.createdAt) : null,
    },
  })
}

export async function loadReviews(sampleIds: string[]): Promise<Map<string, ReadingReview>> {
  const reviews = new Map<string, ReadingReview>()
  if (!sampleIds.length) return reviews
  try {
    const rows = await db.sampleReview.findMany({ where: { sampleId: { in: sampleIds } } })
    for (const row of rows) {
      reviews.set(row.sampleId, {
        decision: row.decision as ReviewDecision,
        decidedBy: row.decidedBy,
        confidence: row.confidence,
        model: row.model,
        summary: row.summary,
        checks: Array.isArray(row.checks) ? (row.checks as unknown as ReviewCheck[]) : [],
        answers: row.answers && typeof row.answers === 'object' ? (row.answers as unknown as JevAnswers) : null,
        createdAt: row.createdAt.toISOString(),
      })
    }
  } catch (error) {
    if (!isMissingTable(error)) throw error
  }
  return reviews
}

// -- Entry points -----------------------------------------------------------

/** Run the checklist and ask Jev; the reading's publication state follows the decision. */
export async function reviewReading(sampleId: string): Promise<ReadingReview> {
  const sample = await loadSample(sampleId)
  const [points, contributors] = await Promise.all([loadCollectionPoints([sampleId]), loadContributors([sample])])
  const { checks, state } = await runChecks(sample, points.get(sampleId) ?? null, contributors.get(sampleId) ?? null)
  const createdAt = new Date().toISOString()
  const held = (why: string): ReadingReview => ({ decision: 'hold', decidedBy: 'checks', confidence: null, model: null, summary: `Waiting for a reviewer: ${why}`, checks, answers: null, createdAt })

  let review: ReadingReview
  const model = jev()
  if (!model) review = held('Jev is not configured (set TYPESAFE_API_KEY).')
  else {
    try {
      const result = await model.systemOne({ state, questions: QUESTIONS })
      const { decision, confidence } = decide(checks, result.answers)
      review = { decision, decidedBy: 'jev', confidence, model: result.model, summary: summarize('Jev', decision, confidence, checks), checks, answers: result.answers, createdAt }
    } catch (error) {
      console.error('[reading-review] Jev did not answer:', error instanceof Error ? error.message : error)
      review = held('Jev could not be reached.')
    }
  }
  await saveReview(sampleId, review)
  return review
}

/** An admin's call, recorded against the checklist Jev saw (or a fresh one). */
export async function recordAdminDecision(sampleId: string, decision: ReviewDecision, admin: { name: string; email: string }): Promise<ReadingReview> {
  const existing = (await loadReviews([sampleId])).get(sampleId)
  let checks = existing?.checks ?? []
  if (!checks.length) {
    const sample = await loadSample(sampleId)
    const [points, contributors] = await Promise.all([loadCollectionPoints([sampleId]), loadContributors([sample])])
    checks = (await runChecks(sample, points.get(sampleId) ?? null, contributors.get(sampleId) ?? null)).checks
  }
  const review: ReadingReview = {
    decision,
    decidedBy: admin.email,
    confidence: null,
    model: existing?.model ?? null,
    summary: `${admin.name} ${VERB[decision]} this reading${existing?.decidedBy === 'jev' ? ` (Jev had ${VERB[existing.decision]} it)` : ''}.`,
    checks,
    answers: existing?.answers ?? null,
    createdAt: new Date().toISOString(),
  }
  await saveReview(sampleId, review)
  return review
}

/** Ask Jev about every submitted reading still waiting, newest first. */
export async function reviewPendingReadings(limit = 40): Promise<Record<ReviewDecision | 'reviewed', number>> {
  const { samples } = await readSamples({ id: true }, {
    where: { AND: [SUBMITTED_WHERE, { verificationStatus: 'UNREVIEWED' }] },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  const counts = { reviewed: 0, publish: 0, hold: 0, reject: 0 }
  // One at a time: the queue is small and Jev answers in well under a second.
  for (const { id } of samples) {
    const review = await reviewReading(id)
    counts.reviewed++
    counts[review.decision]++
  }
  return counts
}
