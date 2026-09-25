import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, hashPassword, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/auth'
import { clearThrottle, clientAddress, consumeThrottle, HOUR, MINUTE, throttleBlocked } from '@/lib/durable-throttle'

// Counted in the database so every server instance shares the same limits.
// Any client: 10 attempts per 15 minutes. One account from one client: 5
// failures per 15 minutes. One account from anywhere: 50 failures per hour,
// a ceiling for distributed guessing that a single client cannot reach alone
// (so nobody can lock the real admin out with a handful of bad requests).
const CLIENT_RULE = { windowMs: 15 * MINUTE, max: 10 }
const ACCOUNT_CLIENT_RULE = { windowMs: 15 * MINUTE, max: 5 }
const ACCOUNT_RULE = { windowMs: HOUR, max: 50 }

// Unknown accounts still pay for one scrypt run, so response time does not
// reveal which emails have admin accounts.
const TIMING_DECOY = hashPassword('ripple-timing-decoy')

function tooMany(retryAfterSec: number, message: string) {
  return NextResponse.json(
    { error: `${message} Try again in ${retryAfterSec} seconds.` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSec) } }
  )
}

// POST /api/auth/login { email, password }
export async function POST(req: NextRequest) {
  const client = clientAddress(req)
  const ipCheck = await consumeThrottle('login:ip', client, CLIENT_RULE)
  if (!ipCheck.allowed) return tooMany(ipCheck.retryAfterSec, 'Too many login attempts.')

  const body = await req.json().catch(() => null)
  if (!body) {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 })
  }
  const email = String(body?.email ?? '').toLowerCase().trim()
  const password = String(body?.password ?? '')
  if (!email || !password) {
    return NextResponse.json(
      { error: 'Email and password are required' },
      { status: 400 }
    )
  }

  if (email.length > 254 || password.length > 1024) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const accountClient = `${email}\u0000${client}`
  for (const [scope, id, rule] of [
    ['login:account-client', accountClient, ACCOUNT_CLIENT_RULE],
    ['login:account', email, ACCOUNT_RULE],
  ] as const) {
    const blocked = await throttleBlocked(scope, id, rule)
    if (!blocked.allowed) return tooMany(blocked.retryAfterSec, 'Too many failed login attempts for this account.')
  }

  const user = await db.user.findUnique({ where: { email } })
  // Legacy (non-scrypt) hashes never verify; those accounts need a reset.
  const usable = user?.password.startsWith('scrypt:') ? user.password : null
  const valid = verifyPassword(password, usable ?? TIMING_DECOY) && usable !== null
  if (!user || !valid) {
    await consumeThrottle('login:account-client', accountClient, ACCOUNT_CLIENT_RULE)
    await consumeThrottle('login:account', email, ACCOUNT_RULE)
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  await clearThrottle('login:account-client', accountClient)
  const token = await createSession(user.id)
  const res = NextResponse.json({
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_COOKIE_MAX_AGE,
  })
  return res
}
