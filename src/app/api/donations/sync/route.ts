import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireAdmin } from '@/lib/auth'

// HCB (Hack Club) fiscal-sponsorship public API. Donations made through the
// embedded HCB form land there, not in our database - this sync pulls them in.
const HCB_ORG_ID = 'org_nyu2Gw'
const HCB_DONATIONS_URL = `https://hcb.hackclub.com/api/v3/organizations/${HCB_ORG_ID}/donations?per_page=100`

type HcbDonation = {
  id: string
  amount_cents: number
  date: string
  memo?: string | null
  status?: string
  donor?: { name?: string | null; anonymous?: boolean } | null
}

// Map HCB processing states onto the admin's pledged/completed statuses.
function hcbStatusToLocal(status?: string): string {
  return status === 'in_transit' || status === 'pending' ? 'pledged' : 'completed'
}

// GET /api/donations/sync - admin only. Pulls recent HCB donations and upserts
// them by their HCB id so repeated syncs never create duplicates.
export async function POST() {
  const admin = await requireAdmin()
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let donations: HcbDonation[]
  try {
    const res = await fetch(HCB_DONATIONS_URL, {
      headers: { 'User-Agent': 'RippleEffect/1.0 (donation sync)' },
      // Donations change rarely; don't let a stale CDN value hide one.
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    })
    if (!res.ok) {
      return NextResponse.json({ error: `HCB API returned ${res.status}` }, { status: 502 })
    }
    donations = (await res.json()) as HcbDonation[]
    if (!Array.isArray(donations)) {
      return NextResponse.json({ error: 'Unexpected HCB API response' }, { status: 502 })
    }
  } catch {
    return NextResponse.json({ error: 'Could not reach the HCB API' }, { status: 502 })
  }

  let created = 0
  let updated = 0
  for (const d of donations) {
    if (!d?.id || !Number.isFinite(d.amount_cents)) continue
    const amount = d.amount_cents / 100
    const tier = amount >= 1000 ? 'Founding' : amount >= 250 ? 'Champion' : amount >= 50 ? 'Friend' : 'Supporter'
    const localStatus = hcbStatusToLocal(d.status)
    const data = {
      name: d.donor?.anonymous ? 'Anonymous' : (d.donor?.name ?? d.memo ?? 'HCB donor').slice(0, 120),
      amount,
      tier,
      status: localStatus,
    }
    const existing = await db.donation.findUnique({ where: { externalId: d.id } })
    if (existing) {
      // Only touch the status/amount - never clobber an admin's edits to name.
      await db.donation.update({
        where: { id: existing.id },
        data: { amount, tier, status: localStatus },
      })
      updated++
    } else {
      await db.donation.create({ data: { ...data, externalId: d.id } })
      created++
    }
  }

  const total = await db.donation.count()
  return NextResponse.json({ ok: true, created, updated, total })
}
