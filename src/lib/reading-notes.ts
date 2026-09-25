// Legacy citizen readings stored contributor details inside Sample.notes as
// "reporter:<email> | name:<name> | location:<text> | notes:<text>". New
// submissions keep contact details in SampleContributor instead, but older
// rows (and databases that have not run the backfill) still use this format.

const FIELD_SEPARATOR = ' | '

type LegacyFields = { reporter?: string; name?: string; location?: string; notes?: string }

function segments(notes: string): string[] {
  return notes.split(FIELD_SEPARATOR)
}

/** Split on the exact separator, so a '|' inside a value never ends a field early. */
export function parseReadingNotes(notes: string | null | undefined): LegacyFields & { structured: boolean } {
  if (!notes) return { structured: false }
  const fields: LegacyFields = {}
  let structured = false
  for (const segment of segments(notes)) {
    const match = /^(reporter|name|location|notes):/.exec(segment)
    if (!match) continue
    structured = true
    const key = match[1] as keyof LegacyFields
    fields[key] ??= segment.slice(match[0].length).trim()
  }
  return { ...fields, structured }
}

/** Notes safe for public responses: every reporter segment is removed whole. */
export function publicSampleNotes(notes: string | null | undefined): string | null {
  if (!notes) return null
  const kept = segments(notes).filter(segment => !segment.trimStart().startsWith('reporter:'))
  const joined = kept.join(FIELD_SEPARATOR).trim()
  return joined || null
}

// Deliberately narrower than RFC 5322: no whitespace, quotes or '|', so a
// contact address can never collide with any delimiter used in stored text.
const CONTACT_EMAIL = /^[A-Za-z0-9._%+'-]{1,64}@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/

export function normalizeContactEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const email = value.trim().toLowerCase()
  if (email.length > 254 || !CONTACT_EMAIL.test(email)) return null
  return email
}
