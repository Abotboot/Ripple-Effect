import { cookies } from 'next/headers'
import { db } from './db'
import { scryptSync, randomBytes, timingSafeEqual, createHash } from 'crypto'

// Secure password hashing using Node's built-in crypto.scryptSync.
// scrypt is a memory-hard key derivation function designed to be slow
// and expensive to brute-force. We store hashes as "salt:hash" in the DB.
//
// Format: "scrypt:<salt_hex>:<hash_hex>"
// Anything else is rejected. The retired "h<hex>" format was a 32-bit string
// hash with trivial collisions ("Aa" and "BB" matched), so accounts still
// holding one must be reset out of band: scripts/maintenance/create-admin.ts.

const SCRYPT_KEYLEN = 64
const SCRYPT_SALTLEN = 16
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } // standard production params

export function hashPassword(s: string): string {
  const salt = randomBytes(SCRYPT_SALTLEN)
  const hash = scryptSync(s, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(s: string, stored: string): boolean {
  if (!stored.startsWith('scrypt:')) return false

  const parts = stored.split(':')
  if (parts.length !== 3) return false
  const salt = Buffer.from(parts[1], 'hex')
  const expectedHash = Buffer.from(parts[2], 'hex')
  if (salt.length === 0 || expectedHash.length !== SCRYPT_KEYLEN) return false
  const hash = scryptSync(s, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)

  // Use timingSafeEqual to prevent timing attacks
  return timingSafeEqual(hash, expectedHash)
}

const SESSION_COOKIE = 'ag_session'
const SESSION_TTL_HOURS = 12

// Sessions are stored in the database as SHA-256 digests of the cookie value,
// so a leaked database copy cannot be replayed as live admin sessions.
function sessionDigest(token: string): string {
  return 'sha256:' + createHash('sha256').update(token).digest('hex')
}

export async function createSession(userId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  await db.session.create({
    data: { token: sessionDigest(token), userId, expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 3600_000) },
  })
  return token
}

export async function getSession(token?: string) {
  if (!token || token.length > 128) return null
  const digest = sessionDigest(token)
  const session = await db.session.findUnique({ where: { token: digest } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { token: digest } }).catch(() => {})
    return null
  }
  return session
}

export async function destroySession(token?: string) {
  if (!token || token.length > 128) return
  await db.session.delete({ where: { token: sessionDigest(token) } }).catch(() => {})
}

export async function requireAdmin(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const session = await getSession(token)
  if (!session) return null
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user || user.role !== 'admin') return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_HOURS * 3600
