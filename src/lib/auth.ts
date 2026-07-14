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

// Sessions are stored in the database (see the Session model in schema.prisma)
// rather than in-memory. On serverless hosts like Netlify, each request can be
// handled by a different, short-lived function instance with its own empty
// memory, so an in-memory Map would randomly "forget" logged-in admins.

export async function createSession(userId: string): Promise<string> {
  const token =
    Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)
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
