'use client'

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import { Crosshair, Loader2, Search, X } from 'lucide-react'
import { OSM_ATTRIBUTION, OSM_TILES, rippleIcon } from '@/lib/leaflet-water'
import { searchWaterBodies, waterBodyAt, type WaterMatch } from '@/lib/water-lookup'
import 'leaflet/dist/leaflet.css'
import './water-map.css'

export type CollectionPoint = { latitude: number; longitude: number; waterBody: string }

type Props = {
  value: CollectionPoint | null
  onChange: (value: CollectionPoint | null) => void
  /** Where to open the map before a point exists, e.g. the selected utility. */
  hint?: { latitude: number; longitude: number } | null
}

type LookupState = 'idle' | 'looking' | 'water' | 'land' | 'offline'

export default function CollectionPointPicker({ value, onChange, hint }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const marker = useRef<L.Marker | null>(null)
  const lookup = useRef<AbortController | null>(null)
  const latest = useRef({ value, onChange })
  // A name the contributor typed is never overwritten by the automatic lookup.
  const nameSource = useRef<'user' | 'auto'>(value?.waterBody ? 'user' : 'auto')
  const [lookupState, setLookupState] = useState<LookupState>('idle')
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<WaterMatch[] | null>(null)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [locating, setLocating] = useState(false)
  useEffect(() => { latest.current = { value, onChange } }, [value, onChange])

  const place = (latitude: number, longitude: number, knownName?: string) => {
    const { value: current, onChange: emit } = latest.current
    if (knownName) nameSource.current = 'auto'
    const name = knownName ?? (nameSource.current === 'user' ? current?.waterBody ?? '' : '')
    emit({ latitude, longitude, waterBody: name })
    if (knownName) { setLookupState('water'); return }
    lookup.current?.abort()
    const controller = new AbortController()
    lookup.current = controller
    setLookupState('looking')
    waterBodyAt(latitude, longitude, controller.signal)
      .then(name => {
        if (controller.signal.aborted) return
        setLookupState(name ? 'water' : 'land')
        if (name && nameSource.current === 'auto') latest.current.onChange({ latitude, longitude, waterBody: name })
      })
      .catch(() => { if (!controller.signal.aborted) setLookupState('offline') })
  }

  useEffect(() => {
    if (!container.current) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const start = latest.current.value ?? hint
    const instance = L.map(container.current, {
      center: start ? [start.latitude, start.longitude] : [39, -98],
      zoom: start ? 12 : 4, minZoom: 3, maxZoom: 19,
      zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced,
      scrollWheelZoom: false,
    })
    map.current = instance
    L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(instance)
    instance.on('click', event => place(event.latlng.lat, event.latlng.lng))
    // Scroll-wheel zoom only once the map has focus, so the page still scrolls.
    instance.on('focus', () => instance.scrollWheelZoom.enable())
    instance.on('blur', () => instance.scrollWheelZoom.disable())
    const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }))
    resize.observe(container.current)
    return () => { resize.disconnect(); lookup.current?.abort(); instance.remove(); map.current = null; marker.current = null }
    // The map is created once; `hint` only seeds its first view.
  }, [])

  // Keep the pin in sync with the value (placed, dragged, searched or cleared).
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    if (!value) { marker.current?.remove(); marker.current = null; return }
    const at = L.latLng(value.latitude, value.longitude)
    if (!marker.current) {
      marker.current = L.marker(at, {
        icon: rippleIcon('below', { size: 52, selected: true }), draggable: true, keyboard: true,
        title: 'Collection point. Drag to adjust.', alt: 'Collection point',
      }).addTo(instance)
      marker.current.on('dragend', () => {
        const next = marker.current?.getLatLng()
        if (next) place(next.lat, next.lng)
      })
    } else if (!marker.current.getLatLng().equals(at)) {
      marker.current.setLatLng(at)
    }
  }, [value?.latitude, value?.longitude])

  // Before a point exists, follow the selected utility so the right water is in view.
  useEffect(() => {
    if (!hint || latest.current.value || !map.current) return
    map.current.setView([hint.latitude, hint.longitude], 12, { animate: false })
  }, [hint?.latitude, hint?.longitude])

  const fly = (latitude: number, longitude: number) => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) map.current?.setView([latitude, longitude], 14, { animate: false })
    else map.current?.flyTo([latitude, longitude], 14, { duration: 1.2 })
  }

  const runSearch = async () => {
    if (query.trim().length < 2) return
    setSearching(true); setSearchError(null); setMatches(null)
    try {
      const found = await searchWaterBodies(query)
      setMatches(found)
      if (!found.length) setSearchError('No lakes, rivers or bays matched. Tap the water on the map instead.')
    } catch {
      setSearchError('Water search is unavailable right now. Tap the water on the map instead.')
    } finally {
      setSearching(false)
    }
  }

  const useMyLocation = () => {
    if (!('geolocation' in navigator)) { setSearchError('Location is not available in this browser.'); return }
    setLocating(true); setSearchError(null)
    navigator.geolocation.getCurrentPosition(
      position => {
        setLocating(false)
        const { latitude, longitude } = position.coords
        place(latitude, longitude)
        fly(latitude, longitude)
      },
      () => { setLocating(false); setSearchError('Location permission was denied. Tap the water on the map instead.') },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 },
    )
  }

  const status = !value ? 'Tap the water where you collected the sample.'
    : lookupState === 'looking' ? 'Checking which water this is…'
    : lookupState === 'land' ? 'That spot looks like land. Drag the pin onto the water, or keep it if you sampled from shore.'
    : lookupState === 'offline' ? 'Pin placed. Type the water body name below.'
    : 'Pinned on the water. Drag the pin to fine-tune.'

  return (
    <div className="collection-picker" data-testid="collection-picker">
      <div className="collection-picker-tools">
        <div className="collection-picker-search">
          <Search className="h-4 w-4" aria-hidden="true" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); void runSearch() } }}
            placeholder="Find a lake, river or bay"
            aria-label="Find a lake, river or bay"
            maxLength={120}
          />
          <button type="button" onClick={() => void runSearch()} disabled={searching || query.trim().length < 2}>
            {searching ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : 'Search'}
          </button>
        </div>
        <button type="button" className="collection-picker-locate" onClick={useMyLocation} disabled={locating}>
          {locating ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Crosshair className="h-4 w-4" aria-hidden="true" />}
          Use my location
        </button>
      </div>
      {matches && matches.length > 0 && (
        <ul className="collection-picker-matches" aria-label="Matching water bodies">
          {matches.map(match => (
            <li key={`${match.latitude},${match.longitude}`}>
              <button type="button" onClick={() => {
                place(match.latitude, match.longitude, match.name)
                fly(match.latitude, match.longitude)
                setMatches(null)
              }}>
                <strong>{match.name}</strong>
                {match.detail && <span>{match.detail}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {searchError && <p className="collection-picker-note" role="status">{searchError}</p>}
      <div className="collection-picker-map water-map-night water-map-animate">
        <div ref={container} className="collection-picker-canvas" data-lenis-prevent tabIndex={0} role="application" aria-label="Map. Click or tap the water where the sample was collected." />
        {!value && <div className="collection-picker-hint" aria-hidden="true"><span />Tap the water</div>}
      </div>
      {value && (
        <label className="collection-picker-name">
          <span>Water body name</span>
          <input
            value={value.waterBody}
            onChange={event => {
              nameSource.current = event.target.value ? 'user' : 'auto'
              onChange({ ...value, waterBody: event.target.value })
            }}
            placeholder="e.g. Lake Michigan, Chicago River"
            maxLength={120}
            data-testid="collection-water-body"
          />
        </label>
      )}
      <div className="collection-picker-readout" aria-live="polite">
        <span>{status}</span>
        {value && (
          <>
            <code>{value.latitude.toFixed(5)}, {value.longitude.toFixed(5)}</code>
            <button type="button" onClick={() => { lookup.current?.abort(); setLookupState('idle'); nameSource.current = 'auto'; onChange(null) }} aria-label="Remove collection point">
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Clear
            </button>
          </>
        )}
      </div>
    </div>
  )
}
