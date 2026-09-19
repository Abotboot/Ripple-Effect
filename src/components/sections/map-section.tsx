'use client'

import './editorial-pages.css'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { geoAlbersUsa } from 'd3-geo'
import {
  ComposableMap,
  Geographies,
  Geography,
  Marker,
  ZoomableGroup,
} from 'react-simple-maps'
import {
  Map as MapIcon, MapPin, Loader2, AlertTriangle, ShieldCheck, Building2,
  Navigation, Search, X, RotateCcw,
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
import { assessmentKind, hasFiniteCoordinates, unavailableAssessment } from '@/lib/sample-read-model'

type MapUtility = Pick<Stats['mapUtilities'][number], 'id' | 'name' | 'city' | 'state' | 'pwsid' | 'latitude' | 'longitude' | 'population' | 'assessment'> &
  Partial<Pick<Stats['mapUtilities'][number], 'contaminantExceedances'>>

// US states TopoJSON from CDN (loaded once, cached by the browser).
// This is the standard us-atlas simplified states-10m dataset (~100KB).
const US_STATES_URL = 'https://cdn.jsdelivr.net/npm/us-atlas@3/states-10m.json'
// The composite US projection clips valid coordinates elsewhere in the world.
// Keep those records in the list, but never pass a null projection into Marker.
const isOnUSMap = geoAlbersUsa()

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
  const kind = assessmentKind(u.assessment)
  if (kind === 'legal') {
    return { label: 'Records above legal limit', color: '#e11d48', ring: '#fecdd3' }
  }
  if (kind === 'health') {
    return { label: 'Records above health guideline', color: '#d97706', ring: '#fde68a' }
  }
  if (kind === 'compared') {
    return { label: 'No exceedance in compared records', color: '#708d9b', ring: '#cbd5e1' }
  }
  return { label: kind === 'unavailable' ? 'Comparisons unavailable' : 'Not assessed', color: '#87919b', ring: '#cbd5e1' }
}

export function MapSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [locations, setLocations] = useState<MapUtility[] | null>(null)
  const [unmappedCount, setUnmappedCount] = useState(0)
  const [mapError, setMapError] = useState<string | null>(null)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)
  const [assessmentLoading, setAssessmentLoading] = useState(true)
  const [detailError, setDetailError] = useState<MapUtility | (Utility & { distanceMiles?: number }) | null>(null)
  const [reload, setReload] = useState(0)
  const [geography, setGeography] = useState<Record<string, unknown> | null>(null)
  const [geographyError, setGeographyError] = useState(false)
  const [geographyReload, setGeographyReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [hovered, setHovered] = useState<MapUtility | null>(null)
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null)
  const [filterTier, setFilterTier] = useState<'all' | 'legal' | 'health' | 'unassessed' | 'compared'>('all')
  // Contaminant filter chips (separate from tier filter; ANDed together)
  const [contaminantFilter, setContaminantFilter] = useState<'all' | 'microplastics' | 'pfas' | 'lead' | 'dbp'>('all')
  // Radius search state
  const [radiusMode, setRadiusMode] = useState(false)
  const [radiusCenter, setRadiusCenter] = useState<{ lat: number; lng: number; name?: string } | null>(null)
  const [radiusMiles, setRadiusMiles] = useState(300)
  const [nearby, setNearby] = useState<Array<Utility & { distanceMiles: number }> | null>(null)
  const [radiusLoading, setRadiusLoading] = useState(false)
  const [radiusError, setRadiusError] = useState(false)
  const radiusRequest = useRef(0)
  const detailRequest = useRef(0)
  const retryData = () => {
    setLoading(true); setAssessmentLoading(true); setMapError(null); setAssessmentError(null)
    setLocations(null); setStats(null); setHovered(null)
    setFilterTier('all'); setContaminantFilter('all')
    setReload(value => value + 1)
  }

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    // A dedicated location read never depends on sample metadata, scores or finance.
    api.getMapLocations(controller.signal)
      .then(result => {
        if (!Array.isArray(result.mapUtilities)) throw new Error('Invalid location response')
        if (active) {
          setLocations(result.mapUtilities.filter((u: MapUtility) => u && typeof u.id === 'string' && hasFiniteCoordinates(u)))
          setUnmappedCount(Number.isSafeInteger(result.unmappedCount) && result.unmappedCount >= 0 ? result.unmappedCount : 0)
        }
      }).catch(() => { if (active) setMapError('Utility locations could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    api.getStats().then(result => {
      if (!Array.isArray(result.mapUtilities)) throw new Error('Invalid assessment response')
      if (active) setStats(result)
    }).catch(() => { if (active) setAssessmentError('Sample comparisons could not be loaded. Locations are still available.') })
      .finally(() => { if (active) setAssessmentLoading(false) })
    return () => { active = false; controller.abort() }
  }, [reload])

  useEffect(() => {
    const controller = new AbortController()
    fetch(US_STATES_URL, { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error('Map background request failed')
      const data = await response.json()
      if (data.type !== 'Topology' || !data.objects?.states) throw new Error('Invalid map background')
      if (!controller.signal.aborted) setGeography(data)
    }).catch(() => { if (!controller.signal.aborted) setGeographyError(true) })
    return () => controller.abort()
  }, [geographyReload])

  const mapUtilities = useMemo(() => {
    const assessments = new Map(stats?.mapUtilities.map(u => [u.id, u]) ?? [])
    return (locations ?? []).map(location => {
      const measured = assessments.get(location.id)
      return { ...location, assessment: measured?.assessment ?? unavailableAssessment(),
        contaminantExceedances: measured?.contaminantExceedances }
    })
  }, [locations, stats])

  const runRadiusSearch = useCallback(async (lat: number, lng: number, radius: number) => {
    const request = ++radiusRequest.current
    setRadiusLoading(true)
    setRadiusError(false)
    setNearby(null)
    try {
      const res = await api.nearbyUtilities(lat, lng, radius)
      if (!Array.isArray(res.utilities)) throw new Error('Invalid nearby response')
      if (request === radiusRequest.current) setNearby(res.utilities.filter(u => hasFiniteCoordinates(u) && Number.isFinite(u.distanceMiles) && u.distanceMiles >= 0))
    } catch {
      if (request === radiusRequest.current) setRadiusError(true)
    } finally {
      if (request === radiusRequest.current) setRadiusLoading(false)
    }
  }, [])

  const setCenterAndSearch = useCallback((lat: number, lng: number, name?: string) => {
    setRadiusCenter({ lat, lng, name })
    setRadiusMode(true)
    runRadiusSearch(lat, lng, radiusMiles)
  }, [radiusMiles, runRadiusSearch])

  const openUtility = async (u: MapUtility | (Utility & { distanceMiles?: number })) => {
    const request = ++detailRequest.current
    setDetailError(null)
    setLoadingDetail(u.id)
    try {
      const detail = await api.getUtility(u.id)
      if (request === detailRequest.current) setSelected(detail)
    } catch {
      if (request === detailRequest.current) setDetailError(u)
    } finally {
      if (request === detailRequest.current) setLoadingDetail(null)
    }
  }

  // Apply tier filter AND contaminant filter (both conditions must pass)
  const visibleUtilities = useMemo(() => {
    return mapUtilities.filter((u) => {
      const kind = assessmentKind(u.assessment)
      // Tier filter
      if (filterTier === 'legal' && kind !== 'legal') return false
      if (filterTier === 'health' && kind !== 'health') return false
      if (filterTier === 'compared' && kind !== 'compared') return false
      if (filterTier === 'unassessed' && kind !== 'unavailable' && kind !== 'not_assessed') return false
      // Contaminant filter (ANDed with tier)
      if (contaminantFilter !== 'all' && !u.contaminantExceedances?.[contaminantFilter]) return false
      return true
    })
  }, [mapUtilities, filterTier, contaminantFilter])

  // If radius mode is active, further filter to nearby utilities
  const displayedUtilities = useMemo(() => {
    if (!radiusMode || !nearby) return visibleUtilities
    const nearbyIds = new Set(nearby.map((u) => u.id))
    return visibleUtilities.filter((u) => nearbyIds.has(u.id))
  }, [visibleUtilities, radiusMode, nearby])

  const tierCounts = useMemo(() => {
    if (!stats) return { legal: null, health: null, unassessed: null, compared: null }
    return {
      legal: mapUtilities.filter(u => assessmentKind(u.assessment) === 'legal').length,
      health: mapUtilities.filter(u => assessmentKind(u.assessment) === 'health').length,
      unassessed: mapUtilities.filter(u => ['unavailable', 'not_assessed'].includes(assessmentKind(u.assessment))).length,
      compared: mapUtilities.filter(u => assessmentKind(u.assessment) === 'compared').length,
    }
  }, [mapUtilities, stats])

  // Per-contaminant counts (utilities with that contaminant flagged).
  // Computed against the full mapUtilities list so the chip counts reflect
  // total availability, independent of the current tier selection.
  const contaminantCounts = useMemo(() => {
    if (!stats) return { microplastics: null, pfas: null, lead: null, dbp: null }
    const acc = { microplastics: 0, pfas: 0, lead: 0, dbp: 0 }
    for (const u of mapUtilities) {
      const ce = u.contaminantExceedances
      if (ce?.microplastics) acc.microplastics++
      if (ce?.pfas) acc.pfas++
      if (ce?.lead) acc.lead++
      if (ce?.dbp) acc.dbp++
    }
    return acc
  }, [mapUtilities, stats])

  const anyFilterActive = filterTier !== 'all' || contaminantFilter !== 'all'

  const clearFilters = () => {
    setFilterTier('all')
    setContaminantFilter('all')
  }

  return (
    <div className="editorial-page map-workbench min-h-screen">
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
            Each dot is a recorded utility location. Comparisons use eligible reviewed
            measurements where available; an unassessed location is not a safety finding.
            Select a dot for its records, or search by distance from a city.
          </p>
        </div>

        {mapError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p>{mapError} Please retry to see recorded locations.</p>
          <Button onClick={retryData}>Retry locations</Button>
        </div>}
        {assessmentError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p>{assessmentError}</p>
          <Button variant="outline" onClick={retryData}>Retry comparisons</Button>
        </div>}
        {stats?.dataStatus?.status === 'degraded' && <p role="status" className="mb-4 rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          Historical sample records are available, but their verification metadata is unavailable.
          These records remain unreviewed and do not establish safety or benchmark compliance.
        </p>}
        {detailError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p>Records for {detailError.name} could not be loaded.</p>
          <Button variant="outline" onClick={() => openUtility(detailError)}>Retry utility records</Button>
        </div>}

        {/* Tier filter chips + clear-filters button */}
        <div className="mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="sr-only">Filter utilities by recorded comparisons</span>
          {([
            { id: 'all', label: 'All locations', count: locations ? mapUtilities.length : null, color: '#64748b' },
            { id: 'unassessed', label: 'Not assessed', count: tierCounts.unassessed, color: '#87919b' },
            { id: 'compared', label: 'No recorded exceedance', count: tierCounts.compared, color: '#708d9b' },
            { id: 'health', label: 'Health exceedances', count: tierCounts.health, color: '#d97706' },
            { id: 'legal', label: 'Above legal limit', count: tierCounts.legal, color: '#e11d48' },
          ] as const).map((t) => (
            <button
              key={t.id}
              onClick={() => setFilterTier(t.id)}
              disabled={t.id !== 'all' && !stats}
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
                  {t.count ?? '—'}
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
            { id: 'all', label: 'All', count: locations ? mapUtilities.length : null, Icon: null as null | typeof Microscope },
            { id: 'microplastics', label: 'Microplastics recorded', count: contaminantCounts.microplastics, Icon: Microscope },
            { id: 'pfas', label: 'PFAS above guideline', count: contaminantCounts.pfas, Icon: FlaskConical },
            { id: 'lead', label: 'Lead above guideline', count: contaminantCounts.lead, Icon: Droplets },
            { id: 'dbp', label: 'DBPs above guideline', count: contaminantCounts.dbp, Icon: Beaker },
          ] as const).map((c) => {
            const selected = contaminantFilter === c.id
            return (
              <button
                key={c.id}
                onClick={() => setContaminantFilter(c.id)}
                disabled={c.id !== 'all' && !stats}
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
                    {c.count ?? '—'}
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
                    Choose a city and distance to find recorded utility locations.
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
                      radiusRequest.current++
                      setRadiusMode(false)
                      setRadiusCenter(null)
                      setNearby(null)
                      setRadiusError(false)
                      setRadiusLoading(false)
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
              </div>
            </div>
            {radiusMode && radiusError && <div role="alert" className="mt-3 flex flex-wrap items-center gap-3 text-sm">
              <span>Nearby search failed. Showing all loaded locations until it can be retried.</span>
              <Button variant="outline" size="sm" onClick={() => radiusCenter && runRadiusSearch(radiusCenter.lat, radiusCenter.lng, radiusMiles)}>Retry nearby search</Button>
            </div>}
            {radiusMode && radiusLoading && <p role="status" className="mt-3 text-sm text-muted-foreground">Searching nearby utilities…</p>}
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

        {geographyError && <div role="alert" className="mb-4 flex flex-wrap items-center gap-3 text-sm">
          <span>The map background could not load. Available locations remain in the list below.</span>
          <Button variant="outline" size="sm" onClick={() => { setGeographyError(false); setGeographyReload(value => value + 1) }}>Retry map background</Button>
        </div>}
        {!loading && locations && mapUtilities.length === 0 && <p role="status" className="mb-4 rounded-lg border border-border p-4">
          No utility locations with usable coordinates were returned.{unmappedCount > 0 ? ` ${unmappedCount} utility records have no usable coordinates.` : ''}
        </p>}
        {!loading && locations && mapUtilities.length > 0 && displayedUtilities.length === 0 && <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
          <span>No locations match the current filters. Unreviewed records do not qualify as benchmark findings.</span>
          {anyFilterActive && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        </div>}
        {!loading && locations && assessmentLoading && <p role="status" className="mb-3 text-sm text-muted-foreground">Locations loaded. Checking available sample comparisons…</p>}

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
                    {geography && <Geographies geography={geography}>
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
                    </Geographies>}

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
                      if (!isOnUSMap([u.longitude, u.latitude])) return null
                      const tier = tierFor(u)
                      const isHovered = hovered?.id === u.id
                      const isLoading = loadingDetail === u.id
                      const radius = Math.max(5, Math.min(13, 5 + Math.log2(Math.max(u.population, 100000) / 100000) * 1.4))
                      const isNearby = nearby?.find((n) => n.id === u.id)
                      return (
                        <Marker
                          key={u.id}
                          data-testid="utility-map-marker"
                          data-assessment={assessmentKind(u.assessment)}
                          coordinates={[u.longitude, u.latitude]}
                          onMouseEnter={() => setHovered(u)}
                          onMouseLeave={() => { setHovered(null); setTooltipPos(null) }}
                          onClick={() => openUtility(u)}
                          tabIndex={0}
                          role="button"
                          aria-label={`${u.name}: ${tier.label}`}
                          onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openUtility(u) } }}
                          style={{ default: { cursor: 'pointer' }, hover: { cursor: 'pointer' } }}
                        >
                          {/* Pulse ring for legal exceedances */}
                          {(u.assessment?.legalAbove ?? 0) > 0 && (
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
                            transition={{ delay: Math.min(i * 0.015, 0.3), type: 'spring', stiffness: 200 }}
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
                  </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {hovered.city}, {hovered.state} · pop. {hovered.population.toLocaleString()}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{tierFor(hovered).label}</div>
                    <div className="mt-1.5 flex flex-wrap gap-1.5 text-[10px]">
                      {hovered.assessment?.healthCompared != null && hovered.assessment.healthCompared > 0 && (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                          {hovered.assessment.healthAbove} above / {hovered.assessment.healthCompared} health comparisons
                        </span>
                      )}
                      {hovered.assessment?.legalCompared != null && hovered.assessment.legalCompared > 0 && (
                        <span className="rounded bg-rose-100 px-1.5 py-0.5 font-medium text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">
                          {hovered.assessment.legalAbove} above / {hovered.assessment.legalCompared} legal comparisons
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 text-[10px] text-primary">Click to view details →</div>
                  </div>
                )}

                {/* Legend (bottom-left) */}
                <div className="absolute bottom-3 left-3 rounded-lg border border-border/60 bg-card/90 p-3 backdrop-blur">
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Recorded comparisons
                  </div>
                  <div className="space-y-1">
                    {[
                      { label: 'Unassessed / unavailable', color: '#87919b' },
                      { label: 'No exceedance in compared records', color: '#708d9b' },
                      { label: 'Health exceedances', color: '#d97706' },
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
        {!loading && locations && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat icon={Building2} label="Utility locations" value={mapUtilities.length.toString()} />
            <MiniStat icon={AlertTriangle} label="Recorded legal exceedances" value={tierCounts.legal?.toString() ?? '—'} tone="warning" />
            <MiniStat icon={ShieldCheck} label="Not assessed" value={tierCounts.unassessed?.toString() ?? '—'} />
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
        {!loading && locations && !radiusMode && (
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
                  .sort((a, b) => (b.assessment?.legalAbove ?? 0) - (a.assessment?.legalAbove ?? 0) ||
                    (b.assessment?.healthAbove ?? 0) - (a.assessment?.healthAbove ?? 0) || a.name.localeCompare(b.name))
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
                            {u.city}, {u.state} · {u.population.toLocaleString()} residents served
                          </div>
                          <div className="mt-1 text-xs text-muted-foreground">{tier.label}</div>
                        </div>
                        <div className="flex shrink-0 gap-1.5 text-[10px]">
                          {(u.assessment?.healthAbove ?? 0) > 0 && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                              {u.assessment?.healthAbove}H
                            </span>
                          )}
                          {(u.assessment?.legalAbove ?? 0) > 0 && (
                            <span className="rounded bg-rose-50 px-1.5 py-0.5 font-medium text-rose-700">
                              {u.assessment?.legalAbove}L
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
