'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  HandHeart, Heart, Sparkles, ExternalLink,
  Wrench, FlaskConical, Microscope, Database,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { Ripple } from '@/components/canvas-ui/Ripple'

const DROPLET_POSITIONS = [
  { left: '5%', size: 10, duration: 6, delay: 0 },
  { left: '15%', size: 14, duration: 8, delay: 1.5 },
  { left: '28%', size: 8, duration: 7, delay: 3 },
  { left: '42%', size: 12, duration: 9, delay: 0.5 },
  { left: '55%', size: 16, duration: 7.5, delay: 2 },
  { left: '68%', size: 10, duration: 8.5, delay: 4 },
  { left: '80%', size: 13, duration: 6.5, delay: 1 },
  { left: '90%', size: 9, duration: 7.8, delay: 2.8 },
  { left: '35%', size: 11, duration: 9.2, delay: 5 },
  { left: '72%', size: 15, duration: 8.2, delay: 3.5 },
]

const MOTION_REDUCED = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

const GOAL = 25000

// HCB / Hack Club fiscal sponsorship. Funding is read live from the public
// HCB API (Transparency Mode is on, so no auth needed).
const HCB_DONATE_URL = 'https://hcb.hackclub.com/donations/start/a-ripple-effect-initiative-arei'
const HCB_ORG_API = 'https://hcb.hackclub.com/api/v3/organizations/a-ripple-effect-initiative-arei'

const TIERS = [
  {
    title: 'Supporter',
    min: 25,
    accent: 'border-rose-300 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30',
    tag: 'text-rose-600 dark:text-rose-300',
    badge: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-200',
  },
  {
    title: 'Friend',
    min: 50,
    accent: 'border-amber-300 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30',
    tag: 'text-amber-600 dark:text-amber-300',
    badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200',
  },
  {
    title: 'Champion',
    min: 250,
    accent: 'border-fuchsia-300 bg-fuchsia-50 dark:border-fuchsia-900/60 dark:bg-fuchsia-950/30',
    tag: 'text-fuchsia-600 dark:text-fuchsia-300',
    badge: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-900/50 dark:text-fuchsia-200',
  },
  {
    title: 'Founding Sponsor',
    min: 1000,
    accent: 'border-emerald-300 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30',
    tag: 'text-emerald-600 dark:text-emerald-300',
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
    title: 'Field kits (microscope + reagents)',
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

type HCBOrg = {
  balances?: {
    total_raised?: number
    balance_cents?: number
  }
}

export function DonateSection() {
  // Live funding from the HCB public API (Transparency Mode is enabled).
  const [raised, setRaised] = useState<number | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(HCB_ORG_API)
        if (!res.ok) throw new Error('HCB API error')
        const data = (await res.json()) as HCBOrg
        // total_raised is returned in cents.
        const raisedCents = data.balances?.total_raised ?? 0
        if (!cancelled) setRaised(raisedCents / 100)
      } catch {
        if (!cancelled) setRaised(0)
      } finally {
        if (!cancelled) setStatsLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const pct = raised != null ? Math.min(100, Math.round((raised / GOAL) * 100)) : 0

  return (
    <div className="bg-background">
      {/* Hero */}
      <Ripple
        trigger="click"
        interval={5}
        amplitude={0.6}
        speed={0.7}
        wavelength={70}
        refraction={60}
        shine={0.7}
      >
        <section className="relative overflow-hidden bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 text-white">
          {/* Animated gradient orbs */}
          <div className="pointer-events-none absolute inset-0 opacity-40">
            <motion.div
              className="absolute -top-12 right-[10%] h-72 w-72 rounded-full bg-white/25 blur-3xl"
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
              transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
            />
            <motion.div
              className="absolute bottom-0 left-[5%] h-60 w-60 rounded-full bg-pink-300/40 blur-3xl"
              animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
              transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
            />
            <motion.div
              className="absolute top-[40%] left-[60%] h-40 w-40 rounded-full bg-amber-300/30 blur-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.4, 0.2] }}
              transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
            />
          </div>

          {/* Falling water droplets animation */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {DROPLET_POSITIONS.map((pos, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ left: pos.left, top: '-20px' }}
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: ['calc(-20px)', 'calc(100vh)'], opacity: [0, 0.6, 0.6, 0] }}
                transition={{
                  duration: pos.duration,
                  repeat: Infinity,
                  delay: pos.delay,
                  ease: 'easeIn',
                }}
              >
                <svg width={pos.size} height={pos.size * 1.4} viewBox="0 0 12 16" fill="none">
                  <path
                    d="M6 0 C6 4, 12 8, 12 11 A6 6 0 0 1 0 11 C0 8, 6 4, 6 0 Z"
                    fill="white"
                    opacity="0.6"
                  />
                </svg>
              </motion.div>
            ))}
          </div>

          {/* Wave decoration at bottom of hero */}
          <div className="pointer-events-none absolute bottom-0 left-0 right-0">
            <svg
              viewBox="0 0 1440 80"
              className="w-full h-[40px] sm:h-[60px]"
              preserveAspectRatio="none"
              fill="none"
            >
              <motion.path
                d="M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z"
                fill="oklch(0.99 0.005 200)"
                className="dark:fill-[oklch(0.16_0.02_200)]"
                animate={{
                  d: [
                    'M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z',
                    'M0,40 C240,0 480,80 720,40 C960,0 1200,80 1440,40 L1440,80 L0,80 Z',
                    'M0,40 C240,80 480,0 720,40 C960,80 1200,0 1440,40 L1440,80 L0,80 Z',
                  ],
                }}
                transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
              />
            </svg>
          </div>

        <div className="relative mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge className="mb-4 border-white/40 bg-white/15 text-white hover:bg-white/20">
                <Sparkles className="mr-1 h-3 w-3" />
                Crowdfunding · Tax-deductible via HCB
              </Badge>
              <h1 className="text-balance text-3xl font-extrabold tracking-tight drop-shadow-sm sm:text-5xl">
                Fund the microplastics identifier
              </h1>
              <p className="mx-auto mt-4 max-w-2xl text-pretty text-base text-white/90 sm:text-lg">
                We&apos;re crowdfunding a low-cost, open-source microplastics
                identifier that volunteers can dip directly into local rivers,
                lakes, and streams. Every dollar moves us closer to
                citizen-science kits in the field, and a free, open database
                anyone can use.
              </p>
            </motion.div>

            {/* Progress bar, fed by the live HCB balance */}
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

              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-white/20">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 via-amber-200 to-white"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                />
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-white/85">
                <span>Donations are handled live by HCB (Hack Club Bank).</span>
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
                  href={HCB_DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Donate securely via HCB
                </a>
              </Button>
            </motion.div>
            <p className="mt-3 text-xs text-white/75">
              Donations are processed by HCB (Hack Club)&apos;s fiscal sponsor
              platform, tax-deductible in the US.
            </p>
          </div>
        </div>
      </section>
      </Ripple>

      {/* Embedded HCB donation form */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl rounded-2xl border border-rose-200 bg-white p-6 shadow-sm dark:border-rose-900/50 dark:bg-card sm:p-8">
          <div className="mb-5 text-center">
            <h2 className="flex items-center justify-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
              <Heart className="h-6 w-6 text-rose-500" />
              Donate directly
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Complete your donation securely in the embedded form below, or
              open it in a new tab with the button.
            </p>
            <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                size="lg"
                className="bg-gradient-to-r from-rose-500 to-pink-600 text-white hover:from-rose-600 hover:to-pink-700"
              >
                <a
                  href={HCB_DONATE_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open donation page
                </a>
              </Button>
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-2xl justify-center overflow-hidden rounded-xl border border-border bg-muted/20 shadow-sm transition-all sm:max-w-3xl">
            {/* eslint-disable-next-line react/no-unknown-property */}
            <iframe
              src="https://hcb.hackclub.com/donations/start/a-ripple-effect-initiative-arei"
              className="w-full min-h-[580px] sm:min-h-[660px] md:min-h-[720px] border-none"
              name="donateFrame"
              scrolling="yes"
              frameBorder={0}
              marginHeight={0}
              marginWidth={0}
              allowFullScreen
              title="A Ripple Effect Initiative donation form"
            />
          </div>
        </div>
      </section>

      {/* Main content */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Impact tiers */}
        <div className="mb-12">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Choose your impact level
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Any amount helps. These tiers describe the impact you unlock.
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {TIERS.map((t, i) => {
              const Icon = i === 0 ? Heart : i === 1 ? Sparkles : i === 2 ? HandHeart : Sparkles
              return (
                <motion.div
                  key={t.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={cn('h-full overflow-hidden border-2 transition-all hover:shadow-lg', t.accent)}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', t.badge)}>
                          <Icon className="h-5 w-5 text-foreground" />
                        </div>
                        <Badge variant="secondary" className={t.badge}>
                          {formatCurrency(t.min)}+
                        </Badge>
                      </div>
                      <CardTitle className="mt-3 text-lg text-foreground">{t.title}</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <Button
                        asChild
                        variant="outline"
                        className={cn('mt-1 w-full border-rose-300 hover:bg-rose-50 dark:border-rose-800', t.tag)}
                      >
                        <a
                          href={`${HCB_DONATE_URL}?amount=${t.min}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Donate {formatCurrency(t.min)}
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Where the money goes */}
        <div className="mx-auto max-w-2xl">
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

        {/* HCB secondary callout */}
        <Card className="mt-12 overflow-hidden border-rose-200 bg-gradient-to-br from-rose-50 to-pink-50 dark:border-rose-900/50 dark:from-rose-950/30 dark:to-pink-950/30">
          <CardContent className="flex flex-col items-start gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-rose-500 text-white">
                <ExternalLink className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">
                  Prefer to donate directly?
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Donations run through HCB (Hack Club)&apos;s fiscal sponsorship:
                  secure, tax-deductible in the US, and every dollar goes to the
                  microplastics identifier.
                </p>
              </div>
            </div>
            <Button
              asChild
              variant="outline"
              className="shrink-0 border-rose-300 text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:text-rose-200 dark:hover:bg-rose-950/40"
            >
              <a
                href={HCB_DONATE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2"
              >
                <ExternalLink className="h-4 w-4" />
                Donate via HCB
              </a>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}