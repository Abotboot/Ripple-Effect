import { cookies } from 'next/headers'
import { db } from './db'
import { scryptSync, randomBytes, timingSafeEqual } from 'crypto'

// Secure password hashing using Node's built-in crypto.scryptSync.
// scrypt is a memory-hard key derivation function designed to be slow
// and expensive to brute-force. We store hashes as "salt:hash" in the DB.
//
// Format: "scrypt:<salt_hex>:<hash_hex>"
// Old format ("h<hex>") is the legacy weak hash - supported for migration
// but all new passwords use scrypt.

const SCRYPT_KEYLEN = 64
const SCRYPT_SALTLEN = 16
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } // standard production params

export function hashPassword(s: string): string {
  const salt = randomBytes(SCRYPT_SALTLEN)
  const hash = scryptSync(s, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`
}

export function verifyPassword(s: string, stored: string): boolean {
  // Handle legacy weak hashes for migration (h<hex> format)
  if (stored.startsWith('h') && !stored.startsWith('scrypt:')) {
    // Legacy weak hash - verify with old algorithm, caller should rehash
    return legacyHash(s) === stored
  }

  if (!stored.startsWith('scrypt:')) return false

  const parts = stored.split(':')
  if (parts.length !== 3) return false
  const salt = Buffer.from(parts[1], 'hex')
  const expectedHash = Buffer.from(parts[2], 'hex')
  const hash = scryptSync(s, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)

  // Use timingSafeEqual to prevent timing attacks
  if (hash.length !== expectedHash.length) return false
  return timingSafeEqual(hash, expectedHash)
}

/** Check if a password hash uses the legacy weak algorithm (needs rehashing). */
export function needsRehash(stored: string): boolean {
  return !stored.startsWith('scrypt:')
}

// Legacy hash function - only used for verifying old passwords during migration.
function legacyHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return 'h' + Math.abs(h).toString(16)
}

const SESSION_COOKIE = 'ag_session'
const SESSION_TTL_HOURS = 12

// Sessions are stored in the database.
export async function createSession(userId: string): Promise<string> {
  const token =
    randomBytes(32).toString('hex') + Date.now().toString(36)
  await db.session.create({
    data: { token, userId, expiresAt: new Date(Date.now() + SESSION_TTL_HOURS * 3600_000) },
  })
  return token
}

export async function getSession(token?: string) {
  if (!token) return null
  const session = await db.session.findUnique({ where: { token } })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await db.session.delete({ where: { token } }).catch(() => {})
    return null
  }
  return session
}

export async function destroySession(token?: string) {
  if (!token) return
  await db.session.delete({ where: { token } }).catch(() => {})
}

export async function requireAdmin(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const session = await getSession(token)
  if (!session) return null
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_HOURS * 3600
