// Tiny synchronous hash for demo admin auth (NOT for production secrets).
// Good enough for a small volunteer non-profit admin panel.
import { cookies } from 'next/headers'
import { db } from './db'

export function hashPassword(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i)
    h |= 0
  }
  return 'h' + Math.abs(h).toString(16)
}

const SESSION_COOKIE = 'ag_session'
const SESSION_TTL_HOURS = 12

// In-memory session store (resets on server restart, which is fine for a demo).
// Key = random token, value = userId
const sessions = new Map<string, { userId: string; expires: number }>()

export function createSession(userId: string): string {
  const token =
    Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)
  sessions.set(token, { userId, expires: Date.now() + SESSION_TTL_HOURS * 3600_000 })
  return token
}

export function getSession(token?: string) {
  if (!token) return null
  const s = sessions.get(token)
  if (!s) return null
  if (s.expires < Date.now()) {
    sessions.delete(token)
    return null
  }
  return s
}

export function destroySession(token?: string) {
  if (token) sessions.delete(token)
}

export async function requireAdmin(): Promise<{ id: string; email: string; name: string; role: string } | null> {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE)?.value
  const session = getSession(token)
  if (!session) return null
  const user = await db.user.findUnique({ where: { id: session.userId } })
  if (!user) return null
  return { id: user.id, email: user.email, name: user.name, role: user.role }
}

export const SESSION_COOKIE_NAME = SESSION_COOKIE
export const SESSION_COOKIE_MAX_AGE = SESSION_TTL_HOURS * 3600
