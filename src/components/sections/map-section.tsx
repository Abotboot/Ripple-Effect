'use client'

import './editorial-pages.css'
import './map-section.css'

import { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import dynamic from 'next/dynamic'

const UtilityStreetMap = dynamic(() => import('./utility-street-map'), { ssr: false, loading: () => <Skeleton className="h-[500px] sm:h-[600px] w-full" /> })
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
import { api, type WaterReading } from '@/lib/api'
import { READING_STATUS, type ReadingStatus } from '@/lib/reading-status'
import { SplitWords } from '@/components/motion/split-words'
import type { Stats, UtilityWithStats, Utility } from '@/lib/types'
import { UtilityDetailDialog } from '@/components/sections/utility-detail-dialog'
import { cn } from '@/lib/utils'
import { assessmentKind, hasFiniteCoordinates, unavailableAssessment } from '@/lib/sample-read-model'
import { utilityMapTier as tierFor } from '@/lib/map-presentation'

type MapUtility = Pick<Stats['mapUtilities'][number], 'id' | 'name' | 'city' | 'state' | 'pwsid' | 'latitude' | 'longitude' | 'population' | 'assessment'> &
  Partial<Pick<Stats['mapUtilities'][number], 'contaminantExceedances'>>


// Major US cities for the "search near me" quick-pick
const QUICK_CITIES = [
  { name: 'Chicago, IL', lat: 41.8781, lng: -87.6298 },
  { name: 'New York, NY', lat: 40.7128, lng: -74.006 },
  { name: 'Los Angeles, CA', lat: 34.0522, lng: -118.2437 },
  { name: 'Houston, TX', lat: 29.7604, lng: -95.3698 },
  { name: 'Phoenix, AZ', lat: 33.4484, lng: -112.074 },
  { name: 'Seattle, WA', lat: 47.6062, lng: -122.3321 },
]

export function MapSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [locations, setLocations] = useState<MapUtility[] | null>(null)
  const [unmappedCount, setUnmappedCount] = useState(0)
  const [mapError, setMapError] = useState<string | null>(null)
  const [assessmentError, setAssessmentError] = useState<string | null>(null)
  const [assessmentLoading, setAssessmentLoading] = useState(true)
  const [detailError, setDetailError] = useState<MapUtility | (Utility & { distanceMiles?: number }) | null>(null)
  const [reload, setReload] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
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
  // Readings drawn at their collection point on the water
  const [waterReadings, setWaterReadings] = useState<WaterReading[] | null>(null)
  const [showUtilities, setShowUtilities] = useState(true)
  const [showReadings, setShowReadings] = useState(true)
  const [focusReading, setFocusReading] = useState<{ id: string; nonce: number } | null>(null)
  const mapAnchor = useRef<HTMLDivElement>(null)
  const retryData = () => {
    setLoading(true); setAssessmentLoading(true); setMapError(null); setAssessmentError(null)
    setLocations(null); setStats(null)
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
    api.getWaterReadings(controller.signal)
      .then(result => {
        if (!active) return
        const items = Array.isArray(result.items) ? result.items.filter(hasFiniteCoordinates) : []
        setWaterReadings(items)
        // "See it on the water" links elsewhere hand off a reading to focus.
        let pending: string | null = null
        try {
          pending = sessionStorage.getItem('pendingWaterReading')
          if (pending) sessionStorage.removeItem('pendingWaterReading')
        } catch { /* storage blocked */ }
        if (pending && items.some(r => r.id === pending)) {
          setShowReadings(true)
          setFocusReading({ id: pending, nonce: Date.now() })
          // Bring the map on screen so the flight to the water is visible.
          window.setTimeout(() => {
            const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
            mapAnchor.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
          }, 350)
        }
      })
      .catch(() => { if (active) setWaterReadings([]) })
    api.getStats().then(result => {
      if (!Array.isArray(result.mapUtilities)) throw new Error('Invalid assessment response')
      if (active) setStats(result)
    }).catch(() => { if (active) setAssessmentError('Sample comparisons could not be loaded. Locations are still available.') })
      .finally(() => { if (active) setAssessmentLoading(false) })
    return () => { active = false; controller.abort() }
  }, [reload])


  const waterBodies = useMemo(() => {
    const groups = new Map<string, { name: string; readings: WaterReading[] }>()
    for (const reading of waterReadings ?? []) {
      const name = reading.waterBody || reading.location || 'Unnamed water'
      const key = name.toLowerCase()
      const group = groups.get(key) ?? { name, readings: [] }
      group.readings.push(reading)
      groups.set(key, group)
    }
    return [...groups.values()].sort((a, b) => b.readings.length - a.readings.length || a.name.localeCompare(b.name))
  }, [waterReadings])

  const showOnWater = (reading: WaterReading) => {
    setShowReadings(true)
    setFocusReading({ id: reading.id, nonce: Date.now() })
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    mapAnchor.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
  }

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
        <div className="map-intro mb-8">
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <MapIcon className="mr-1 h-3 w-3" />
            National Map View
          </Badge>
          <h1 data-split className="text-3xl font-bold tracking-tight sm:text-4xl">
            <SplitWords text="Every reading," /> <em><SplitWords text="on the water" start={2} /></em> <SplitWords text="it came from." start={5} />
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground" data-reveal>
            Rippling pins sit on the lake, river or bay where a sample was collected. Solid dots
            locate water utilities. Comparisons use eligible reviewed measurements; an unassessed
            location is not a safety finding.
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
        {detailError && <div role="alert" className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4">
          <p>Records for {detailError.name} could not be loaded.</p>
          <Button variant="outline" onClick={() => openUtility(detailError)}>Retry utility records</Button>
        </div>}

        {/* Tier filter chips + clear-filters button */}
        <div className="map-chip-row mb-3 flex flex-wrap items-center justify-center gap-2">
          <span className="sr-only">Filter utilities by recorded comparisons</span>
          {([
            { id: 'all', label: 'All locations', count: locations ? mapUtilities.length : null, color: '#64748b' },
            { id: 'unassessed', label: 'Not assessed', count: tierCounts.unassessed, color: '#87919b' },
            { id: 'compared', label: 'No recorded exceedance', count: tierCounts.compared, color: '#708d9b' },
            { id: 'health', label: 'Health exceedances', count: tierCounts.health, color: '#d97706' },
            { id: 'legal', label: 'Above MCL benchmark', count: tierCounts.legal, color: '#e11d48' },
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
                  {t.count ?? 'N/A'}
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
        <div className="map-chip-row mb-5 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            <FlaskConical className="h-3 w-3" />
            By contaminant
          </span>
          {([
            { id: 'all', label: 'All', count: locations ? mapUtilities.length : null, Icon: null as null | typeof Microscope },
            { id: 'microplastics', label: 'Reviewed microplastics detected', count: contaminantCounts.microplastics, Icon: Microscope },
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
                    {c.count ?? 'N/A'}
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
              <div className="map-city-row flex flex-1 flex-wrap items-center gap-2">
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
                  <option value={1}>1 mi</option>
                  <option value={5}>5 mi</option>
                  <option value={10}>10 mi</option>
                  <option value={25}>25 mi</option>
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

        {!loading && locations && mapUtilities.length === 0 && <p role="status" className="mb-4 rounded-lg border border-border p-4">
          No utility locations with usable coordinates were returned.{unmappedCount > 0 ? ` ${unmappedCount} utility records have no usable coordinates.` : ''}
        </p>}
        {!loading && locations && mapUtilities.length > 0 && displayedUtilities.length === 0 && <div role="status" className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-border p-4">
          <span>No locations match the current filters. Unreviewed records do not qualify as benchmark findings.</span>
          {anyFilterActive && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        </div>}
        {!loading && locations && assessmentLoading && <p role="status" className="mb-3 text-sm text-muted-foreground">Locations loaded. Checking available sample comparisons…</p>}

        <div className="map-layers" role="group" aria-label="Map layers" data-loop>
          <button type="button" aria-pressed={showReadings} onClick={() => setShowReadings(value => !value)} data-testid="layer-readings">
            <span className="map-layer-swatch map-layer-swatch--ripple" aria-hidden="true" />
            Readings on the water
            <span className="map-layer-count">{waterReadings ? waterReadings.length : '…'}</span>
          </button>
          <button type="button" aria-pressed={showUtilities} onClick={() => setShowUtilities(value => !value)} data-testid="layer-utilities">
            <span className="map-layer-swatch" aria-hidden="true" />
            Utility locations
            <span className="map-layer-count">{locations ? displayedUtilities.length : '…'}</span>
          </button>
        </div>

        <div ref={mapAnchor}>
        <Card className="map-frame gap-0 overflow-hidden py-0 shadow-lg">
          <CardContent className="p-0">
            {loading ? <Skeleton className="h-[500px] sm:h-[600px] w-full rounded-none" /> :
              <UtilityStreetMap utilities={displayedUtilities} center={radiusMode ? radiusCenter : null}
                readings={showReadings ? waterReadings ?? [] : []} showUtilities={showUtilities}
                focusReading={focusReading}
                radiusMiles={radiusMiles} loadingId={loadingDetail}
                onSelect={id => {
                  const utility = displayedUtilities.find(item => item.id === id) ?? mapUtilities.find(item => item.id === id)
                  if (utility) void openUtility(utility)
                }} />}
          </CardContent>
        </Card>
        </div>
        <div className="my-3 flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Water reading legend">
          {(Object.keys(READING_STATUS) as ReadingStatus[]).map(status => <span key={status} className="inline-flex items-center gap-2">
            <span className="map-legend-ripple" style={{ '--pin': READING_STATUS[status].color } as React.CSSProperties} />{READING_STATUS[status].label}
          </span>)}
        </div>
        <div className="my-3 flex flex-wrap gap-x-5 gap-y-2 text-xs" aria-label="Map legend">
          {[
            { label: 'Not assessed', color: '#87919b' },
            { label: 'No recorded exceedance', color: '#708d9b' },
            { label: 'Above health guideline', color: '#d97706' },
            { label: 'Above MCL benchmark', color: '#e11d48' },
          ].map(item => <span key={item.label} className="inline-flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />{item.label}</span>)}
        </div>
        <p className="mb-4 text-xs text-muted-foreground">Zoom in for streets and neighborhoods. Utility dots locate utilities, not service-area boundaries; rippling pins mark the exact collection point.</p>

        {waterBodies.length > 0 && (
          <section className="water-index" aria-labelledby="water-index-title">
            <div className="water-index-head">
              <span>Collected on the water</span>
              <h2 id="water-index-title" data-reveal>{waterBodies.length} {waterBodies.length === 1 ? 'water body' : 'water bodies'}, {waterReadings?.length ?? 0} readings</h2>
            </div>
            <div className="water-index-grid">
              {waterBodies.map((body, index) => {
                const latest = body.readings[0]
                const worst = body.readings.find(r => r.status === 'legal') ?? body.readings.find(r => r.status === 'health') ?? latest
                return (
                  <button key={body.name} type="button" className="water-index-card" data-reveal data-spotlight
                    style={{ '--pin': READING_STATUS[worst.status].color, '--reveal-delay': `${Math.min(index, 8) * 60}ms` } as React.CSSProperties}
                    onClick={() => showOnWater(latest)} data-testid="water-index-card">
                    <span className="water-index-ripple" aria-hidden="true"><i /><i /><b /></span>
                    <span className="water-index-name">{body.name}</span>
                    <span className="water-index-meta">
                      {body.readings.length} {body.readings.length === 1 ? 'reading' : 'readings'} · latest {latest.level} {latest.unit} {latest.contaminant.name.toLowerCase()}
                    </span>
                    <span className="water-index-meta">
                      {latest.utility ? `${latest.utility.city}, ${latest.utility.state} · ` : ''}{latest.reviewLabel}
                    </span>
                    <span className="water-index-cta">Show on the water →</span>
                  </button>
                )
              })}
            </div>
          </section>
        )}
        {stats?.officialMonitoring && stats.officialMonitoring.utilities > 0 && <p className="mb-4 text-sm text-muted-foreground"><a href={stats.officialMonitoring.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-primary underline underline-offset-4">EPA UCMR 5</a>: PFOA/PFOS results for {stats.officialMonitoring.utilities} utilities. Colors compare historical samples with the 4 ppt federal MCL; they do not indicate regulatory violations.</p>}

        {/* Quick stats */}
        {!loading && locations && (
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <MiniStat icon={Building2} label="Utility locations" value={mapUtilities.length.toString()} />
            <MiniStat icon={AlertTriangle} label="Utilities above MCL benchmark" value={tierCounts.legal?.toString() ?? 'N/A'} tone="warning" />
            <MiniStat icon={ShieldCheck} label="Not assessed" value={tierCounts.unassessed?.toString() ?? 'N/A'} />
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
                        {u.city}, {u.state}
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
                            {u.city}, {u.state}
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
