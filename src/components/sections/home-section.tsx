'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, MapPin, Droplets, AlertTriangle, Building2, Users, FlaskConical,
  ChevronRight, Loader2, ShieldAlert, ShieldCheck, ArrowRight, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Utility, Stats, UtilityWithStats } from '@/lib/types'
import { UtilityDetailDialog } from '@/components/sections/utility-detail-dialog'
import { LiveTicker } from '@/components/site/live-ticker'
import { Ripple } from '@/components/canvas-ui/Ripple'
import type { Section } from '@/components/site/site-header'
import { Microscope, HandHeart, Database, Github, Info } from 'lucide-react'
import { useCountUp, formatCount } from '@/hooks/use-count-up'
import { Bell, Activity as ActivityIcon, Beaker, Heart, HandHeart as DonationIcon, Clock } from 'lucide-react'
import { QualityBadge } from '@/components/quality-badge'

const REPO_URL = 'https://github.com/Abotboot/Ripple-Effect'

const POPULAR_ZIPS = ['60614', '10003', '90026', '77007', '85016', '98103']

export function HomeSection({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Utility[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [scores, setScores] = useState<Record<string, { score: number; grade: string; label: string; color: string; bgColor: string }> | null>(null)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
    api.getUtilityScores()
      .then((r) => {
        const map: Record<string, { score: number; grade: string; label: string; color: string; bgColor: string }> = {}
        for (const s of r.scores) {
          map[s.id] = { score: s.score, grade: s.grade, label: s.label, color: s.color, bgColor: s.bgColor }
        }
        setScores(map)
      })
      .catch(() => setScores({}))
  }, [])

  const doSearch = useCallback(
    async (query: string) => {
      if (!query.trim()) return
      setLoading(true)
      setResults(null)
      try {
        const r = await api.searchUtilities(query.trim())
        setResults(r)
        if (r.length === 0) {
          toast({
            title: 'No utilities found',
            description: `No water utilities matched "${query}". Try a ZIP code, city, or state.`,
          })
        }
      } catch (e) {
        toast({
          title: 'Search failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    },
    [toast]
  )

  const openUtility = useCallback(
    async (u: Utility) => {
      setLoadingDetail(u.id)
      try {
        const detail = await api.getUtility(u.id)
        setSelected(detail)
      } catch (e) {
        toast({
          title: 'Failed to load utility',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        setLoadingDetail(null)
      }
    },
    [toast]
  )

  // Pick up a pending search from the command palette (sessionStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const pending = sessionStorage.getItem('pendingSearch')
    if (pending) {
      sessionStorage.removeItem('pendingSearch')
      setQ(pending)
      setTimeout(() => doSearch(pending), 50)
    }
  }, [doSearch])

  return (
    <div>
      <Hero
        q={q}
        setQ={setQ}
        onSearch={() => doSearch(q)}
        stats={stats}
        onNavigate={onNavigate}
      />

      {/* Live ticker - animated stats marquee */}
      <LiveTicker />

      {/* Stats bar */}
      <StatsBar stats={stats} />

      {/* Search results */}
      <section id="search" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {results ? `Results for "${q}"` : 'Browse water utilities'}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {results
                ? `${results.length} ${results.length === 1 ? 'utility' : 'utilities'} found. Click any utility to see contaminant breakdown.`
                : 'Try a popular ZIP code or search by utility name, city, or state.'}
            </p>
          </div>
          {results && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setResults(null)
                setQ('')
              }}
            >
              Clear search
            </Button>
          )}
        </div>

        {/* Popular ZIP chips */}
        {!results && (
          <div className="mt-6 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Try:
            </span>
            {POPULAR_ZIPS.map((z) => (
              <button
                key={z}
                onClick={() => {
                  setQ(z)
                  doSearch(z)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <MapPin className="h-3 w-3" />
                {z}
              </button>
            ))}
          </div>
        )}

        {/* Results grid */}
        <div className="mt-8">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-5">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="mt-3 h-4 w-1/2" />
                    <Skeleton className="mt-4 h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : results && results.length > 0 ? (
            <motion.div
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.05 } },
              }}
            >
              {results.map((u) => (
                <motion.div
                  key={u.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  <UtilityCard
                    utility={u}
                    score={scores?.[u.id]}
                    onOpen={() => openUtility(u)}
                    loading={loadingDetail === u.id}
                  />
                </motion.div>
              ))}
            </motion.div>
          ) : !results ? (
            <EmptyBrowse onSearch={doSearch} />
          ) : null}
        </div>
      </section>

      {/* Recent activity + Alert subscription */}
      <RecentActivityAndAlerts />

      {/* Recently added utilities + Data quality callout */}
      <RecentlyAddedAndQuality onNavigate={onNavigate} />

      {/* Citizen readings feed */}
      <CitizenReadingsFeed onNavigate={onNavigate} />

      {/* Microplastics distinction banner */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate?.('microplastics')}
          className="group relative w-full overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-6 text-left transition-all hover:shadow-lg hover:shadow-amber-500/10 dark:border-amber-500/30 dark:from-amber-950/30 dark:via-orange-950/20 dark:to-amber-950/30"
        >

          <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-amber-400/20 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
                <Microscope className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground sm:text-xl">
                    Almost no public water database tracks microplastics.
                  </h3>
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    We do
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                  The EPA has no legal limit for microplastics. EWG, most state
                  portals, and your utility&apos;s report don&apos;t include it.
                  A Ripple Effect Initiative tracks microplastics anyway — see the data.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-end text-sm font-semibold text-amber-700 dark:text-amber-400 sm:self-center">
              Explore microplastics
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>
      </section>

      {/* Donate pop banner */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden rounded-2xl border border-rose-300/60 bg-gradient-to-br from-rose-500 via-rose-600 to-pink-600 p-6 shadow-xl shadow-rose-500/20 sm:p-8">
          <div className="pointer-events-none absolute inset-0 opacity-30">
            <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
            <div className="absolute -bottom-12 left-1/4 h-40 w-40 rounded-full bg-pink-300/30 blur-3xl" />
          </div>
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
                <HandHeart className="h-7 w-7" />
              </div>
              <div className="text-white">
                <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  Help us ship the microplastics identifier
                </h3>
                <p className="mt-1 max-w-xl text-sm text-white/90">
                  We&apos;re crowdfunding a low-cost identifier that volunteers
                  dip into local rivers, lakes, and streams. Every dollar buys
                  parts, kits, and testing supplies. Join the founding crew of
                  supporters.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('donate')}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-white px-6 py-3 text-base font-bold text-rose-600 shadow-lg transition-transform hover:scale-105 active:scale-95"
            >
              <HandHeart className="h-5 w-5" />
              Donate now
            </button>
          </div>
        </div>
      </section>

      {/* Open source + data sources strip */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => onNavigate?.('sources')}
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Database className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-foreground">Integrated data sources</h4>
              <p className="text-sm text-muted-foreground">
                EWG, EPA SDWIS, USGS, WHO &mdash; see every database we pull from.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-4 rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-foreground/10 text-foreground">
              <Github className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-semibold text-foreground">Open source on GitHub</h4>
              <p className="text-sm text-muted-foreground">
                Fork it, file issues, or contribute. The whole project is open.
              </p>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
          </a>
        </div>
      </section>

      {/* Detail dialog */}
      <UtilityDetailDialog
        utility={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}

function Hero({
  q,
  setQ,
  onSearch,
  stats,
  onNavigate,
}: {
  q: string
  setQ: (s: string) => void
  onSearch: () => void
  stats: Stats | null
  onNavigate?: (s: Section) => void
}) {
  return (
    <Ripple
      trigger="click"
      interval={5}
      amplitude={0.6}
      speed={0.7}
      wavelength={70}
      refraction={60}
      shine={0.7}
    >
    <section className="relative overflow-hidden bg-water-hero">
      {/* Animated gradient orbs */}
      <div className="pointer-events-none absolute inset-0 opacity-40">
        <motion.div
          className="absolute -top-12 right-[10%] h-72 w-72 rounded-full bg-primary/30 blur-3xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute bottom-0 left-[5%] h-60 w-60 rounded-full bg-accent/50 blur-3xl"
          animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <motion.div
          className="absolute top-[40%] left-[60%] h-40 w-40 rounded-full bg-cyan-300/30 blur-3xl"
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
                fill="oklch(0.7 0.13 195)"
                opacity="0.5"
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

      <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-14 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Badge
              variant="secondary"
              className="mb-5 gap-1.5 border-primary/20 bg-primary/10 text-primary"
            >
              2026 Water Project · Freshwater Database
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              What&apos;s in your{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-cyan-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_ease_infinite]">
                  water
                </span>
                <motion.span
                  className="absolute -right-3 -top-2 text-primary"
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: [0, 1.2, 1], opacity: [0, 1, 0.8] }}
                  transition={{ duration: 1, delay: 0.8, repeat: Infinity, repeatDelay: 4 }}
                >
                  <Droplets className="h-5 w-5 fill-primary" />
                </motion.span>
              </span>
              ?
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              We track what&apos;s in the freshwater around you — rivers,
              lakes, and streams, before it ever reaches a treatment plant.
              Search your area to see microplastics, lead, PFAS, and other
              contaminants measured in untreated water near you.
            </p>
          </motion.div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            onSubmit={(e) => {
              e.preventDefault()
              onSearch()
            }}
            className="mx-auto mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Enter ZIP code, city, state, or utility name"
                className="h-12 rounded-xl border-border/80 bg-card pl-10 pr-4 text-base shadow-sm focus-visible:ring-primary focus-visible:ring-2"
                aria-label="Search by ZIP code, city, state, or utility name"
              />
            </div>
            <Button
              type="submit"
              size="lg"
              className="h-12 rounded-xl px-6 text-base shadow-md shadow-primary/30 transition-transform hover:scale-[1.02] active:scale-[0.98]"
              disabled={!q.trim()}
            >
              <Droplets className="h-4 w-4" />
              Search water
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            className="mt-5 flex flex-wrap items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="lg"
              onClick={() => onNavigate?.('about')}
              className="h-11 rounded-xl px-6 text-base shadow-sm transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Info className="h-4 w-4" />
              Learn about us
            </Button>
            <Button
              variant="ghost"
              size="lg"
              onClick={() => onNavigate?.('microplastics')}
              className="h-11 rounded-xl px-6 text-base text-primary hover:bg-primary/10 hover:text-primary"
            >
              Explore microplastics data
              <ArrowRight className="h-4 w-4" />
            </Button>
          </motion.div>

          {stats && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                {stats.utilitiesCount} utilities tracked
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FlaskConical className="h-3.5 w-3.5 text-primary" />
                {stats.contaminantsCount} contaminants
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Droplets className="h-3.5 w-3.5 text-primary" />
                {stats.samplesCount} measurements
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5 text-primary" />
                {(stats.populationServed / 1_000_000).toFixed(1)}M people served
              </span>
            </motion.div>
          )}
        </div>
      </div>
    </section>
    </Ripple>
  )
}

// Pre-computed droplet positions for the hero animation
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

function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null
  const items = [
    {
      icon: Building2,
      label: 'Utilities',
      value: stats.utilitiesCount,
      hint: `across ${stats.statesCovered} states`,
    },
    {
      icon: FlaskConical,
      label: 'Contaminants',
      value: stats.contaminantsCount,
      hint: 'incl. microplastics',
    },
    {
      icon: Droplets,
      label: 'Samples',
      value: stats.samplesCount,
      hint: 'community + lab',
    },
    {
      icon: AlertTriangle,
      label: 'Health exceedances',
      value: stats.healthExceedances,
      hint: 'above EWG guideline',
      tone: 'warning' as const,
    },
  ]
  return (
    <div className="border-b border-border/60 bg-card/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">
        {items.map(({ icon: Icon, label, value, hint, tone }, i) => (
          <div
            key={label}
            className={cn(
              'px-4 py-5 sm:px-6 sm:py-6',
              'sm:border-l sm:border-border/60 first:sm:border-l-0',
              i >= 2 && 'border-t border-border/60 sm:border-t-0',
              i % 2 === 1 && 'border-l border-border/60 sm:border-l-0'
            )}
          >
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
            >
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    'inline-flex h-7 w-7 items-center justify-center rounded-md',
                    tone === 'warning'
                      ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              </div>
              <AnimatedCounter
                value={value}
                className={cn(
                  'mt-2 text-2xl font-bold tabular-nums sm:text-3xl',
                  tone === 'warning' ? 'text-rose-600 dark:text-rose-400' : 'text-foreground'
                )}
              />
              <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [display, setDisplay] = useState(0)
  const elRef = useRef<HTMLDivElement | null>(null)
  const started = useRef(false)

  useEffect(() => {
    if (!value || !Number.isFinite(value)) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const start = () => {
      if (started.current) return
      started.current = true

      if (prefersReduced) {
        requestAnimationFrame(() => setDisplay(value))
        return
      }

      const duration = 1400
      const startTime = performance.now()
      const tick = (now: number) => {
        const progress = Math.min((now - startTime) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setDisplay(Math.round(value * eased))
        if (progress < 1) requestAnimationFrame(tick)
        else setDisplay(value)
      }
      requestAnimationFrame(tick)
    }

    // Start immediately (stats are above the fold on load).
    start()
  }, [value])

  return (
    <div ref={elRef} className={className}>
      {formatCount(display)}
    </div>
  )
}

function UtilityCard({
  utility,
  score,
  onOpen,
  loading,
}: {
  utility: Utility
  score?: { score: number; grade: string; label: string; color: string; bgColor: string }
  onOpen: () => void
  loading: boolean
}) {
  return (
    <Card className="group h-full overflow-hidden transition-all hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">
                {utility.city}, {utility.state} · {utility.county ?? 'N/A'} County
              </span>
            </div>
            <h3 className="mt-1.5 line-clamp-2 text-base font-semibold leading-snug text-foreground">
              {utility.name}
            </h3>
          </div>
          {score ? (
            <div
              className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${score.bgColor}`}
              title={`Safety score: ${score.score}/100 (${score.label})`}
            >
              <span className={`text-lg font-extrabold tabular-nums leading-none ${score.color}`}>{score.score}</span>
              <span className={`text-[9px] font-bold leading-none ${score.color}`}>{score.grade}</span>
            </div>
          ) : (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Building2 className="h-5 w-5" />
            </div>
          )}
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {score && (
            <span className={`inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${score.bgColor} ${score.color}`}>
              {score.label}
            </span>
          )}
          <Badge variant="outline" className="bg-secondary/40 text-[10px] font-medium">
            {utility.sourceType}
          </Badge>
          <Badge variant="outline" className="bg-secondary/40 text-[10px] font-medium">
            {utility.treatmentStatus}
          </Badge>
          <Badge variant="outline" className="bg-secondary/40 text-[10px] font-medium">
            PWSID: {utility.pwsid}
          </Badge>
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Users className="h-3 w-3" />
            {utility.population.toLocaleString()} served
          </span>
          <Button
            size="sm"
            variant="ghost"
            onClick={onOpen}
            disabled={loading}
            className="h-7 px-2 text-xs text-primary hover:bg-primary/10 hover:text-primary"
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <>
                View details
                <ChevronRight className="h-3 w-3" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function EmptyBrowse({ onSearch }: { onSearch: (q: string) => void }) {
  const featured = [
    { zip: '60614', label: 'Chicago, IL' },
    { zip: '10003', label: 'New York, NY' },
    { zip: '90026', label: 'Los Angeles, CA' },
    { zip: '77007', label: 'Houston, TX' },
    { zip: '85016', label: 'Phoenix, AZ' },
    { zip: '98103', label: 'Seattle, WA' },
  ]
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {featured.map((f) => (
        <button
          key={f.zip}
          onClick={() => onSearch(f.zip)}
          className="group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-md"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              ZIP {f.zip}
            </div>
            <div className="mt-1 font-semibold">{f.label}</div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
        </button>
      ))}
    </div>
  )
}

// ── Recent Activity feed + Alert subscription CTA ────────────────────
type ActivityItem = {
  id: string
  type: string
  date: string
  title: string
  subtitle: string
  meta?: string
  tone: string
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  sample: Beaker,
  report: FlaskConical,
  chapter: Heart,
  donation: DonationIcon,
}

const ACTIVITY_TONE: Record<string, string> = {
  warning: 'border-l-rose-400 bg-rose-50/50 dark:bg-rose-950/20',
  ok: 'border-l-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/20',
  info: 'border-l-sky-400 bg-sky-50/50 dark:bg-sky-950/20',
  default: 'border-l-border bg-card',
}

function timeAgo(dateStr: string): string {
  const d = new Date(dateStr).getTime()
  const now = Date.now()
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function RecentActivityAndAlerts() {
  const [items, setItems] = useState<ActivityItem[] | null>(null)
  const [alertEmail, setAlertEmail] = useState('')
  const [alertZip, setAlertZip] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api.getActivity()
      .then((r) => setItems(r.items))
      .catch(() => setItems([]))
  }, [])

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!alertEmail.trim() || !alertZip.trim()) {
      toast({ title: 'Missing fields', description: 'Email and ZIP code are required.', variant: 'destructive' })
      return
    }
    setSubscribing(true)
    try {
      await api.subscribeAlert({ email: alertEmail, zipCode: alertZip })
      toast({ title: 'You\'re subscribed! 🔔', description: 'We\'ll email you when new water data is available for your area.' })
      setSubscribed(true)
      setAlertEmail('')
      setAlertZip('')
    } catch (e) {
      toast({ title: 'Subscription failed', description: e instanceof Error ? e.message : 'Unknown error', variant: 'destructive' })
    } finally {
      setSubscribing(false)
    }
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent activity feed */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <ActivityIcon className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Recent activity</h2>
            <Badge variant="outline" className="ml-auto bg-secondary/40 text-[10px]">
              {items ? `${items.length} recent` : 'loading…'}
            </Badge>
          </div>
          <Card>
            <CardContent className="p-0">
              {items === null ? (
                <div className="space-y-2 p-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-14 w-full" />
                  ))}
                </div>
              ) : items.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No recent activity yet. Be the first to contribute!
                </div>
              ) : (
                <div className="max-h-[420px] overflow-y-auto scroll-area">
                  {items.map((item, i) => {
                    const Icon = ACTIVITY_ICONS[item.type] ?? ActivityIcon
                    const toneCls = ACTIVITY_TONE[item.tone] ?? ACTIVITY_TONE.default
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -8 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: Math.min(i * 0.04, 0.3) }}
                        className={cn(
                          'flex items-start gap-3 border-l-2 px-4 py-3 transition-colors hover:bg-muted/30',
                          toneCls,
                          i > 0 && 'border-t border-border/40'
                        )}
                      >
                        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background/60 text-primary">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                            <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(item.date)}
                            </span>
                          </div>
                          <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                          {item.meta && (
                            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/80">{item.meta}</p>
                          )}
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Alert subscription CTA */}
        <div>
          <Card className="overflow-hidden border-primary/30">
            <CardContent className="p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Bell className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Get water alerts</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Enter your ZIP and email. We&apos;ll notify you when new
                contaminant data is published for your area — especially if
                levels exceed health guidelines.
              </p>
              {subscribed ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-center dark:border-emerald-800 dark:bg-emerald-950/30"
                >
                  <p className="text-sm font-medium text-emerald-900 dark:text-emerald-300">🔔 You&apos;re subscribed!</p>
                  <p className="mt-1 text-xs text-emerald-800 dark:text-emerald-400">
                    Watch your inbox for water quality updates.
                  </p>
                  <Button variant="ghost" size="sm" className="mt-2 h-7 text-xs" onClick={() => setSubscribed(false)}>
                    Subscribe another ZIP
                  </Button>
                </motion.div>
              ) : (
                <form onSubmit={handleSubscribe} className="mt-4 space-y-2.5">
                  <div>
                    <Input
                      type="email"
                      value={alertEmail}
                      onChange={(e) => setAlertEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-9 text-sm"
                      required
                    />
                  </div>
                  <div className="flex gap-2">
                    <Input
                      value={alertZip}
                      onChange={(e) => setAlertZip(e.target.value)}
                      placeholder="ZIP code"
                      className="h-9 text-sm"
                      required
                    />
                    <Button type="submit" size="sm" disabled={subscribing} className="h-9 shrink-0">
                      {subscribing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                      {subscribing ? '…' : 'Subscribe'}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground">
                    Free. No spam. Unsubscribe anytime.
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

// ── Recently added utilities + Data quality callout ──────────────────
type RecentUtility = {
  id: string
  name: string
  city: string
  state: string
  pwsid: string
  population: number
  sourceType: string
  treatmentStatus: string
  createdAt: string
  sampleCount: number
}

function RecentlyAddedAndQuality({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [recent, setRecent] = useState<RecentUtility[] | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.getRecentUtilities().then((r) => setRecent(r.utilities)).catch(() => setRecent([]))
    api.getStats().then(setStats).catch(() => {})
  }, [])

  const qualityCounts = stats?.qualityCounts

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recently added utilities */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Recently added utilities</h2>
          </div>
          {!recent ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : recent.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No utilities added yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recent.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.06, 0.3) }}
                >
                  <Card className="group h-full cursor-pointer transition-all hover:border-primary/40 hover:shadow-md" >
                    <CardContent className="p-4" >
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Building2 className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-1 text-sm font-semibold text-foreground">{u.name}</h3>
                          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {u.city}, {u.state}
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                            <span className="inline-flex items-center gap-0.5">
                              <Users className="h-2.5 w-2.5" />
                              {u.population.toLocaleString()}
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <Beaker className="h-2.5 w-2.5" />
                              {u.sampleCount} samples
                            </span>
                            <span className="inline-flex items-center gap-0.5">
                              <Clock className="h-2.5 w-2.5" />
                              {timeAgo(u.createdAt)}
                            </span>
                          </div>
                        </div>
                        <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Data quality callout */}
        <div>
          <Card className="overflow-hidden border-primary/20">
            <CardContent className="p-5">
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-foreground">Data you can trust</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Every measurement is tagged with a quality level so you know
                exactly how much confidence to place in it.
              </p>

              {qualityCounts && (
                <div className="mt-4 space-y-2">
                  <QualityRow
                    icon={ShieldCheck}
                    label="Verified"
                    count={qualityCounts.verified}
                    total={stats?.samplesCount ?? 0}
                    color="bg-emerald-500"
                    colorLight="bg-emerald-100 dark:bg-emerald-950/40"
                    textColor="text-emerald-700 dark:text-emerald-300"
                    desc="Utility / EPA / certified lab"
                  />
                  <QualityRow
                    icon={FlaskConical}
                    label="Provisional"
                    count={qualityCounts.provisional}
                    total={stats?.samplesCount ?? 0}
                    color="bg-amber-500"
                    colorLight="bg-amber-100 dark:bg-amber-950/40"
                    textColor="text-amber-700 dark:text-amber-300"
                    desc="Research lab, pending verification"
                  />
                  <QualityRow
                    icon={Users}
                    label="Citizen"
                    count={qualityCounts.citizen}
                    total={stats?.samplesCount ?? 0}
                    color="bg-sky-500"
                    colorLight="bg-sky-100 dark:bg-sky-950/40"
                    textColor="text-sky-700 dark:text-sky-300"
                    desc="Community submitted"
                  />
                </div>
              )}

              <p className="mt-4 text-[11px] text-muted-foreground">
                We never present unverified data as fact. Citizen readings are
                clearly labeled and help identify areas that need official
                follow-up testing.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}

function QualityRow({
  icon: Icon,
  label,
  count,
  total,
  color,
  colorLight,
  textColor,
  desc,
}: {
  icon: React.ElementType
  label: string
  count: number
  total: number
  color: string
  colorLight: string
  textColor: string
  desc: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className={`rounded-lg border border-border p-2.5 ${colorLight}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${textColor}`} />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${textColor}`}>{count}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background/50">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{desc} · {pct}%</p>
    </div>
  )
}

// ── Citizen readings feed (showcase community contributions) ─────────
type CitizenReading = {
  id: string
  level: number
  unit: string
  location: string | null
  treatmentStatus: string
  sampleDate: string
  createdAt: string
  reporterName: string
  contaminant: { name: string; slug: string }
  utility: { name: string; city: string; state: string } | null
  exceedsHealth: boolean
  exceedsLegal: boolean
}

function CitizenReadingsFeed({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [readings, setReadings] = useState<CitizenReading[] | null>(null)

  useEffect(() => {
    api.getRecentReadings()
      .then((r) => setReadings(r.items))
      .catch(() => setReadings([]))
  }, [])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-100 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
          <Beaker className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">Citizen readings</h2>
          <p className="text-sm text-muted-foreground">
            Community-submitted measurements from volunteers using the microplastics identifier.
          </p>
        </div>
        {readings && readings.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => onNavigate?.('submit')} className="hidden sm:inline-flex">
            <Beaker className="h-3.5 w-3.5" />
            Submit your own
          </Button>
        )}
      </div>

      {!readings ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      ) : readings.length === 0 ? (
        <Card className="border-dashed border-sky-300/40 dark:border-sky-700/30">
          <CardContent className="flex flex-col items-center p-8 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-sky-100 dark:bg-sky-950/50">
              <Beaker className="h-6 w-6 text-sky-600 dark:text-sky-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground">No citizen readings yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              Be the first to submit a reading from a stream, river, or lake near you using the microplastics identifier.
            </p>
            <Button className="mt-4" size="sm" onClick={() => onNavigate?.('submit')}>
              <Beaker className="h-3.5 w-3.5" />
              Submit a reading
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {readings.slice(0, 6).map((r, i) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(i * 0.06, 0.3) }}
            >
              <Card className="h-full border-sky-200/60 dark:border-sky-800/40">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-lg font-bold tabular-nums text-foreground">
                          {r.level.toFixed(2)}
                        </span>
                        <span className="text-xs text-muted-foreground">{r.unit}</span>
                      </div>
                      <p className="mt-0.5 text-sm font-medium text-foreground">{r.contaminant.name}</p>
                    </div>
                    <QualityBadge quality="citizen" size="xs" />
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {r.utility ? (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.utility.city}, {r.utility.state}</span>
                      </p>
                    ) : r.location ? (
                      <p className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 shrink-0" />
                        <span className="truncate">{r.location}</span>
                      </p>
                    ) : null}
                    <p className="flex items-center gap-1">
                      <Users className="h-3 w-3 shrink-0" />
                      <span className="truncate">{r.reporterName}</span>
                      <span className="text-muted-foreground/60">·</span>
                      <span>{timeAgo(r.createdAt)}</span>
                    </p>
                  </div>

                  {(r.exceedsHealth || r.exceedsLegal) && (
                    <div className="mt-2 inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                      <AlertTriangle className="h-2.5 w-2.5" />
                      {r.exceedsLegal ? 'Exceeds legal limit' : 'Exceeds health guideline'}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </section>
  )
}
