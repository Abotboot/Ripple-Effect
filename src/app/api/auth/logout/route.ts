import { NextResponse } from 'next/server'
import { destroySession, SESSION_COOKIE_NAME } from '@/lib/auth'
import { cookies } from 'next/headers'

// POST /api/auth/logout
export async function POST() {
  const store = await cookies()
  const token = store.get(SESSION_COOKIE_NAME)?.value
  destroySession(token)
  const res = NextResponse.json({ ok: true })
  res.cookies.delete(SESSION_COOKIE_NAME)
  return res
}
