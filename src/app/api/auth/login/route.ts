import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyPassword, needsRehash, hashPassword, createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from '@/lib/auth'
import { ensureSeeded } from '@/lib/ensure-seeded'

// Simple in-memory rate limiting for login attempts.
// Tracks attempts per IP address. Max 5 attempts per 15 minutes.
// In production, use Redis or a proper rate-limiter, but this is
// sufficient for a small volunteer site and prevents brute-force attacks.
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const RATE_LIMIT_MAX = 5
const attemptMap = new Map<string, { count: number; firstAttempt: number }>()

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec?: number } {
  const now = Date.now()
  const entry = attemptMap.get(ip)

  if (!entry || now - entry.firstAttempt > RATE_LIMIT_WINDOW_MS) {
    attemptMap.set(ip, { count: 1, firstAttempt: now })
    return { allowed: true }
  }

  entry.count++
  if (entry.count > RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((entry.firstAttempt + RATE_LIMIT_WINDOW_MS - now) / 1000)
    return { allowed: false, retryAfterSec }
  }

  return { allowed: true }
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  const real = req.headers.get('x-real-ip')
  if (real) return real
  return 'unknown'
}

// POST /api/auth/login { email, password }
export async function POST(req: NextRequest) {
  await ensureSeeded()

  // Rate limit check
  const ip = getClientIp(req)
  const rateCheck = checkRateLimit(ip)
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `Too many login attempts. Try again in ${rateCheck.retryAfterSec} seconds.` },
      { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSec) } }
    )
  }

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

  const user = await db.user.findUnique({ where: { email } })
  if (!user || !verifyPassword(password, user.password)) {
    return NextResponse.json(
      { error: 'Invalid email or password' },
      { status: 401 }
    )
  }

  // If the password hash is legacy (weak), upgrade it to scrypt now
  if (needsRehash(user.password)) {
    const newHash = hashPassword(password)
    await db.user.update({ where: { id: user.id }, data: { password: newHash } })
  }

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
