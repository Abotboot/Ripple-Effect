'use client'

import { useEffect, useState, useCallback } from 'react'
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

const POPULAR_ZIPS = ['60614', '10003', '90026', '77007', '85016', '98103']

export function HomeSection() {
  const [q, setQ] = useState('')
  const [results, setResults] = useState<Utility[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
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

  return (
    <div>
      <Hero
        q={q}
        setQ={setQ}
        onSearch={() => doSearch(q)}
        stats={stats}
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
}: {
  q: string
  setQ: (s: string) => void
  onSearch: () => void
  stats: Stats | null
}) {
  return (
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

      <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8 lg:py-28">
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
              2026 Water Project · Community Database
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Know what&apos;s in your{' '}
              <span className="relative inline-block">
                <span className="bg-gradient-to-r from-primary via-cyan-500 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[shimmer_3s_ease_infinite]">
                  tap water
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
            </h1>
            <p className="mt-5 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Search any US ZIP code to see contaminants measured in your
              drinking water — including microplastics, lead, PFAS, and
              disinfection byproducts. Compare against health guidelines, not
              just legal limits.
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
      value: stats.utilitiesCount.toLocaleString(),
      hint: `across ${stats.statesCovered} states`,
    },
    {
      icon: FlaskConical,
      label: 'Contaminants',
      value: stats.contaminantsCount.toLocaleString(),
      hint: 'incl. microplastics',
    },
    {
      icon: Droplets,
      label: 'Samples',
      value: stats.samplesCount.toLocaleString(),
      hint: 'community + lab',
    },
    {
      icon: AlertTriangle,
      label: 'Health exceedances',
      value: stats.healthExceedances.toLocaleString(),
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
              // Vertical dividers between columns on desktop
              'sm:border-l sm:border-border/60 first:sm:border-l-0',
              // Horizontal divider between rows on mobile (rows 1 and 2)
              i >= 2 && 'border-t border-border/60 sm:border-t-0',
              // Vertical divider between left and right columns on mobile
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
                      ? 'bg-rose-100 text-rose-600'
                      : 'bg-primary/10 text-primary'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
              </div>
              <div
                className={cn(
                  'mt-2 text-2xl font-bold tabular-nums sm:text-3xl',
                  tone === 'warning' ? 'text-rose-600' : 'text-foreground'
                )}
              >
                {value}
              </div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{hint}</div>
            </motion.div>
          </div>
        ))}
      </div>
    </div>
  )
}

function UtilityCard({
  utility,
  onOpen,
  loading,
}: {
  utility: Utility
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
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Building2 className="h-5 w-5" />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
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
