'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HandHeart, Heart, Sparkles, CheckCircle2, Loader2, Send,
  ExternalLink, Wrench, FlaskConical, Microscope, Database, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Donation } from '@/lib/types'

const GOAL = 25000

type Tier = {
  id: string
  name: string
  min: number
  blurb: string
  accent: string
  ring: string
  iconBg: string
  iconText: string
  badge: string
}

const TIERS: Tier[] = [
  {
    id: 'supporter',
    name: 'Supporter',
    min: 25,
    blurb: 'Gets your name on our backers wall.',
    accent: 'border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30',
    ring: 'ring-rose-400/40',
    iconBg: 'bg-rose-100 dark:bg-rose-900/50',
    iconText: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200',
  },
  {
    id: 'friend',
    name: 'Friend',
    min: 50,
    blurb: 'Backer wall + a quarterly impact report.',
    accent: 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
    ring: 'ring-amber-400/40',
    iconBg: 'bg-amber-100 dark:bg-amber-900/50',
    iconText: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  },
  {
    id: 'champion',
    name: 'Champion',
    min: 250,
    blurb: 'All above + early access to the identifier kit waitlist.',
    accent: 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/30',
    ring: 'ring-fuchsia-400/40',
    iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-900/50',
    iconText: 'text-fuchsia-600 dark:text-fuchsia-300',
    badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-200',
  },
  {
    id: 'founding',
    name: 'Founding Sponsor',
    min: 1000,
    blurb: 'All above + credited as a founding sponsor on the site + a chapter kit sponsored in your name.',
    accent: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
    ring: 'ring-emerald-400/40',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconText: 'text-emerald-600 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200',
  },
]

const ALLOCATIONS = [
  {
    icon: Wrench,
    title: 'Identifier parts & PCBs',
    pct: 35,
    color: 'text-rose-600 dark:text-rose-300',
    bg: 'bg-rose-100 dark:bg-rose-900/40',
  },
  {
    icon: Microscope,
    title: 'Chapter kits (microscope + reagents)',
    pct: 30,
    color: 'text-amber-600 dark:text-amber-300',
    bg: 'bg-amber-100 dark:bg-amber-900/40',
  },
  {
    icon: FlaskConical,
    title: 'Lab verification of citizen samples',
    pct: 25,
    color: 'text-fuchsia-600 dark:text-fuchsia-300',
    bg: 'bg-fuchsia-100 dark:bg-fuchsia-900/40',
  },
  {
    icon: Database,
    title: 'Keeping the database free & open',
    pct: 10,
    color: 'text-emerald-600 dark:text-emerald-300',
    bg: 'bg-emerald-100 dark:bg-emerald-900/40',
  },
]

function formatCurrency(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(n)
}

export function DonateSection() {
  const { toast } = useToast()

  // Stats / progress
  const [raised, setRaised] = useState<number | null>(null)
  const [donorCount, setDonorCount] = useState<number>(0)
  const [statsLoading, setStatsLoading] = useState(true)

  // Form state
  const [form, setForm] = useState({
    name: '',
    email: '',
    amount: '',
    anonymous: false,
    message: '',
  })
  const [selectedTierId, setSelectedTierId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState<Donation | null>(null)

  // Recent supporters wall — populated from successful pledges by this visitor
  const [supporters, setSupporters] = useState<Array<{
    name: string
    amount: number
    message: string | null
    tier: string
    anonymous: boolean
    createdAt: string
  }>>([])

  // Fetch stats on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setStatsLoading(true)
      try {
        const s = await api.getStats()
        if (cancelled) return
        setRaised(s.donationsTotal ?? 0)
        setDonorCount(s.donationsCount ?? 0)
      } catch {
        if (!cancelled) {
          setRaised(0)
          setDonorCount(0)
        }
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const selectTier = (t: Tier) => {
    setSelectedTierId(t.id)
    setForm((f) => ({ ...f, amount: String(t.min) }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = form.name.trim()
    const amount = Number(form.amount)
    if (!name) {
      toast({
        title: 'Name required',
        description: 'Please enter your name (or check anonymous).',
        variant: 'destructive',
      })
      return
    }
    if (!Number.isFinite(amount) || amount < 1) {
      toast({
        title: 'Invalid amount',
        description: 'Please enter a donation amount of at least $1.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      const created = await api.submitDonation({
        name: form.anonymous ? 'Anonymous' : name,
        email: form.email.trim() || null,
        amount,
        message: form.message.trim() || null,
        anonymous: form.anonymous,
      })
      toast({
        title: 'Thank you! 🎉',
        description: `Your ${formatCurrency(amount)} pledge was recorded.`,
      })
      setSubmitted(created)
      // Update local progress + supporters wall
      setRaised((r) => (r ?? 0) + amount)
      setDonorCount((c) => c + 1)
      setSupporters((prev) => [
        {
          name: form.anonymous ? 'Anonymous' : name,
          amount,
          message: form.message.trim() || null,
          tier: created?.tier ?? 'Supporter',
          anonymous: form.anonymous,
          createdAt: created?.createdAt ?? new Date().toISOString(),
        },
        ...prev,
      ])
      setForm({ name: '', email: '', amount: '', anonymous: false, message: '' })
      setSelectedTierId(null)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      toast({
        title: 'Pledge failed',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const pct = raised != null ? Math.min(100, Math.round((raised / GOAL) * 100)) : 0

  return (
    <div className="bg-background">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white">
        {/* Animated decorative blobs */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -top-24 -left-20 h-72 w-72 rounded-full bg-white/25 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute top-10 right-[5%] h-64 w-64 rounded-full bg-amber-300/40 blur-3xl"
          animate={{ scale: [1.1, 1, 1.1], opacity: [0.6, 0.35, 0.6] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 0.5 }}
        />
        <motion.div
          aria-hidden
          className="pointer-events-none absolute bottom-0 left-[30%] h-56 w-56 rounded-full bg-pink-300/40 blur-3xl"
          animate={{ scale: [1, 1.25, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 5.5, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />

        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 border-white/40 bg-white/15 text-white hover:bg-white/20">
                <Sparkles className="mr-1 h-3 w-3" />
                Crowdfunding · GoFundMe-style
              </Badge>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight drop-shadow-sm sm:text-5xl">
                Fund the microplastics identifier
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-white/90 sm:text-lg">
                We&apos;re crowdfunding a low-cost, open-source microplastics
                identifier that chapters can dip directly into local water.
                Every dollar moves us closer to citizen-science kits in the
                field — and a free, open database anyone can use.
              </p>
            </motion.div>

            {/* Progress bar */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 }}
              className="mx-auto mt-8 max-w-xl rounded-2xl border border-white/30 bg-white/10 p-5 backdrop-blur-sm"
            >
              <div className="flex items-end justify-between gap-2">
                <div className="text-left">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                    Raised so far
                  </div>
                  {statsLoading ? (
                    <Skeleton className="mt-1 h-8 w-32 bg-white/20" />
                  ) : (
                    <div className="text-3xl font-extrabold leading-none sm:text-4xl">
                      {formatCurrency(raised ?? 0)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                    Goal
                  </div>
                  <div className="text-xl font-bold sm:text-2xl">
                    {formatCurrency(GOAL)}
                  </div>
                </div>
              </div>

              {/* Custom animated progress bar */}
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {statsLoading ? (
                    <Skeleton className="h-4 w-16 bg-white/20" />
                  ) : (
                    <span>
                      <span className="font-bold">{donorCount}</span> donor{donorCount === 1 ? '' : 's'}
                    </span>
                  )}
                </span>
                <span className="font-semibold">{pct}% funded</span>
              </div>
            </motion.div>

            {/* CTA buttons */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row"
            >
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="w-full bg-white text-rose-600 shadow-lg hover:bg-white/90 sm:w-auto"
              >
                <a
                  href="https://www.gofundme.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Donate on GoFundMe
                </a>
              </Button>
              <a
                href="#pledge"
                className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-white/50 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:w-auto"
              >
                <HandHeart className="h-4 w-4" />
                Or pledge below
              </a>
            </motion.div>
            <p className="mt-3 text-xs text-white/75">
              Prefer GoFundMe? We&apos;re setting up our campaign there too.
            </p>
          </div>
        </div>
      </section>

      {/* ── MAIN CONTENT ─────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Tier cards */}
        <div className="mb-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Choose your impact level
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Pick a tier to pre-fill the pledge form, or enter any amount you like.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t, i) => {
              const Icon = t.id === 'founding' ? Sparkles : t.id === 'champion' ? Heart : t.id === 'friend' ? Users : HandHeart
              const isSelected = selectedTierId === t.id
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card
                    className={cn(
                      'h-full overflow-hidden border-2 transition-all hover:shadow-lg',
                      t.accent,
                      isSelected && cn('ring-2 ring-offset-2', t.ring)
                    )}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', t.iconBg)}>
                          <Icon className={cn('h-5 w-5', t.iconText)} />
                        </div>
                        <Badge variant="secondary" className={t.badge}>
                          {formatCurrency(t.min)}+
                        </Badge>
                      </div>
                      <CardTitle className="mt-3 text-lg text-foreground">{t.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="min-h-[3rem] text-sm text-muted-foreground">{t.blurb}</p>
                      <Button
                        type="button"
                        variant={isSelected ? 'default' : 'outline'}
                        className="mt-3 w-full"
                        onClick={() => selectTier(t)}
                      >
                        {isSelected ? (
                          <><CheckCircle2 className="h-4 w-4" /> Selected</>
                        ) : (
                          <>Select {formatCurrency(t.min)}</>
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Pledge form + Where the money goes */}
        <div id="pledge" className="grid gap-6 lg:grid-cols-3">
          {/* Pledge form */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <HandHeart className="h-4 w-4 text-rose-500" />
                Make a pledge
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Pledge now and we&apos;ll follow up with payment instructions. Your
                pledge is recorded instantly and counted toward the goal above.
              </p>
            </CardHeader>
            <CardContent>
              {submitted ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="relative flex flex-col items-center justify-center overflow-hidden rounded-xl border border-rose-200 bg-rose-50 p-8 text-center dark:border-rose-900/60 dark:bg-rose-950/30"
                >
                  {/* confetti-like sparkles */}
                  {[...Array(8)].map((_, i) => {
                    const colors = ['#fbbf24', '#fb7185', '#e879f9', '#34d399', '#ffffff', '#fde047', '#f472b6', '#a78bfa']
                    const angle = (i / 8) * Math.PI * 2
                    const dist = 60 + (i % 3) * 20
                    return (
                      <motion.div
                        key={i}
                        aria-hidden
                        className="absolute h-2 w-2 rounded-full"
                        style={{
                          background: colors[i % colors.length],
                          top: '50%',
                          left: '50%',
                        }}
                        initial={{ x: 0, y: 0, opacity: 1, scale: 0 }}
                        animate={{
                          x: [0, Math.cos(angle) * dist],
                          y: [0, Math.sin(angle) * dist - 30],
                          opacity: [1, 0],
                          scale: [0, 1.4, 0.6],
                          rotate: [0, 180],
                        }}
                        transition={{ duration: 1.3, delay: 0.1 + i * 0.05, ease: 'easeOut' }}
                      />
                    )
                  })}
                  <motion.div
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 220, damping: 14 }}
                    className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/50"
                  >
                    <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-300" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-rose-900 dark:text-rose-100">
                    Thank you{submitted.name && submitted.name !== 'Anonymous' ? `, ${submitted.name}` : ''}! 🎉
                  </h3>
                  <p className="mt-2 max-w-sm text-sm text-rose-800 dark:text-rose-200">
                    Your <span className="font-bold">{formatCurrency(submitted.amount)}</span> pledge
                    ({submitted.tier} tier) is recorded. We&apos;ll email you with payment
                    instructions and your backer-wall link shortly.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-5 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/50"
                    onClick={() => setSubmitted(null)}
                  >
                    Make another pledge
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="dname" className="text-xs">Name *</Label>
                      <Input
                        id="dname"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="Jane Doe"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="demail" className="text-xs">Email (optional)</Label>
                      <Input
                        id="demail"
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="jane@example.com"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="damount" className="text-xs">Donation amount (USD) *</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground">
                        $
                      </span>
                      <Input
                        id="damount"
                        type="number"
                        min={1}
                        step={1}
                        value={form.amount}
                        onChange={(e) => {
                          setForm({ ...form, amount: e.target.value })
                          setSelectedTierId(null)
                        }}
                        placeholder="25"
                        className="pl-7"
                        required
                      />
                    </div>
                    {selectedTierId && (
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        Pre-filled from the <span className="font-semibold">{TIERS.find((t) => t.id === selectedTierId)?.name}</span> tier. Adjust freely.
                      </p>
                    )}
                  </div>

                  <div>
                    <Label htmlFor="dmessage" className="text-xs">Message (optional)</Label>
                    <Textarea
                      id="dmessage"
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder="Why you're supporting clean water..."
                      rows={3}
                    />
                  </div>

                  <label
                    htmlFor="danon"
                    className="flex cursor-pointer items-start gap-2 rounded-md border border-border bg-muted/40 p-3"
                  >
                    <Checkbox
                      id="danon"
                      checked={form.anonymous}
                      onCheckedChange={(v) => setForm({ ...form, anonymous: v === true })}
                      className="mt-0.5"
                    />
                    <span className="text-xs text-muted-foreground">
                      Make this anonymous — show as &quot;Anonymous&quot; on the
                      backers wall instead of my name.
                    </span>
                  </label>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
                    disabled={submitting}
                  >
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting pledge...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit pledge</>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    This records a pledge (intent to donate). We&apos;ll follow up
                    with payment options — GoFundMe, check, or direct transfer.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Where the money goes */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-amber-500" />
                Where the money goes
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Every dollar is earmarked for the build.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {ALLOCATIONS.map(({ icon: Icon, title, pct, color, bg }) => (
                <div key={title} className="rounded-lg border border-border p-3">
                  <div className="flex items-center gap-3">
                    <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', bg)}>
                      <Icon className={cn('h-4 w-4', color)} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold text-foreground">{title}</p>
                        <span className={cn('text-xs font-bold', color)}>{pct}%</span>
                      </div>
                      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className={cn('h-full rounded-full', bg)}
                          initial={{ width: 0 }}
                          whileInView={{ width: `${pct}%` }}
                          viewport={{ once: true }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <p className="pt-1 text-[11px] text-muted-foreground">
                100% of donations fund the identifier program and the free,
                open database.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent supporters mini-feed */}
        <div className="mt-12">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight sm:text-2xl">
              <Heart className="h-5 w-5 text-rose-500" />
              Recent supporters
            </h2>
            <Badge variant="outline" className="text-muted-foreground">
              {supporters.length} new{supporters.length === 1 ? '' : ' pledges'} this session
            </Badge>
          </div>

          {supporters.length === 0 ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center gap-2 p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/60" />
                <p className="text-sm text-muted-foreground">
                  Be the first to pledge today — your message will appear here
                  for others to see.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
              {supporters.map((s, i) => (
                <motion.div
                  key={`${s.createdAt}-${i}`}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <Card className="bg-card">
                    <CardContent className="flex items-start gap-3 p-4">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-rose-100 text-sm font-bold text-rose-600 dark:bg-rose-900/50 dark:text-rose-200">
                        {s.anonymous ? '?' : s.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">
                            {s.anonymous ? 'Anonymous' : s.name}
                          </span>
                          <Badge variant="secondary" className="bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200">
                            {formatCurrency(s.amount)}
                          </Badge>
                          <Badge variant="outline" className="text-muted-foreground">
                            {s.tier}
                          </Badge>
                        </div>
                        {s.message && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            &ldquo;{s.message}&rdquo;
                          </p>
                        )}
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          Just now
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* GoFundMe secondary callout */}
        <Card className="mt-12 overflow-hidden border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 dark:border-rose-900/50 dark:from-rose-950/30 dark:to-pink-950/30">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Prefer to donate on GoFundMe?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  We&apos;re setting up our official GoFundMe campaign. The
                  pledge form above records your intent immediately — your
                  GoFundMe contribution will be matched to your pledge by email.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              <a
                href="https://www.gofundme.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                GoFundMe
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
