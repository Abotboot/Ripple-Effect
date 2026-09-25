import { createHash } from 'crypto'
import type { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'

// Fixed-window limits stored in PostgreSQL, so every server instance shares
// one count. Before the RequestThrottle migration is applied, limits fall back
// to the per-process counter rather than rejecting every submission.

export type ThrottleRule = { windowMs: number; max: number }
export type ThrottleResult = { allowed: boolean; retryAfterSec: number }

const PEPPER = process.env.THROTTLE_KEY_SECRET ?? 'ripple-throttle-v1'
let warnedFallback = false

function digest(scope: string, identifier: string): string {
  return createHash('sha256').update(`${PEPPER}\u0000${scope}\u0000${identifier}`).digest('hex')
}

function isMissingThrottleTable(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false
  const candidate = error as { code?: unknown; meta?: { code?: unknown } }
  // P2010 wraps the raw Postgres error; 42P01 is "undefined_table".
  return candidate.code === 'P2021' || (candidate.code === 'P2010' && candidate.meta?.code === '42P01')
}

export async function consumeThrottle(scope: string, identifier: string, rule: ThrottleRule): Promise<ThrottleResult> {
  const key = digest(scope, identifier)
  const windowSeconds = Math.ceil(rule.windowMs / 1000)
  try {
    const rows = await db.$queryRaw<Array<{ count: number; windowStart: Date }>>`
      INSERT INTO "RequestThrottle" ("key", "count", "windowStart")
      VALUES (${key}, 1, NOW())
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RequestThrottle"."windowStart" <= NOW() - make_interval(secs => ${windowSeconds}::int)
                       THEN 1 ELSE "RequestThrottle"."count" + 1 END,
        "windowStart" = CASE WHEN "RequestThrottle"."windowStart" <= NOW() - make_interval(secs => ${windowSeconds}::int)
                             THEN NOW() ELSE "RequestThrottle"."windowStart" END
      RETURNING "count", "windowStart"`
    const row = rows[0]
    if (Math.random() < 0.02) {
      // Opportunistic cleanup keeps the counter table bounded.
      void db.$executeRaw`DELETE FROM "RequestThrottle" WHERE "windowStart" < NOW() - INTERVAL '2 days'`.catch(() => {})
    }
    const count = Number(row?.count ?? 1)
    const resetAt = (row?.windowStart ? new Date(row.windowStart).getTime() : Date.now()) + rule.windowMs
    return { allowed: count <= rule.max, retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) }
  } catch (error) {
    if (!isMissingThrottleTable(error)) throw error
    if (!warnedFallback) {
      warnedFallback = true
      console.warn('[throttle] RequestThrottle table missing; using per-process limits until migrations are applied.')
    }
    return { allowed: checkRateLimit(key, rule), retryAfterSec: windowSeconds }
  }
}

/** Reads a counter without advancing it (for "count failures only" limits). */
export async function throttleBlocked(scope: string, identifier: string, rule: ThrottleRule): Promise<ThrottleResult> {
  const key = digest(scope, identifier)
  try {
    const rows = await db.$queryRaw<Array<{ count: number; windowStart: Date }>>`
      SELECT "count", "windowStart" FROM "RequestThrottle"
      WHERE "key" = ${key} AND "windowStart" > NOW() - make_interval(secs => ${Math.ceil(rule.windowMs / 1000)}::int)`
    const row = rows[0]
    if (!row || Number(row.count) < rule.max) return { allowed: true, retryAfterSec: 0 }
    const resetAt = new Date(row.windowStart).getTime() + rule.windowMs
    return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((resetAt - Date.now()) / 1000)) }
  } catch (error) {
    if (!isMissingThrottleTable(error)) throw error
    return { allowed: true, retryAfterSec: 0 }
  }
}

export async function clearThrottle(scope: string, identifier: string): Promise<void> {
  const key = digest(scope, identifier)
  await db.$executeRaw`DELETE FROM "RequestThrottle" WHERE "key" = ${key}`.catch(error => {
    if (!isMissingThrottleTable(error)) throw error
  })
}

/** Every rule must pass. All counters advance, so a rejected burst still counts. */
export async function consumeThrottles(checks: Array<[scope: string, identifier: string, rule: ThrottleRule]>): Promise<ThrottleResult> {
  let result: ThrottleResult = { allowed: true, retryAfterSec: 0 }
  for (const [scope, identifier, rule] of checks) {
    const next = await consumeThrottle(scope, identifier, rule)
    if (!next.allowed) result = { allowed: false, retryAfterSec: Math.max(result.retryAfterSec, next.retryAfterSec) }
  }
  return result
}

export function clientAddress(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0].trim() || req.headers.get('x-real-ip')?.trim() || 'unknown'
}

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
