import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'

// GET /api/auth/me
export async function GET() {
  const user = await requireAdmin()
  return NextResponse.json({ user })
}
