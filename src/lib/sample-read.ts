import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

/** Read compatibility only. These defaults must never promote historical quality labels. */
const LEGACY_METADATA = {
  provenance: 'UNKNOWN',
  verificationStatus: 'UNREVIEWED',
  sourceUrl: null,
  sourceRecordId: null,
  reportingPeriod: null,
  method: null,
  verifiedAt: null,
} as const

export type SampleReadStatus = {
  status: 'available' | 'degraded'
  code: 'legacy_sample_schema' | null
  provenanceAvailable: boolean
}

/** Explicit projection: include-all reads would also request absent migration columns. */
export const SAMPLE_READ_FIELDS = {
  id: true, utilityId: true, contaminantId: true, level: true, unit: true,
  sampleDate: true, source: true, robot: true, treatmentStatus: true,
  location: true, quality: true, notes: true, createdAt: true,
  provenance: true, verificationStatus: true, sourceUrl: true,
  sourceRecordId: true, reportingPeriod: true, method: true, verifiedAt: true,
} as const satisfies Prisma.SampleSelect

export function isMissingSampleMetadataColumn(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; meta?: { modelName?: unknown; column?: unknown } }
  if (candidate.code !== 'P2022' || typeof candidate.meta?.column !== 'string') return false
  // Use Prisma's structured error, never a substring in an arbitrary exception message.
  const parts = candidate.meta.column.replaceAll('"', '').split('.')
  const column = parts.pop()
  const table = parts.pop()
  if (table != null && table !== 'Sample') return false
  if (table == null && candidate.meta.modelName !== 'Sample') return false
  return column != null && Object.hasOwn(LEGACY_METADATA, column)
}

type ReadOptions = Pick<Prisma.SampleFindManyArgs, 'where' | 'orderBy' | 'take' | 'skip' | 'cursor' | 'distinct'>

function dependsOnMetadata(value: unknown): boolean {
  if (typeof value === 'string') return Object.hasOwn(LEGACY_METADATA, value)
  if (!value || typeof value !== 'object') return false
  return Object.entries(value).some(([key, nested]) => Object.hasOwn(LEGACY_METADATA, key) || dependsOnMetadata(nested))
}

/**
 * Retry exactly once, and only after Prisma confirms an absent Sample metadata column.
 * No cache: a later request can see a repaired schema immediately. No writes or raw SQL.
 * Metadata-dependent filters/orderings cannot be preserved on the old schema, so fail.
 */
export async function readSamples<const Select extends Prisma.SampleSelect>(
  select: Select,
  options: ReadOptions = {},
): Promise<{ samples: Prisma.SampleGetPayload<{ select: Select }>[]; dataStatus: SampleReadStatus }> {
  try {
    const samples = await db.sample.findMany({ ...options, select })
    return { samples: samples as Prisma.SampleGetPayload<{ select: Select }>[],
      dataStatus: { status: 'available', code: null, provenanceAvailable: true } }
  } catch (error) {
    if (!isMissingSampleMetadataColumn(error) || dependsOnMetadata(options)) throw error
    const legacySelect = Object.fromEntries(Object.entries(select)
      .filter(([key]) => !Object.hasOwn(LEGACY_METADATA, key))) as Prisma.SampleSelect
    const rows = await db.sample.findMany({ ...options, select: legacySelect })
    const defaults = Object.fromEntries(Object.entries(LEGACY_METADATA).filter(([key]) => select[key as keyof Select] === true))
    const samples = rows.map(row => ({ ...row, ...defaults })) as Prisma.SampleGetPayload<{ select: Select }>[]
    return { samples, dataStatus: { status: 'degraded', code: 'legacy_sample_schema', provenanceAvailable: false } }
  }
}

/** Array endpoints preserve their response shape while exposing compatibility status. */
export function sampleReadHeaders(status: SampleReadStatus): Record<string, string> {
  return {
    'X-Ripple-Data-Status': status.status,
    ...(status.code ? { 'X-Ripple-Data-Code': status.code } : {}),
    'Cache-Control': 'no-store',
  }
}
