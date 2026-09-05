'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'
import {
  Map as MapIcon, MapPin, Loader2, AlertTriangle, ShieldCheck, Building2,
  Users, Navigation, Search, X, RotateCcw,
  Microscope, FlaskConical, Droplets, Beaker,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api'
import type { Stats, UtilityWithStats, Utility } from '@/lib/types'
import { UtilityDetailDialog } from '@/components/sections/utility-detail-dialog'
import { cn } from '@/lib/utils'

type MapUtility = Stats['mapUtilities'][number]

// US states TopoJSON from CDN (loaded once, cached by the browser).
// This is the standard us-atlas simplified states-10m dataset (~100KB).
const US_STATES_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'

// Major US cities for the "search near me" quick-pick
const QUICK_CITIES = [
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.074 },
  { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
]

function tierFor(u: MapUtility): { label: string; color: string; ring: string } {
  if (u.legalExceedances > 0) {
    return { label: 'Above legal limit', color: '#e11d48', ring: '#fecdd3' }
  }
  if (u.healthExceedances >= 5) {
    return { label: 'Many health exceedances', color: '#f59e0b', ring: '#fde68a' }
  }
  if (u.healthExceedances > 0) {
    return { label: 'Some health exceedances', color: '#06b6d4', ring: '#a5f3fc' }
  }
  return { label: 'Within guidelines', color: '#10b981', ring: '#a7f3d0' }
}

export function MapSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [scores, setScores] = useState<Record<string, { score: number; grade: string; label: string; color: string; bgColor: string }> | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [hovered, setHovered] = useState<MapUtility | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [filterTier, setFilterTier] = useState<'all' | 'legal' | 'health' | 'clean'>('all')
  // Contaminant filter chips (separate from tier filter; ANDed together)
  const [contaminantFilter, setContaminantFilter] = useState<'all' | 'microplastics' | 'pfas' | 'lead' | 'dbp'>('all')
  // Radius search state
  const [radiusMode, setRadiusMode] = useState(false)
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number; name?: string } | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(300)
  const [nearby, setNearby] = useState<Array<Utility & { distanceMiles: number }> | null>(null)
  const [radiusLoading, setRadiusLoading] = useState(false)

  useEffect(() => {
    api.getStats().then((s) => {
      setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
    // Fetch safety scores for tooltips (non-blocking)
    api.getUtilityScores()
      .then((r) => {
        const map: Record<string, { score: number; grade: string; label: string; color: string; bgColor: string }> = {}
        for (const s of r.scores) {
          map[s.id] = { score: s.score, grade: s.grade, label: s.label, color: s.color, bgColor: s.bgColor }
        }
        setScores(map)
      })
      .catch(() => {})
  }, [])

  const runRadiusSearch = useCallback(async (lat: number, lng: number, radius: number) => {
    setRadiusLoading(true)
    try {
      const res = await api.nearbyUtilities(lat, lng, radius)
      setNearby(res.utilities)
    } catch (e) {
      console.error('Radius search failed', e)
      setNearby([])
    } finally {
      setRadiusLoading(false)
    }
  }, [])

  const setCenterAndSearch = useCallback((lat: number, lng: number, name?: string) => {
    setRadiusCenter({ lat, lng, name })
    setRadiusMode(true)
    runRadiusSearch(lat, lng, radiusMiles)
  }, [radiusMiles, runRadiusSearch])

  const openUtility = async (u: MapUtility | (Utility & { distanceMiles?: number })) => {
    setLoadingDetail(u.id)
    try {
      const detail = await api.getUtility(u.id)
      setSelected(detail)
    } catch (e) {
      console.error('Failed to load utility', e)
    } finally {
      setLoadingDetail(null)
    }
  }

  // Apply tier filter AND contaminant filter (both conditions must pass)
  const visibleUtilities = useMemo(() => {
    if (!stats) return []
    return stats.mapUtilities.filter((u) => {
      // Tier filter
      if (filterTier === 'legal' && !(u.legalExceedances > 0)) return false
      if (filterTier === 'health' && !(u.legalExceedances === 0 && u.healthExceedances > 0)) return false
      if (filterTier === 'clean' && !(u.healthExceedances === 0 && u.legalExceedances === 0)) return false
      // Contaminant filter (ANDed with tier)
      if (contaminantFilter !== 'all' && !u.contaminantExceedances?.[contaminantFilter]) return false
      return true
    })
  }, [stats, filterTier, contaminantFilter])

  // If radius mode is active, further filter to nearby utilities
  const displayedUtilities = useMemo(() => {
    if (!radiusMode || !nearby) return visibleUtilities
    const nearbyIds = new Set(nearby.map((u) => u.id))
    return visibleUtilities.filter((u) => nearbyIds.has(u.id))
  }, [visibleUtilities, radiusMode, nearby])

  const tierCounts = useMemo(() => {
    if (!stats) return { legal: 0, health: 0, clean: 0 }
    return {
      legal: stats.mapUtilities.filter((u) => u.legalExceedances > 0).length,
      health: stats.mapUtilities.filter((u) => u.legalExceedances === 0 && u.healthExceedances > 0).length,
      clean: stats.mapUtilities.filter((u) => u.healthExceedances === 0 && u.legalExceedances === 0).length,
    }
  }, [stats])

  // Per-contaminant counts (utilities with that contaminant flagged).
  // Computed against the full mapUtilities list so the chip counts reflect
  // total availability, independent of the current tier selection.
  const contaminantCounts = useMemo(() => {
    if (!stats) return { microplastics: 0, pfas: 0, lead: 0, dbp: 0 }
    const acc = { microplastics: 0, pfas: 0, lead: 0, dbp: 0 }
    for (const u of stats.mapUtilities) {
      const ce = u.contaminantExceedances
      if (ce?.microplastics) acc.microplastics++
      if (ce?.pfas) acc.pfas++
      if (ce?.lead) acc.lead++
      if (ce?.dbp) acc.dbp++
    }
    return acc
  }, [stats])

  const anyFilterActive = filterTier !== 'all' || contaminantFilter !== 'all'

  const clearFilters = () => {
    setFilterTier('all')
    setContaminantFilter('all')
  }

  return (
    <div className="min-h-screen bg-water-hero">
      <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="mb-6 text-center">
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <MapIcon className="mr-1 h-3 w-3" />
            National Map View
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Water utilities across America
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Every dot is a water utility in our database. Color shows how its
            measured contaminants compare to health and legal limits. Click any
            dot for the full breakdown, or search for utilities near you.
          </p>
        </div>

        {/* Tier filter chips + clear-filters button */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="sr-only">Filter utilities by contamination tier</span>
          {([
            { id: 'all', label: 'All', count: stats?.mapUtilities.length ?? 0, color: '#64748b' },
            { id: 'clean', label: 'Within guidelines', count: tierCounts.clean, color: '#10b981' },
            { id: 'health', label: 'Health exceedances', count: tierCounts.health, color: '#06b6d4' },
            { id: 'legal', label: 'Above legal limit', count: tierCounts.legal, color: '#e11d48' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTier(t.id)}
              aria-pressed={filterTier === t.id}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                filterTier === t.id
                  ? 'border-primary bg-primary text-primary-foreground shadow-sm dark:border-primary dark:bg-primary dark:text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground dark:border-border dark:bg-card dark:text-muted-foreground'
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: t.color }} />
              {t.label}
              {loading ? (
                <span className="ml-1 inline-block h-3 w-4 animate-pulse rounded bg-muted-foreground/20" />
              ) : (
                <span className={cn('ml-0.5 rounded-full px-1.5 text-[10px]', filterTier === t.id ? 'bg-white/20' : 'bg-muted')}>
                  {t.count}
                </span>
              )}
            </button>
          ))}

          {anyFilterActive && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 gap-1 rounded-full px-2.5 text-xs text-muted-foreground hover:text-foreground"
              aria-label="Clear all filters"
            >
              <RotateCcw className="h-3 w-3" />
              Clear filters
            </Button>
          )}
        </div>

        {/* Contaminant filter chips (ANDed with tier filter) */}
        <div className="mb-5 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FlaskConical className="h-3 w-3" />
            By contaminant
          </span>
          {([
            { id: 'all', label: 'All', count: stats?.mapUtilities.length ?? 0, Icon: null as null | typeof Microscope },
            { id: 'microplastics', label: 'Microplastics only', count: contaminantCounts.microplastics, Icon: Microscope },
            { id: 'pfas', label: 'PFAS only', count: contaminantCounts.pfas, Icon: FlaskConical },
            { id: 'lead', label: 'Lead only', count: contaminantCounts.lead, Icon: Droplets },
            { id: 'dbp', label: 'Disinfection byproducts', count: contaminantCounts.dbp, Icon: Beaker },
          ] as const).map((c) => {
            const selected = contaminantFilter === c.id
            return (
              <button
                key={c.id}
                onClick={() => setContaminantFilter(c.id)}
                aria-pressed={selected}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all',
                  selected
                    ? 'border-primary bg-primary text-primary-foreground shadow-sm dark:border-primary dark:bg-primary dark:text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground dark:border-border dark:bg-card dark:text-muted-foreground'
                )}
              >
                {c.Icon && <c.Icon className="h-3 w-3" />}
                {c.label}
                {loading ? (
                  <span className="ml-1 inline-block h-3 w-4 animate-pulse rounded bg-muted-foreground/20" />
                ) : (
                  <span className={cn('ml-0.5 rounded-full px-1.5 text-[10px]', selected ? 'bg-white/20' : 'bg-muted')}>
                    {c.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Radius search bar */}
        <Card className="mb-5 overflow-hidden border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Navigation className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">Find utilities near you</div>
                  <div className="text-[11px] text-muted-foreground">
                    Geospatial radius search (haversine, PostGIS-ready)
                  </div>
                </div>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-2">
                {QUICK_CITIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setCenterAndSearch(c.lat, c.lng, c.name)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
                      radiusCenter?.name === c.name
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    )}
                  >
                    <MapPin className="h-3 w-3" />
                    {c.name}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs text-muted-foreground">Radius</Label>
                <select
                  value={radiusMiles}
                  onChange={(e) => {
                    const r = Number(e.target.value)
                    setRadiusMiles(r)
                    if (radiusCenter) runRadiusSearch(radiusCenter.lat, radiusCenter.lng, r)
                  }}
                  className="h-8 rounded-md border border-border bg-card px-2 text-xs"
                >
                  <option value={50}>50 mi</option>
                  <option value={100}>100 mi</option>
                  <option value={300}>300 mi</option>
                  <option value={500}>500 mi</option>
                  <option value={1000}>1000 mi</option>
                </select>
                {radiusMode && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8"
                    onClick={() => {
                      setRadiusMode(false)
                      setRadiusCenter(null)
                      setNearby(null)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {radiusMode && nearby && (
              <div className="mt-3 flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2 text-sm">
                {radiusLoading ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin text-primary" /> Searching...</>
                ) : (
                  <>
                    <Search className="h-3.5 w-3.5 text-primary" />
                    <span className="font-medium text-foreground">{nearby.length}</span>
                    <span className="text-muted-foreground">
                      utilities within {radiusMiles} miles of {radiusCenter?.name ?? `${radiusCenter?.lat.toFixed(2)}, ${radiusCenter?.lng.toFixed(2)}`}
                    </span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* The Map */}
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-[500px] sm:h-[600px] w-full rounded-none" />
            ) : (
              <div
                className="relative h-[500px] sm:h-[600px] w-full bg-gradient-to-b from-sky-50 to-cyan-50 dark:from-slate-900 dark:to-slate-800"
                onMouseMove={(e) => {
                  if (hovered) setTooltipPos({ x: e.clientX, y: e.clientY })
                }}
              >
                <ComposableMap
                  projection="geoAlbersUsa"
                  projectionConfig={{ scale: 1000 }}
                  width={980}
                  height={580}
                  style={{ width: '100%', height: '100%' }}
                >
                  <ZoomableGroup zoom={1} minZoom={0.8} maxZoom={4}>
                    <Geographies geography={US_STATES_URL}>
                      {({ geographies }: { geographies: Array<{ rsmKey: string; properties: { name: string } }> }) =>
                        geographies.map((geo) => (
                          <Geography
                            key={geo.rsmKey}
                            geography={geo}
                            fill="oklch(0.93 0.02 200)"
                            stroke="oklch(0.7 0.05 195)"
                            strokeWidth={0.5}
                            style={{
                              default: { outline: 'none', transition: 'fill 0.15s' },
                              hover: {
                                fill: 'oklch(0.85 0.05 195)',
                                outline: 'none',
                                cursor: 'pointer',
                              },
                              pressed: { outline: 'none' },
                            }}
                          />
                        ))
                      }
                    </Geographies>

                    {/* Radius circle (visual indicator) */}
                    {radiusMode && radiusCenter && (
                      <Marker
                        coordinates={[radiusCenter.lng, radiusCenter.lat]}
                        key={`radius-${radiusCenter.lat}-${radiusCenter.lng}`}
                      >
                        <circle
                          r={Math.min(radiusMiles * 0.8, 120)}
                          fill="oklch(0.55 0.13 195 / 0.08)"
                          stroke="oklch(0.55 0.13 195 / 0.5)"
                          strokeWidth={1.5}
                          strokeDasharray="4 3"
                        />
                        <circle r={4} fill="oklch(0.55 0.13 195)" />
                      </Marker>
                    )}

                    {/* Utility markers */}
                    {displayedUtilities.map((u, i) => {
                      const tier = tierFor(u)
                      const isHovered = hovered?.id === u.id
                      const isLoading = loadingDetail === u.id
                      const radius = Math.max(5, Math.min(13, 5 + Math.log2(Math.max(u.population, 100000) / 100000) * 1.4))
                      const isNearby = nearby?.find((n) => n.id === u.id)
                      return (
                        <Marker
                          key={u.id}
                          coordinates={[u.longitude, u.latitude]}
                          onMouseEnter={() => setHovered(u)}
                          onMouseLeave={() => { setHovered(null); setTooltipPos(null) }}
                          onClick={() => openUtility(u)}
                          style={{ cursor: 'pointer' }}
                        >
                          {/* Pulse ring for legal exceedances */}
                          {u.legalExceedances > 0 && (
                            <circle
                              r={radius + 3}
                              fill="none"
                              stroke={tier.color}
                              strokeWidth={1.5}
                              opacity={0.6}
                            >
                              <animate
                                attributeName="r"
                                values={`${radius + 3};${radius + 10};${radius + 3}`}
                                dur="2.5s"
                                repeatCount="indefinite"
                              />
                              <animate
                                attributeName="opacity"
                                values="0.6;0;0.6"
                                dur="2.5s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}
                          {/* Outer ring */}
                          <circle
                            r={radius + 2}
                            fill={tier.ring}
                            opacity={isHovered ? 1 : 0.7}
                          />
                          {/* Main dot */}
                          <motion.circle
                            r={radius}
                            fill={tier.color}
                            stroke="white"
                            strokeWidth={1.5}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ delay: i * 0.04, type: 'spring', stiffness: 200 }}
                            style={{ transformOrigin: 'center', filter: isHovered ? 'brightness(1.15)' : 'none' }}
                          />
                          {/* Loading spinner */}
                          {isLoading && (
                            <circle
                              r={radius + 6}
                              fill="none"
                              stroke="oklch(0.55 0.13 195)"
                              strokeWidth={2}
                              strokeDasharray="20 10"
                            >
                              <animateTransform
                                attributeName="transform"
                                type="rotate"
                                from="0"
                                to="360"
                                dur="1s"
                                repeatCount="indefinite"
                              />
                            </circle>
                          )}
                          {/* Distance label in radius mode */}
                          {isNearby && (
                            <text
                              y={radius + 14}
                              textAnchor="middle"
                              fontSize={9}
                              fontWeight={600}
                              fill="oklch(0.3 0.05 195)"
                              style={{ pointerEvents: 'none', paintOrder: 'stroke' }}
                              stroke="white"
                              strokeWidth={2}
                            >
                              {isNearby.distanceMiles} mi
                            </text>
                          )}
                        </Marker>
                      )
                    })}
                  </ZoomableGroup>
                </ComposableMap>

                {/* Floating tooltip */}
                {hovered && tooltipPos && (
                  <div
                    className="pointer-events-none fixed z-50 max-w-[260px] rounded-lg border border-border bg-card/95 p-3 shadow-xl backdrop-blur"
                    style={{
                      left: Math.min(tooltipPos.x + 14, (typeof window !== 'undefined' ? window.innerWidth : 9999) - 280),
                      top: tooltipPos.y + 14,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                    <div className="text-sm font-semibold text-foreground">{hovered.name}</div>
                    {scores?.[hovered.id] && (
                      <div
                        className={`flex h-9 w-9 shrink-0 flex-col items-center justify-center rounded-lg ${scores[hovered.id].bgColor}`}
                        title={`Safety score: ${scores[hovered.id].score}/100`}
                      >
                        <span className={`text-sm font-extrabold tabular-nums leading-none ${scores[hovered.id].color}`}>{scores[hovered.id].score}</span>
                        <span className={`text-[8px] font-bold leading-none ${scores[hovered.id].color}`}>{scores[hovered.id].grade}</span>
                      </div>
                    )}
                  </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {hovered.city}, {hovered.state} · pop. {hovered.population.toLocaleString()}
                    </div>
                    {scores?.[hovered.id] && (
                      <div className="mt-1 text-[10px] font-medium text-muted-foreground">
                        Safety: <span className={scores[hovered.id].color}>{scores[hovered.id].label}</span>
                      </div>
                    )}
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                      {hovered.healthExceedances > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                          {hovered.healthExceedances} health
                        </span>
                      )}
                      {hovered.legalExceedances > 0 && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                          {hovered.legalExceedances} legal
                        </span>
                      )}
                      {hovered.healthExceedances === 0 && hovered.legalExceedances === 0 && (
                        <span className="rounded bg-emerald-100 px-1.5 py-0.5 font-medium text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                          Within guidelines
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[10px] text-primary">Click to view details →</div>
                  </div>
                )}

                {/* Legend (bottom-left) */}
                <div className="absolute bottom-3 left-3 rounded-lg border border-border/60 bg-card/90 p-3 backdrop-blur">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Contamination tier
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: 'Within guidelines', color: '#10b981' },
                      { label: 'Health exceedances', color: '#06b6d4' },
                      { label: 'Many exceedances', color: '#f59e0b' },
                      { label: 'Above legal limit', color: '#e11d48' },
                    ].map((l) => (
                      <div key={l.label} className="flex items-center gap-2 text-[11px]">
                        <span className="h-2.5 w-2.5 rounded-full ring-2 ring-white" style={{ backgroundColor: l.color }} />
                        <span className="text-foreground">{l.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Zoom hint (bottom-right) */}
                <div className="absolute bottom-3 right-3 rounded-md border border-border/60 bg-card/90 px-2.5 py-1 text-[10px] text-muted-foreground backdrop-blur">
                  Scroll to zoom · Click dot for details
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats */}
        {!loading && stats && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat icon={Building2} label="Utilities mapped" value={stats.mapUtilities.length.toString()} />
            <MiniStat icon={Users} label="People represented" value={`${(stats.populationServed / 1_000_000).toFixed(1)}M`} />
            <MiniStat icon={AlertTriangle} label="Above legal limit" value={tierCounts.legal.toString()} tone="warning" />
            <MiniStat icon={ShieldCheck} label="Within guidelines" value={tierCounts.clean.toString()} tone="ok" />
          </div>
        )}

        {/* Nearby results list (radius mode) */}
        {radiusMode && nearby && nearby.length > 0 && (
          <Card className="mt-5 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Navigation className="h-4 w-4 text-primary" />
                Utilities near {radiusCenter?.name ?? 'selected point'}
                <Badge variant="secondary" className="ml-1 bg-primary/10 text-primary">{nearby.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {nearby.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => openUtility(u)}
                    className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{u.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {u.city}, {u.state} · pop. {u.population.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                        {u.distanceMiles} mi
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Full utility list (fallback) */}
        {!loading && stats && !radiusMode && (
          <Card className="mt-5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                All utilities ({displayedUtilities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {displayedUtilities
                  .slice()
                  .sort((a, b) => b.legalExceedances - a.legalExceedances || b.healthExceedances - a.healthExceedances)
                  .map((u) => {
                    const tier = tierFor(u)
                    return (
                      <button
                        key={u.id}
                        onClick={() => openUtility(u)}
                        className="group flex items-center gap-3 rounded-lg border border-border/60 bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm"
                      >
                        <span
                          className="h-3 w-3 shrink-0 rounded-full ring-2"
                          style={{ backgroundColor: tier.color, '--tw-ring-color': tier.ring } as React.CSSProperties}
                        />
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">{u.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {u.city}, {u.state} · {u.population.toLocaleString()} served
                          </div>
                        </div>
                        <div className="flex shrink-0 gap-1.5 text-[10px]">
                          {u.healthExceedances > 0 && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                              {u.healthExceedances}H
                            </span>
                          )}
                          {u.legalExceedances > 0 && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">
                              {u.legalExceedances}L
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
              </div>
            </CardContent>
          </Card>
        )}
      </section>

      <UtilityDetailDialog utility={selected} onClose={() => setSelected(null)} />
    </div>
  )
}

function MiniStat({
  icon: Icon,
  label,
  value,
  tone = 'default',
}: {
  icon: React.ElementType
  label: string
  value: string
  tone?: 'default' | 'ok' | 'warning'
}) {
  const valueCls =
    tone === 'ok'
      ? 'text-emerald-600'
      : tone === 'warning'
      ? 'text-rose-600'
      : 'text-foreground'
  const iconCls =
    tone === 'ok'
      ? 'bg-emerald-100 text-emerald-600'
      : tone === 'warning'
      ? 'bg-rose-100 text-rose-600'
      : 'bg-primary/10 text-primary'
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <div className={cn('inline-flex h-7 w-7 items-center justify-center rounded-md', iconCls)}>
            <Icon className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0">
            <div className={cn('text-lg font-bold tabular-nums leading-tight', valueCls)}>{value}</div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground leading-tight">
              {label}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
