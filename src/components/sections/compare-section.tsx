'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, Search, Trophy, Check, Loader2, RotateCcw, GitCompareArrows,
  Users, MapPin, FlaskConical, Droplets,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Utility } from '@/lib/types'

type CompareResult = Awaited<ReturnType<typeof api.compareUtilities>>

// ── Theme-aware chart constants (CSS variables so charts adapt to dark mode) ─
const AXIS_TICK = 'var(--muted-foreground)'
const AXIS_LINE = 'var(--border)'
const GRID_LINE = 'var(--border)'

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
}

// Distinct per-utility bar colors drawn from the chart palette CSS vars.
const UTILITY_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)']

// framer-motion stagger presets
const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.04 },
  },
}
const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
}

const fmt = (n: number | null | undefined, digits = 2) =>
  n == null
    ? '—'
    : Number(n).toLocaleString(undefined, { maximumFractionDigits: digits })

export function CompareSection() {
  const { toast } = useToast()

  const [utilities, setUtilities] = useState<Utility[]>([])
  const [loadingUtilities, setLoadingUtilities] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [comparison, setComparison] = useState<CompareResult | null>(null)
  const [loadingComparison, setLoadingComparison] = useState(false)

  // Load all utilities for the selection list.
  useEffect(() => {
    let cancelled = false
    api
      .listUtilities()
      .then((us) => {
        if (!cancelled) {
          setUtilities(us)
          setLoadingUtilities(false)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadingUtilities(false)
          toast({
            title: 'Could not load utilities',
            description: err instanceof Error ? err.message : 'Please try again later.',
            variant: 'destructive',
          })
        }
      })
    return () => {
      cancelled = true
    }
  }, [toast])

  // Filter the selection list by name / city / state / PWSID.
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return utilities
    return utilities.filter((u) =>
      `${u.name} ${u.city} ${u.state} ${u.pwsid}`.toLowerCase().includes(q)
    )
  }, [utilities, search])

  const toggle = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 3) return prev
      return [...prev, id]
    })
  }

  const runCompare = async () => {
    if (selectedIds.length < 2) return
    setLoadingComparison(true)
    setComparison(null)
    try {
      const result = await api.compareUtilities(selectedIds)
      setComparison(result)
      // Smooth-scroll to results after they render.
      setTimeout(() => {
        document
          .getElementById('compare-results')
          ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 120)
    } catch (err: unknown) {
      toast({
        title: 'Comparison failed',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'destructive',
      })
    } finally {
      setLoadingComparison(false)
    }
  }

  const reset = () => {
    setSelectedIds([])
    setComparison(null)
    setSearch('')
  }

  // Per-utility count of "best" (lowest) contaminant levels — used for the
  // "cleanest" trophy badge on the summary cards.
  const winsByUtility = useMemo(() => {
    const counts: Record<string, number> = {}
    if (!comparison) return counts
    comparison.utilities.forEach((u) => {
      counts[u.id] = 0
    })
    comparison.rows.forEach((r) => {
      if (r.bestUtilityId) {
        counts[r.bestUtilityId] = (counts[r.bestUtilityId] ?? 0) + 1
      }
    })
    return counts
  }, [comparison])

  const cleanestUtilityId = useMemo(() => {
    const entries = Object.entries(winsByUtility)
    if (entries.length === 0) return null
    let bestId: string | null = null
    let bestCount = -1
    for (const [id, c] of entries) {
      if (c > bestCount) {
        bestCount = c
        bestId = id
      }
    }
    return bestCount > 0 ? bestId : null
  }, [winsByUtility])

  // Build chart data — one row per contaminant, with each utility's level as
  // a separate keyed field. Filter out rows where every utility has a
  // null/zero level (log scale cannot handle that).
  const chartData = useMemo(() => {
    if (!comparison) return []
    return comparison.rows
      .filter((r) => r.perUtility.some((p) => p.level != null && p.level > 0))
      .map((r) => {
        const point: Record<string, string | number | null> = {
          name: r.contaminant.name,
          unit: r.contaminant.unit,
        }
        comparison.utilities.forEach((u) => {
          const p = r.perUtility.find((x) => x.utilityId === u.id)
          // Null/0 levels are passed as null so recharts skips that bar.
          point[u.name] =
            p?.level != null && p.level > 0 ? p.level : null
        })
        return point
      })
  }, [comparison])

  // Dynamic log-axis lower bound: one order of magnitude below the smallest
  // measured value (so every real bar is visible).
  const yDomain = useMemo<[number, string]>(() => {
    const vals: number[] = []
    if (comparison) {
      comparison.rows.forEach((r) =>
        r.perUtility.forEach((p) => {
          if (p.level != null && p.level > 0) vals.push(p.level)
        })
      )
    }
    if (vals.length === 0) return [0.001, 'auto']
    const min = Math.min(...vals)
    const floor = Math.pow(10, Math.floor(Math.log10(min)) - 1)
    return [floor, 'auto']
  }, [comparison])

  const selectedCount = selectedIds.length
  const atMax = selectedCount >= 3

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-water-hero">
        <div className="pointer-events-none absolute inset-0 opacity-40">
          <div className="absolute -top-20 right-[5%] h-72 w-72 rounded-full bg-primary/20 blur-3xl" />
          <div className="absolute bottom-0 left-[15%] h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 bg-primary/10 text-primary">
              <GitCompareArrows className="mr-1 h-3 w-3" />
              Compare utilities
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Side-by-side comparison
            </h1>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              Pick 2&ndash;3 water utilities and see how their contaminant levels
              stack up. Microplastics is shown first.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        {/* Selection card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex flex-wrap items-center justify-between gap-3 text-base">
              <span className="flex items-center gap-2">
                <FlaskConical className="h-4 w-4 text-primary" />
                Select utilities to compare
              </span>
              <Badge
                variant="secondary"
                className={
                  atMax
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                    : 'bg-muted text-muted-foreground'
                }
              >
                {selectedCount}/3 selected
              </Badge>
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Search by utility name, city, state, or PWSID. Pick between 2 and 3.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                {/* Search */}
                <div className="relative mb-3">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search Chicago, NYC, Seattle…"
                    className="pl-9"
                    aria-label="Filter utilities"
                  />
                </div>
                {/* Scrollable selection list */}
                <div
                  className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card/50"
                  style={{ scrollbarWidth: 'thin' }}
                >
                  {loadingUtilities ? (
                    <div className="space-y-2 p-3">
                      {Array.from({ length: 6 }).map((_, i) => (
                        <Skeleton key={i} className="h-12 w-full" />
                      ))}
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-6 text-center text-sm text-muted-foreground">
                      No utilities match &ldquo;{search}&rdquo;.
                    </div>
                  ) : (
                    <ul className="divide-y divide-border/60">
                      {filtered.map((u) => {
                        const checked = selectedIds.includes(u.id)
                        const disabled = !checked && atMax
                        return (
                          <li key={u.id}>
                            <Label
                              htmlFor={`util-${u.id}`}
                              className={`flex items-center gap-3 px-3 py-2.5 transition-colors ${
                                disabled
                                  ? 'cursor-not-allowed opacity-50'
                                  : 'cursor-pointer hover:bg-muted/60'
                              }`}
                            >
                              <Checkbox
                                id={`util-${u.id}`}
                                checked={checked}
                                disabled={disabled}
                                onCheckedChange={() => toggle(u.id)}
                              />
                              <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium text-foreground">
                                  {u.name}
                                </span>
                                <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {u.city}, {u.state}
                                  </span>
                                  <span className="inline-flex items-center gap-1">
                                    <Users className="h-3 w-3" />
                                    {u.population.toLocaleString()} served
                                  </span>
                                </span>
                              </span>
                              {checked && (
                                <Badge
                                  variant="secondary"
                                  className="bg-primary/10 text-primary"
                                >
                                  #{selectedIds.indexOf(u.id) + 1}
                                </Badge>
                              )}
                            </Label>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </div>
              </div>

              {/* Actions panel */}
              <div className="flex flex-col gap-3">
                <div className="rounded-lg border border-border bg-muted/30 p-4">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    How it works
                  </div>
                  <ol className="mt-2 space-y-1.5 text-sm text-foreground">
                    <li>1. Search and check 2&ndash;3 utilities.</li>
                    <li>2. Hit &ldquo;Compare&rdquo; to fetch latest levels.</li>
                    <li>3. See the chart, table, and the cleanest winner.</li>
                  </ol>
                </div>
                <Button
                  onClick={runCompare}
                  disabled={selectedCount < 2 || loadingComparison}
                  className="w-full"
                  size="lg"
                >
                  {loadingComparison ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Comparing…
                    </>
                  ) : (
                    <>
                      <GitCompareArrows className="h-4 w-4" />
                      Compare{selectedCount > 0 ? ` (${selectedCount})` : ''}
                    </>
                  )}
                </Button>
                <Button
                  onClick={reset}
                  variant="outline"
                  className="w-full"
                  disabled={selectedCount === 0 && !comparison}
                >
                  <RotateCcw className="h-4 w-4" />
                  Reset
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Empty state */}
        {!comparison && !loadingComparison && (
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <GitCompareArrows className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  Nothing compared yet
                </h3>
                <p className="mt-1.5 max-w-md text-sm text-muted-foreground">
                  Pick a few utilities above and click{' '}
                  <strong className="text-foreground">Compare</strong> to see
                  their contaminant levels side-by-side, including microplastics.
                  Try comparing Chicago, NYC, and Seattle.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Loading skeleton for results */}
        {loadingComparison && (
          <div className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-36 w-full" />
              ))}
            </div>
            <Skeleton className="h-[400px] w-full" />
            <Skeleton className="h-72 w-full" />
          </div>
        )}

        {/* Results */}
        {comparison && !loadingComparison && (
          <div id="compare-results" className="space-y-8">
            {/* Summary cards (one per utility) */}
            <motion.div
              variants={container}
              initial="hidden"
              animate="show"
              className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            >
              {comparison.utilities.map((u, idx) => {
                const isCleanest = u.id === cleanestUtilityId
                return (
                  <motion.div key={u.id} variants={item}>
                    <Card
                      className={
                        isCleanest
                          ? 'border-emerald-400/60 dark:border-emerald-500/40'
                          : ''
                      }
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
                                style={{ background: UTILITY_COLORS[idx] }}
                                aria-hidden
                              >
                                {idx + 1}
                              </span>
                              <h3 className="truncate text-base font-semibold text-foreground">
                                {u.name}
                              </h3>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <MapPin className="h-3 w-3" />
                              {u.city}, {u.state} · PWSID {u.pwsid}
                            </p>
                          </div>
                          {isCleanest && (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <Trophy className="mr-1 h-3 w-3" />
                              Cleanest
                            </Badge>
                          )}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <Meta
                            icon={Users}
                            label="Population"
                            value={u.population.toLocaleString()}
                          />
                          <Meta
                            icon={Droplets}
                            label="Source"
                            value={u.sourceType}
                          />
                          <Meta
                            icon={FlaskConical}
                            label="Treatment"
                            value={u.treatmentStatus}
                          />
                          <Meta
                            icon={Trophy}
                            label="Best levels"
                            value={`${winsByUtility[u.id] ?? 0}`}
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </motion.div>

            {/* Grouped bar chart (log scale) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Contaminant levels (log scale)
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Latest measured level per contaminant across the selected
                  utilities. Log scale because levels span many orders of
                  magnitude. Bars are skipped when a utility has no measurement.
                </p>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="py-12 text-center text-sm text-muted-foreground">
                    No overlapping contaminant measurements found across these
                    utilities.
                  </div>
                ) : (
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        margin={{ top: 8, right: 20, bottom: 60, left: 8 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke={GRID_LINE}
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 11, fill: AXIS_TICK }}
                          stroke={AXIS_LINE}
                          interval={0}
                          angle={-20}
                          textAnchor="end"
                          height={60}
                        />
                        <YAxis
                          scale="log"
                          domain={yDomain}
                          allowDataOverflow
                          tick={{ fontSize: 11, fill: AXIS_TICK }}
                          stroke={AXIS_LINE}
                          width={56}
                          label={{
                            value: 'Level (log)',
                            angle: -90,
                            position: 'insideLeft',
                            fontSize: 10,
                            fill: AXIS_TICK,
                          }}
                        />
                        <Tooltip
                          cursor={{ fill: 'var(--muted)' }}
                          contentStyle={tooltipStyle}
                          formatter={(value: number | string, name: string) => [
                            typeof value === 'number' ? fmt(value, 4) : '—',
                            name,
                          ]}
                        />
                        <Legend
                          wrapperStyle={{
                            fontSize: 12,
                            color: 'var(--foreground)',
                            paddingTop: 8,
                          }}
                        />
                        {comparison.utilities.map((u, idx) => (
                          <Bar
                            key={u.id}
                            dataKey={u.name}
                            fill={UTILITY_COLORS[idx]}
                            radius={[4, 4, 0, 0]}
                            barSize={18}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Detailed comparison table */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FlaskConical className="h-4 w-4 text-primary" />
                    Detailed comparison
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Cells are color-coded:{' '}
                    <span className="font-medium text-rose-600 dark:text-rose-400">
                      rose
                    </span>{' '}
                    = exceeds legal limit,{' '}
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      amber
                    </span>{' '}
                    = exceeds health guideline,{' '}
                    <span className="font-medium text-emerald-600 dark:text-emerald-400">
                      emerald
                    </span>{' '}
                    = lowest of the group. Microplastics shown first.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[200px]">
                            Contaminant
                          </TableHead>
                          {comparison.utilities.map((u, idx) => (
                            <TableHead key={u.id} className="text-right">
                              <span className="inline-flex items-center gap-1.5">
                                <span
                                  className="inline-block h-2.5 w-2.5 rounded-full"
                                  style={{ background: UTILITY_COLORS[idx] }}
                                  aria-hidden
                                />
                                <span className="truncate">{u.name}</span>
                              </span>
                            </TableHead>
                          ))}
                          <TableHead className="text-right">
                            Health guideline
                          </TableHead>
                          <TableHead className="text-right">
                            Legal limit
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {comparison.rows.map((row) => {
                          const unit = row.contaminant.unit
                          const isMicro = row.contaminant.slug === 'microplastics'
                          return (
                            <TableRow key={row.contaminant.id}>
                              <TableCell>
                                <div className="flex items-center gap-1.5">
                                  {isMicro && (
                                    <Badge
                                      variant="secondary"
                                      className="bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
                                    >
                                      Tracked by us
                                    </Badge>
                                  )}
                                  <span className="font-medium text-foreground">
                                    {row.contaminant.name}
                                  </span>
                                  {unit && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({unit})
                                    </span>
                                  )}
                                </div>
                              </TableCell>
                              {comparison.utilities.map((u) => {
                                const p = row.perUtility.find(
                                  (x) => x.utilityId === u.id
                                )
                                const level = p?.level ?? null
                                const isBest =
                                  row.bestUtilityId === u.id && level != null
                                const exceedsLegal =
                                  level != null &&
                                  row.contaminant.legalLimit != null &&
                                  level > row.contaminant.legalLimit
                                const exceedsHealth =
                                  level != null &&
                                  row.contaminant.healthGuideline != null &&
                                  level > row.contaminant.healthGuideline
                                let cls = 'text-foreground bg-muted/40 dark:bg-muted/20'
                                if (exceedsLegal)
                                  cls =
                                    'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                else if (exceedsHealth)
                                  cls =
                                    'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                                else if (isBest)
                                  cls =
                                    'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                return (
                                  <TableCell
                                    key={u.id}
                                    className="text-right"
                                  >
                                    <span
                                      className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium tabular-nums ${cls}`}
                                    >
                                      {isBest && (
                                        <Check className="h-3 w-3" />
                                      )}
                                      {fmt(level, 3)}
                                      {p?.sampleCount != null &&
                                        p.sampleCount > 0 && (
                                          <span className="text-[10px] opacity-70">
                                            ({p.sampleCount})
                                          </span>
                                        )}
                                    </span>
                                  </TableCell>
                                )
                              })}
                              <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                                {row.contaminant.healthGuideline != null
                                  ? `${fmt(row.contaminant.healthGuideline, 3)}${unit ? ' ' + unit : ''}`
                                  : '—'}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                                {row.contaminant.legalLimit != null
                                  ? `${fmt(row.contaminant.legalLimit, 3)}${unit ? ' ' + unit : ''}`
                                  : row.contaminant.regulated
                                    ? '—'
                                    : 'Unregulated'}
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Color-coded legend */}
                  <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-rose-200 dark:bg-rose-900/60" />
                      Exceeds legal limit
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-amber-200 dark:bg-amber-900/60" />
                      Exceeds health guideline
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-emerald-200 dark:bg-emerald-900/60" />
                      Lowest of the group
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <span className="inline-block h-2.5 w-2.5 rounded-sm bg-muted-foreground/30" />
                      No data
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </section>
    </div>
  )
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <span className="text-muted-foreground">{label}:</span>
      <span className="truncate font-medium text-foreground">{value}</span>
    </div>
  )
}
