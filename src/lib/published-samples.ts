import type { Prisma } from '@prisma/client'

// Submitted readings (the public form, or the identifier device) reach public
// pages only once a review has published them (see reading-review.ts).
// Institutional imports and the seeded illustrative records are not gated.

/** Which Sample rows count as submitted readings. */
export const SUBMITTED_WHERE: Prisma.SampleWhereInput = Object.freeze({
  OR: [{ quality: 'citizen' }, { robot: true }],
})
const NOT_VERIFIED: Prisma.SampleWhereInput = { verificationStatus: { not: 'VERIFIED' } }

/**
 * Sample rows that may appear on public pages. One shared object, so
 * sample-read.ts can recognise it by identity and swap in the legacy form
 * when a database has no verificationStatus column yet.
 */
export const PUBLISHED_GATE: Prisma.SampleWhereInput = Object.freeze({
  NOT: { AND: [SUBMITTED_WHERE, NOT_VERIFIED] },
})

/** Without a verificationStatus column nothing submitted can have been reviewed, so none of it shows. */
export const LEGACY_PUBLISHED_GATE: Prisma.SampleWhereInput = Object.freeze({ NOT: SUBMITTED_WHERE })

/** A where clause for public reads: the caller's conditions, behind the gate. */
export function published(where: Prisma.SampleWhereInput = {}): Prisma.SampleWhereInput {
  return { AND: [PUBLISHED_GATE, where] }
}
