'use client'

import { useEffect, useState, useCallback, useRef, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, MapPin, Droplets, AlertTriangle, Building2, Users, FlaskConical,
  ChevronRight, Loader2, ShieldAlert, ArrowRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Utility, Stats, UtilityWithStats, SampleAssessment } from '@/lib/types'
import { UtilityDetailDialog } from '@/components/sections/utility-detail-dialog'
import { TankHero } from '@/components/atmosphere/tank-hero'
import type { Section } from '@/components/site/site-header'
import { Microscope, HandHeart, Database, Github } from 'lucide-react'
import { useCountUp, formatCount } from '@/hooks/use-count-up'
import { Bell, Activity as ActivityIcon, Beaker, Heart, HandHeart as DonationIcon, Clock } from 'lucide-react'
import { QualityBadge } from '@/components/quality-badge'
import { SourceBadge } from '@/components/source-badge'
import { Share2 } from 'lucide-react'
import { AnimatedCounter as BaseAnimatedCounter } from '@/components/ui/animated-counter'
import { WaterReportCardModal } from '@/components/social/water-report-card-modal'
import { CinematicPanel } from '@/components/ui/cinematic-panel'
import { useTypedPlaceholder } from '@/hooks/use-typed-placeholder'
import { SplitWords } from '@/components/motion/split-words'
import { RollText } from '@/components/motion/roll-text'
import { WaterTicker, showReadingOnMap } from '@/components/sections/water-ticker'
import { BottleStory } from '@/components/sections/bottle-story'
import { MicroplasticsTeaser } from '@/components/sections/microplastics-teaser'
import { requestSectionFocus } from '@/lib/section-focus'
import { TideLine } from '@/components/motion/tide-line'
import './home-motion.css'

const SEARCH_EXAMPLES = ['ZIP, city or utility', '60614', 'Seattle, WA', 'Philadelphia Water', '90026', 'Miami-Dade'] as const

const REPO_URL = 'https://github.com/Abotboot/Ripple-Effect'

const POPULAR_ZIPS = ['60614', '10003', '90026', '77007', '85016', '98103']

// The heavy parts of Home that do not depend on the search text, memoized so
// typing in the search box does not re-render them on every keystroke.
const StillTide = memo(TideLine)
const StillStats = memo(StatsBar)
const StillTicker = memo(WaterTicker)
const StillBottleStory = memo(BottleStory)
const StillTeaser = memo(MicroplasticsTeaser)
const StillActivity = memo(RecentActivityAndAlerts)
const StillRecentlyAdded = memo(RecentlyAddedUtilities)
const StillCitizenFeed = memo(CitizenReadingsFeed)

export function HomeSection({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [q, setQ] = useState('')
  const [submittedQuery, setSubmittedQuery] = useState('')
  const [results, setResults] = useState<Utility[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [stats, setStats] = useState<Stats | null>(null)
  const [statsFailed, setStatsFailed] = useState(false)
  const [statsAttempt, setStatsAttempt] = useState(0)
  const [scores, setScores] = useState<Record<string, { score: number; grade: string; label: string; color: string; bgColor: string }> | null>(null)
  const [scoresFailed, setScoresFailed] = useState(false)
  const [scoresAttempt, setScoresAttempt] = useState(0)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [shareUtility, setShareUtility] = useState<UtilityWithStats | null>(null)
  const [loadingShareId, setLoadingShareId] = useState<string | null>(null)
  const searchRequestId = useRef(0)
  const { toast } = useToast()

  useEffect(() => {
    api.getStats()
      .then((value) => {
        setStats(value)
        setStatsFailed(false)
      })
      .catch(() => {
        setStats(null)
        setStatsFailed(true)
      })
  }, [statsAttempt])

  // Scores only rank search results, so they load with the first search.
  const searched = results !== null
  useEffect(() => {
    if (!searched) return
    api.getUtilityScores()
      .then((r) => {
        const map: Record<string, { score: number; grade: string; label: string; color: string; bgColor: string }> = {}
        for (const s of r.scores) {
          if (typeof s.score !== 'number' || !Number.isFinite(s.score)) continue
          map[s.id] = { score: s.score, grade: s.grade, label: s.label, color: s.color, bgColor: s.bgColor }
        }
        setScores(map)
      })
      .catch(() => {
        setScores(null)
        setScoresFailed(true)
      })
  }, [scoresAttempt, searched])

  const doSearch = useCallback(
    async (query: string) => {
      const trimmed = query.trim()
      if (!trimmed) return

      const reqId = ++searchRequestId.current
      setSubmittedQuery(trimmed)
      setLoading(true)
      setSearchFailed(false)
      setResults(null)

      const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
      setTimeout(() => {
        const el = document.getElementById('search')
        if (el) {
          el.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth', block: 'start' })
        }
      }, 50)

      try {
        const r = await api.searchUtilities(trimmed)
        if (searchRequestId.current !== reqId) return // discard stale response
        setResults(r)
        if (r.length === 0) {
          toast({
            title: 'No utilities found',
            description: `No water utilities matched "${trimmed}". Try a ZIP code, city, or state.`,
          })
        }
      } catch (e) {
        if (searchRequestId.current !== reqId) return
        setSearchFailed(true)
        toast({
          title: 'Search failed',
          description: e instanceof Error ? e.message : 'Unknown error',
          variant: 'destructive',
        })
      } finally {
        if (searchRequestId.current === reqId) {
          setLoading(false)
        }
      }
    },
    [toast]
  )

  const clearSearch = useCallback(() => {
    searchRequestId.current++ // invalidates any pending in-flight requests
    setResults(null)
    setSubmittedQuery('')
    setQ('')
    setLoading(false)
    setSearchFailed(false)
  }, [])

  const openUtility = useCallback(
    async (u: { id: string }) => {
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

  const openShareCard = useCallback(
    async (u: Utility) => {
      setLoadingShareId(u.id)
      try {
        const detail = await api.getUtility(u.id)
        setShareUtility(detail)
      } catch {
        toast({
          title: 'Failed to generate card',
          description: 'Could not load contaminant measurements for this utility.',
          variant: 'destructive',
        })
      } finally {
        setLoadingShareId(null)
      }
    },
    [toast]
  )

  // Pick up a pending search from the command palette (sessionStorage)
  useEffect(() => {
    if (typeof window === 'undefined') return
    let pending: string | null = null
    try {
      pending = sessionStorage.getItem('pendingSearch')
      if (pending) sessionStorage.removeItem('pendingSearch')
    } catch {
      // Storage may be blocked; direct search remains available.
    }
    if (!pending) return
    const timer = setTimeout(() => { setQ(pending); doSearch(pending) }, 0)
    return () => clearTimeout(timer)
  }, [doSearch])

  return (
    <div className="home-data">
      <Hero
        q={q}
        setQ={setQ}
        onSearch={() => doSearch(q)}
        stats={stats}
        onNavigate={onNavigate}
      />
      <StillTide fill="#090e10" className="tide-line--hero" />

      {/* Stats bar */}
      <StillStats stats={stats} />
      <StillTicker onNavigate={onNavigate} />
      {statsFailed && (
        <div className="mx-auto flex max-w-7xl flex-col gap-3 border-b border-border px-4 py-4 text-sm sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8" role="alert" data-testid="home-stats-error">
          <div>
            <p className="font-semibold text-foreground">National summary could not be loaded</p>
            <p className="mt-1 text-muted-foreground">Search and independently loaded utility locations remain available. No national count or comparison is inferred while this request is unavailable.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => { setStatsFailed(false); setStatsAttempt(value => value + 1) }}>
            Retry summary
          </Button>
        </div>
      )}

      {/* Polite live region for screen readers */}
      <div aria-live="polite" className="sr-only">
        {loading ? 'Searching water utilities...' : results ? `${results.length} water utilities found.` : ''}
      </div>

      {/* Search results - search-first hierarchy */}
      <section id="search" className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="home-heading">
            <span className="home-eyebrow">{results ? 'Search results' : 'Find your water'}</span>
            {results ? (
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">{`Results for "${submittedQuery || q}"`}</h2>
            ) : (
              <h2 key="browse" data-split className="text-2xl font-bold tracking-tight sm:text-3xl"><SplitWords text="Browse water utilities" /></h2>
            )}
            <p className="mt-1 text-sm text-muted-foreground">
              {results
                ? `${results.length} ${results.length === 1 ? 'utility' : 'utilities'} found. Click any utility to see contaminant breakdown.`
                : 'Try a popular ZIP code or search by utility name, city, or state.'}
            </p>
          </div>
          {(results || searchFailed) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSearch}
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
              <motion.button
                key={z}
                whileTap={{ scale: 0.94 }}
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                onClick={() => {
                  setQ(z)
                  doSearch(z)
                }}
                className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-foreground shadow-xs transition-colors hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <MapPin className="h-3 w-3" />
                {z}
              </motion.button>
            ))}
          </div>
        )}

        {results && results.length > 0 && scoresFailed && (
          <div className="mt-6 flex flex-col gap-3 border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between" role="alert" data-testid="utility-assessment-error">
            <div>
              <p className="text-sm font-semibold text-foreground">Assessment data could not be loaded</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Utility locations are still available below. No score or pass/fail state is inferred while assessment data is unavailable.</p>
            </div>
            <Button type="button" variant="outline" size="sm" onClick={() => { setScores(null); setScoresFailed(false); setScoresAttempt(value => value + 1) }}>
              Retry assessments
            </Button>
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
          ) : searchFailed ? (
            <div className="border border-border bg-card p-6" role="alert" data-testid="water-search-error">
              <h3 className="text-lg font-semibold">Water records are temporarily unavailable</h3>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">Your search for “{submittedQuery}” could not be completed. This is a service error, not a finding about your water.</p>
              <Button type="button" variant="outline" className="mt-4" onClick={() => doSearch(submittedQuery)}>Try again</Button>
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
              {results.map((u, idx) => (
                <motion.div
                  key={u.id}
                  variants={{
                    hidden: { opacity: 0, y: 16 },
                    show: { opacity: 1, y: 0 },
                  }}
                >
                  {idx === 0 ? (
                    <CinematicPanel maxTilt={2.5}>
                      <UtilityCard
                        utility={u}
                        score={scores?.[u.id]}
                        assessment={stats?.mapUtilities.find(item => item.id === u.id)?.assessment}
                        assessmentState={scoresFailed ? 'error' : scores === null ? 'loading' : scores[u.id] ? 'available' : 'missing'}
                        onOpen={() => openUtility(u)}
                        loading={loadingDetail === u.id}
                        onShare={() => openShareCard(u)}
                        loadingShare={loadingShareId === u.id}
                        onRequestTesting={() => onNavigate?.('submit')}
                      />
                    </CinematicPanel>
                  ) : (
                    <UtilityCard
                      utility={u}
                      score={scores?.[u.id]}
                      assessment={stats?.mapUtilities.find(item => item.id === u.id)?.assessment}
                      assessmentState={scoresFailed ? 'error' : scores === null ? 'loading' : scores[u.id] ? 'available' : 'missing'}
                      onOpen={() => openUtility(u)}
                      loading={loadingDetail === u.id}
                      onShare={() => openShareCard(u)}
                      loadingShare={loadingShareId === u.id}
                      onRequestTesting={() => onNavigate?.('submit')}
                    />
                  )}
                </motion.div>
              ))}
            </motion.div>
          ) : !results ? (
            <EmptyBrowse onSearch={doSearch} />
          ) : <div className="border border-border bg-card p-6" data-testid="water-search-empty"><h3 className="text-lg font-semibold">No matching utility records</h3><p className="mt-2 text-sm text-muted-foreground">Try a city, another ZIP code, or your utility’s name. Missing records are not evidence that water is contaminant-free.</p></div>}
        </div>
      </section>

      <StillBottleStory onNavigate={onNavigate} />

      {/* The microplastics explainers (scale, path, particle forms, sample
          examination) live on the Microplastics page; Home links to them. */}
      <StillTeaser onNavigate={onNavigate} />

      {/* Recent activity + Alert subscription */}
      <StillActivity />

      {/* Recently added utilities + Data quality callout */}
      <StillRecentlyAdded onNavigate={onNavigate} onOpenUtility={openUtility} />

      {/* Citizen readings feed */}
      <StillCitizenFeed onNavigate={onNavigate} />

      {/* Microplastics distinction banner */}
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <button
          onClick={() => onNavigate?.('microplastics')}
          className="group relative w-full overflow-hidden border border-border bg-card p-6 text-left transition-colors hover:border-primary"
        >

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-border text-primary">
                <Microscope className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-foreground sm:text-xl">
                    Explore microplastics research and records
                  </h3>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
                  Review available observations, methods and limitations.
                  A missing record is not evidence of absence.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1.5 self-end text-sm font-semibold text-primary sm:self-center">
              Explore microplastics
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </div>
          </div>
        </button>
      </section>

      {/* Donate pop banner */}
      <section className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
        <div className="relative overflow-hidden border border-border bg-card p-6 sm:p-8">
          <div className="relative flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-border text-primary">
                <HandHeart className="h-7 w-7" />
              </div>
              <div className="text-foreground">
                <h3 className="text-xl font-extrabold tracking-tight sm:text-2xl">
                  Support the microplastics identifier
                </h3>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
                  Review the fieldwork plan, funding source, and ways to contribute.
                </p>
              </div>
            </div>
            <button
              onClick={() => onNavigate?.('donate')}
              className="inline-flex min-h-11 shrink-0 items-center gap-2 border border-primary px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary/10 motion-reduce:transition-none"
            >
              <HandHeart className="h-5 w-5" />
              View funding plan
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
                Review the project databases, references, and source notes.
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
                Browse the code, file issues, or contribute on GitHub.
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

      {/* Shareable Water Report Card Modal */}
      <WaterReportCardModal
        utility={shareUtility}
        open={!!shareUtility}
        onClose={() => setShareUtility(null)}
      />
    </div>
  )
}

function Hero({ q, setQ, onSearch, onNavigate }: {
  q: string
  setQ: (s: string) => void
  onSearch: () => void
  stats: Stats | null
  onNavigate?: (s: Section) => void
}) {
  return <TankHero onPhotoSources={() => { requestSectionFocus('particle-atlas'); onNavigate?.('microplastics') }}>
    <form onSubmit={(event) => { event.preventDefault(); onSearch() }}>
      <label htmlFor="tank-search-input" className="sr-only">Search by ZIP code, city, state, or utility name</label>
      <HeroSearchInput q={q} setQ={setQ} />
      <button type="submit" disabled={!q.trim()} data-magnetic data-roll><RollText text="Search water ↗" /></button>
    </form>
    <div className="tank-search-links">
      <button onClick={() => onNavigate?.('about')}>ABOUT THE INITIATIVE ↗</button>
      <button onClick={() => onNavigate?.('microplastics')}>EXPLORE MICROPLASTICS ↗</button>
    </div>
  </TankHero>
}


// Owns the typing placeholder so its frequent updates re-render only the input,
// never the particle scene around it.
function HeroSearchInput({ q, setQ }: { q: string; setQ: (s: string) => void }) {
  const [focused, setFocused] = useState(false)
  // Types only while the field is on screen: Home stays mounted (parked)
  // behind other sections, and typing there would keep re-rendering it.
  const [onScreen, setOnScreen] = useState(false)
  const field = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const input = field.current
    if (!input) return
    const observer = new IntersectionObserver(([entry]) => setOnScreen(entry.isIntersecting))
    observer.observe(input)
    return () => observer.disconnect()
  }, [])
  const placeholder = useTypedPlaceholder(SEARCH_EXAMPLES, onScreen && !focused && !q)
  return (
    <input
      ref={field}
      id="tank-search-input"
      value={q}
      onChange={(event) => setQ(event.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      placeholder={placeholder}
      aria-label="Search by ZIP code, city, state, or utility name"
      autoComplete="off"
    />
  )
}

function StatsBar({ stats }: { stats: Stats | null }) {
  if (!stats) return null
  const healthCompared = stats.sampleAssessment?.healthCompared ?? 0
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
      label: stats.officialMonitoring?.results ? 'EPA PFAS results' : 'Samples',
      value: stats.officialMonitoring?.results || stats.samplesCount,
      hint: stats.officialMonitoring?.results ? `PFOA / PFOS · ${stats.officialMonitoring.utilities} utilities` : 'stored observations',
    },
    {
      icon: AlertTriangle,
      label: stats.officialMonitoring?.results ? 'Above MCL benchmark' : 'Above health guideline',
      value: stats.officialMonitoring?.results ? stats.officialMonitoring.above : healthCompared > 0 ? stats.sampleAssessment?.healthAbove ?? null : null,
      hint: stats.officialMonitoring?.results ? 'Historical EPA results · 4 ppt each' : healthCompared > 0 ? `${healthCompared} comparable reviewed readings` : 'No comparable reviewed readings',
      tone: (stats.officialMonitoring?.above ?? stats.sampleAssessment?.healthAbove ?? 0) > 0 ? 'warning' as const : undefined,
    },
  ]
  return (
    <div className="home-stats border-b border-border/60 bg-card/50">
      <div className="mx-auto grid max-w-7xl grid-cols-2 sm:grid-cols-4">
        {items.map(({ icon: Icon, label, value, hint, tone }, i) => (
          <div
            key={label}
            className={cn(
              'home-stat px-4 py-6 sm:px-6 sm:py-8',
              'sm:border-l sm:border-border/60 first:sm:border-l-0',
              i >= 2 && 'border-t border-border/60 sm:border-t-0',
              i % 2 === 1 && 'border-l border-border/60 sm:border-l-0'
            )}
            data-reveal
            data-tone={tone}
            style={{ '--reveal-delay': `${i * 90}ms` } as React.CSSProperties}
          >
            <div className="flex items-center gap-2">
              <Icon className="home-stat-icon h-3.5 w-3.5" aria-hidden="true" />
              <span className="home-stat-label">{label}</span>
            </div>
            {typeof value === 'number' && Number.isFinite(value)
              ? <AnimatedCounter value={value} className="home-stat-value" />
              : <p className="home-stat-value" aria-label="Not assessed">N/A</p>}
            <div className="home-stat-hint">{hint}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  return <BaseAnimatedCounter value={value} className={className} />
}

function UtilityCard({
  utility,
  score,
  assessment,
  assessmentState,
  onOpen,
  loading,
  onShare,
  loadingShare,
  onRequestTesting,
}: {
  utility: Utility
  assessment?: SampleAssessment
  score?: { score: number; grade: string; label: string; color: string; bgColor: string }
  assessmentState: 'loading' | 'available' | 'missing' | 'error'
  onOpen: () => void
  loading: boolean
  onShare?: () => void
  loadingShare?: boolean
  onRequestTesting?: () => void
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
          {assessment?.status === 'assessed' ? (
            <div className="max-w-32 shrink-0 text-right text-xs">
              <span className={(assessment.legalAbove ?? 0) > 0 ? 'font-semibold text-rose-400' : 'text-muted-foreground'}>{(assessment.legalAbove ?? 0) > 0 ? 'Above MCL benchmark' : 'No recorded exceedance'}</span>
              <span className="mt-1 block text-muted-foreground">{assessment.legalCompared} compared results</span>
            </div>
          ) : score ? (
            <div
              className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${score.bgColor}`}
              title={`Safety score: ${score.score}/100 (${score.label})`}
            >
              <span className={`text-lg font-extrabold tabular-nums leading-none ${score.color}`}>{score.score}</span>
              <span className={`text-[9px] font-bold leading-none ${score.color}`}>{score.grade}</span>
            </div>
          ) : assessmentState === 'missing' ? (
            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unassessed</span>
              <span className="mt-0.5 text-xs text-muted-foreground">No data</span>
            </div>
          ) : assessmentState === 'error' ? (
            <div className="flex shrink-0 flex-col items-end text-right">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Unavailable</span>
              <span className="mt-0.5 text-xs text-muted-foreground">Retry above</span>
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

        {assessmentState === 'missing' && assessment?.status !== 'assessed' && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span>No reviewed measurement is available for an assessment.</span>
            {onRequestTesting && (
              <button type="button" className="font-semibold text-primary underline underline-offset-4" onClick={onRequestTesting}>Testing &amp; contribution options</button>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-end border-t border-border/60 pt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            {onShare && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  onShare()
                }}
                disabled={loadingShare}
                className="h-7 px-2 text-xs gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                title="Generate and share community water card"
              >
                {loadingShare ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <Share2 className="h-3 w-3" />
                    <span>Card</span>
                  </>
                )}
              </Button>
            )}
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
          className="browse-city group flex items-center justify-between rounded-xl border border-border bg-card p-5 text-left transition-all hover:border-primary/40 hover:shadow-md"
          data-spotlight
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              ZIP {f.zip}
            </div>
            <div className="browse-city-name mt-1 font-semibold">{f.label}</div>
          </div>
          <span className="browse-city-arrow" aria-hidden="true"><ArrowRight className="h-4 w-4" /><ArrowRight className="h-4 w-4" /></span>
        </button>
      ))}
    </div>
  )
}

// -- Recent Activity feed + Alert subscription CTA --
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
  const [activityFailed, setActivityFailed] = useState(false)
  const [activityAttempt, setActivityAttempt] = useState(0)
  const [alertEmail, setAlertEmail] = useState('')
  const [alertZip, setAlertZip] = useState('')
  const [subscribing, setSubscribing] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api.getActivity()
      .then((r) => setItems(r.items))
      .catch(() => { setItems(null); setActivityFailed(true) })
  }, [activityAttempt])

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
          <div className="home-heading mb-4 flex flex-wrap items-center gap-2">
            <span className="home-eyebrow">Across the network</span>
            <h2 data-split className="text-xl font-bold tracking-tight sm:text-2xl"><SplitWords text="Recent activity" /></h2>
            <span className="home-live-pill" aria-hidden="true" data-loop><span />Live</span>
            <Badge variant="outline" className="ml-auto bg-secondary/40 text-[10px]">
              {items ? `${items.length} recent` : 'loading…'}
            </Badge>
          </div>
          <Card>
            <CardContent className="p-0">
              {activityFailed ? (
                <div className="p-6 text-sm" role="alert">
                  <p className="font-semibold text-foreground">Recent activity could not be loaded</p>
                  <p className="mt-1 text-muted-foreground">This is a loading error, not an empty activity history.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { setItems(null); setActivityFailed(false); setActivityAttempt(value => value + 1) }}>Retry activity</Button>
                </div>
              ) : items === null ? (
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
                                contaminant data is published for your area, especially if
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

// -- Recently added utilities + Data quality callout --
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

function RecentlyAddedUtilities({
  onNavigate,
  onOpenUtility,
}: {
  onNavigate?: (s: Section) => void
  onOpenUtility: (u: RecentUtility) => void
}) {
  const [recent, setRecent] = useState<RecentUtility[] | null>(null)
  const [recentFailed, setRecentFailed] = useState(false)
  const [recentAttempt, setRecentAttempt] = useState(0)
  useEffect(() => {
    api.getRecentUtilities().then((r) => setRecent(r.utilities)).catch(() => { setRecent(null); setRecentFailed(true) })
  }, [recentAttempt])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      {/* The evidence-label breakdown that sat beside this list now lives on
          the data sources page. */}
      <div>
        {/* Recently added utilities */}
        <div>
          <div className="home-heading mb-4 flex flex-wrap items-center gap-2">
            <span className="home-eyebrow">New in the database</span>
            <h2 data-split className="text-xl font-bold tracking-tight sm:text-2xl"><SplitWords text="Recently added utilities" /></h2>
          </div>
          {recentFailed ? (
            <Card>
              <CardContent className="p-6" role="alert">
                <p className="text-sm font-semibold text-foreground">Recent utility locations could not be loaded</p>
                <p className="mt-1 text-sm text-muted-foreground">This is a service error. Existing search results and other independently loaded utility locations remain available.</p>
                <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { setRecent(null); setRecentFailed(false); setRecentAttempt(value => value + 1) }}>Retry locations</Button>
              </CardContent>
            </Card>
          ) : !recent ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: Math.min(i * 0.06, 0.3) }}
                >
                  <Card
                    className="group h-full cursor-pointer transition-all hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    role="button"
                    tabIndex={0}
                    aria-label={`View details for ${u.name}`}
                    onClick={() => onOpenUtility(u)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onOpenUtility(u)
                      }
                    }}
                  >
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

      </div>
    </section>
  )
}

// -- Citizen readings feed (showcase community contributions) --
type CitizenReading = {
  id: string
  level: number
  unit: string
  location: string | null
  treatmentStatus: string
  sampleDate: string
  createdAt: string
  source: string
  robot: boolean
  reporterName: string
  collectionPoint: { latitude: number; longitude: number; waterBody: string | null } | null
  contaminant: { name: string; slug: string }
  utility: { name: string; city: string; state: string } | null
  exceedsHealth: boolean
  exceedsLegal: boolean
}

function CitizenReadingsFeed({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [readings, setReadings] = useState<CitizenReading[] | null>(null)
  const [readingsFailed, setReadingsFailed] = useState(false)
  const [readingsAttempt, setReadingsAttempt] = useState(0)

  useEffect(() => {
    api.getRecentReadings()
      .then((r) => setReadings(r.items))
      .catch(() => { setReadings(null); setReadingsFailed(true) })
  }, [readingsAttempt])

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-4 flex items-center gap-2">
        <div className="home-heading flex-1">
          <span className="home-eyebrow">From the field</span>
          <h2 data-split className="text-xl font-bold tracking-tight sm:text-2xl"><SplitWords text="Citizen readings" /></h2>
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

      {readingsFailed ? (
        <Card>
          <CardContent className="p-6" role="alert">
            <p className="text-sm font-semibold text-foreground">Citizen readings could not be loaded</p>
            <p className="mt-1 text-sm text-muted-foreground">This is a loading error, not evidence that no readings exist.</p>
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => { setReadings(null); setReadingsFailed(false); setReadingsAttempt(value => value + 1) }}>Retry readings</Button>
          </CardContent>
        </Card>
      ) : !readings ? (
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
            <div key={r.id} data-reveal style={{ '--reveal-delay': `${Math.min(i, 5) * 70}ms` } as React.CSSProperties}>
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
                    <div className="flex flex-col items-end gap-1">
                      <SourceBadge source={r.source} robot={r.robot} size="xs" />
                      <QualityBadge quality="citizen" size="xs" />
                    </div>
                  </div>

                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    {r.collectionPoint?.waterBody && (
                      <p className="citizen-water-name">{r.collectionPoint.waterBody}</p>
                    )}
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
                  {r.collectionPoint && (
                    <button type="button" className="citizen-water-link" onClick={() => showReadingOnMap(r.id, onNavigate)}>
                      <span aria-hidden="true" />See it on the water →
                    </button>
                  )}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
