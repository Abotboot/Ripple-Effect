'use client'

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import type { Stats } from '@/lib/types'
import type { WaterReading } from '@/lib/api'
import { assessmentKind } from '@/lib/sample-read-model'
import { utilityMapTier } from '@/lib/map-presentation'
import { OSM_ATTRIBUTION, OSM_TILES, READING_STATUS, rippleIcon } from '@/lib/leaflet-water'
import 'leaflet/dist/leaflet.css'
import './utility-street-map.css'
import './water-map.css'

type Location = Pick<Stats['mapUtilities'][number], 'id' | 'name' | 'city' | 'state' | 'latitude' | 'longitude' | 'assessment'>
type Center = { lat: number; lng: number; name?: string }

// Rings animate only while the count stays cheap to composite on phones.
const ANIMATED_PIN_LIMIT = 160

function readingPopup(reading: WaterReading, onUtility: (id: string) => void): HTMLElement {
  const root = document.createElement('div')
  root.style.setProperty('--pin', READING_STATUS[reading.status].color)
  const kicker = document.createElement('div')
  kicker.className = 'water-popup-kicker'
  kicker.textContent = `${reading.contaminant.name} · ${reading.reviewLabel}`
  const title = document.createElement('div')
  title.className = 'water-popup-title'
  title.textContent = reading.waterBody || reading.location || 'Unnamed water'
  const level = document.createElement('div')
  level.className = 'water-popup-level'
  const value = document.createElement('strong')
  value.textContent = String(reading.level)
  const unit = document.createElement('span')
  unit.textContent = reading.unit
  level.append(value, unit)
  const meta = document.createElement('div')
  meta.className = 'water-popup-meta'
  const date = new Date(reading.sampleDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
  meta.textContent = [date, READING_STATUS[reading.status].label, reading.waterBody && reading.location ? reading.location : null]
    .filter(Boolean).join(' · ')
  root.append(kicker, title, level, meta)
  if (reading.utility) {
    const utility = reading.utility
    const action = document.createElement('button')
    action.type = 'button'
    action.className = 'water-popup-action'
    action.textContent = `${utility.name} records →`
    action.addEventListener('click', () => onUtility(utility.id))
    root.append(action)
  }
  return root
}

export default function UtilityStreetMap({
  utilities, readings = [], showUtilities = true, center, radiusMiles, loadingId, onSelect, focusReading,
}: {
  utilities: Location[]
  readings?: WaterReading[]
  showUtilities?: boolean
  center: Center | null
  radiusMiles: number
  loadingId: string | null
  onSelect: (id: string) => void
  focusReading?: { id: string; nonce: number } | null
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
  const readingMarkers = useRef(new Map<string, L.Marker>())
  const utilityPins = useRef(new Map<string, HTMLElement>())
  const select = useRef(onSelect)
  const [tileError, setTileError] = useState(false)
  useEffect(() => { select.current = onSelect }, [onSelect])

  useEffect(() => {
    if (!container.current) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const instance = L.map(container.current, {
      center: [39, -98], zoom: 4, minZoom: 2, maxZoom: 19,
      scrollWheelZoom: true, worldCopyJump: true,
      zoomAnimation: !reduced, fadeAnimation: !reduced, markerZoomAnimation: !reduced,
    })
    map.current = instance
    const layer = L.tileLayer(OSM_TILES, { maxZoom: 19, attribution: OSM_ATTRIBUTION }).addTo(instance)
    tiles.current = layer
    layer.on('tileerror', () => setTileError(true))
    L.control.scale({ imperial: true, metric: true }).addTo(instance)
    const update = () => {
      if (container.current) container.current.dataset.zoom = String(instance.getZoom())
    }
    instance.on('zoomend', update)
    update()
    const resize = new ResizeObserver(() => instance.invalidateSize({ pan: false }))
    resize.observe(container.current)
    return () => { resize.disconnect(); instance.remove(); map.current = null; tiles.current = null }
  }, [])

  useEffect(() => {
    const instance = map.current
    if (!instance || !showUtilities) return
    const markers = L.layerGroup().addTo(instance)
    const pins = utilityPins.current
    pins.clear()
    for (const utility of utilities) {
      const kind = assessmentKind(utility.assessment), tier = utilityMapTier(utility)
      const label = `${utility.name}: ${tier.label}`
      const icon = L.divIcon({
        className: 'utility-street-pin', iconSize: [36, 36], iconAnchor: [18, 18],
        html: `<span style="background:${tier.color}" class="utility-street-dot"></span>`,
      })
      const marker = L.marker([utility.latitude, utility.longitude], { icon, keyboard: true, title: label, alt: label }).addTo(markers)
      const tooltip = document.createElement('div')
      const heading = document.createElement('strong')
      heading.textContent = utility.name
      const detail = document.createElement('div')
      detail.textContent = `${utility.city}, ${utility.state} · ${tier.label}`
      tooltip.append(heading, detail)
      marker.bindTooltip(tooltip, { direction: 'top', offset: [0, -12] })
      marker.on('click', () => select.current(utility.id))
      const element = marker.getElement()
      if (element) {
        element.dataset.testid = 'utility-map-marker'
        element.dataset.assessment = kind
        element.setAttribute('aria-label', label)
        element.setAttribute('aria-busy', 'false')
        element.addEventListener('keydown', event => {
          if (event.key === ' ') { event.preventDefault(); select.current(utility.id) }
        })
        pins.set(utility.id, element)
      }
    }
    return () => { markers.remove(); pins.clear() }
  }, [utilities, showUtilities])

  // Loading a utility only flags its own pin; the markers are not rebuilt.
  useEffect(() => {
    if (!loadingId) return
    const pin = utilityPins.current.get(loadingId)
    pin?.setAttribute('aria-busy', 'true')
    return () => pin?.setAttribute('aria-busy', 'false')
  }, [loadingId, utilities, showUtilities])

  // Readings sit at their collection point on the water, above utility pins.
  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const group = L.layerGroup().addTo(instance)
    const registry = readingMarkers.current
    registry.clear()
    const animate = readings.length <= ANIMATED_PIN_LIMIT
    container.current?.classList.toggle('water-map-animate', animate)
    for (const reading of readings) {
      const where = reading.waterBody || reading.location || 'Unnamed water'
      const label = `${reading.contaminant.name} reading on ${where}: ${reading.level} ${reading.unit}, ${READING_STATUS[reading.status].label}`
      const marker = L.marker([reading.latitude, reading.longitude], {
        icon: rippleIcon(reading.status), keyboard: true, title: label, alt: label, zIndexOffset: 500,
        riseOnHover: true,
      }).addTo(group)
      marker.bindPopup(() => readingPopup(reading, id => select.current(id)), {
        className: 'water-reading-popup', maxWidth: 300, autoPanPadding: [24, 24],
      })
      const element = marker.getElement()
      if (element) {
        element.dataset.testid = 'water-reading-marker'
        element.dataset.status = reading.status
        element.setAttribute('aria-label', label)
      }
      registry.set(reading.id, marker)
    }
    return () => { group.remove(); registry.clear() }
  }, [readings])

  useEffect(() => {
    if (!focusReading || !map.current) return
    const marker = readingMarkers.current.get(focusReading.id)
    if (!marker) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const target = marker.getLatLng()
    const open = () => marker.openPopup()
    if (reduced) { map.current.setView(target, 13, { animate: false }); open(); return }
    map.current.once('moveend', open)
    map.current.flyTo(target, 13, { duration: 1.6, easeLinearity: 0.2 })
  }, [focusReading])

  useEffect(() => {
    if (!center || !map.current) return
    // City quick-picks open the street map directly; the radius remains a real
    // distance on the ground, independent of map zoom.
    map.current.setView([center.lat, center.lng], 13, { animate: false })
  }, [center])

  useEffect(() => {
    if (!center || !map.current) return
    const circle = L.circle([center.lat, center.lng], {
      radius: radiusMiles * 1609.344, color: '#1df2b3', weight: 1, fillOpacity: .05, interactive: false,
    }).addTo(map.current)
    return () => { circle.remove() }
  }, [center, radiusMiles])

  return <div className="utility-street-map water-map-night" data-loop>
    <div ref={container} className="utility-street-canvas" data-testid="street-map" data-lenis-prevent tabIndex={0} role="region" aria-label="Interactive street map of water utilities and readings on the water. Use arrow keys to pan and plus or minus to zoom." />
    <button className="utility-map-reset" type="button" onClick={() => map.current?.setView([39, -98], 4, { animate: false })}>US overview</button>
    {tileError && <div className="utility-map-error" role="alert">
      Street map unavailable. Utility records are still accessible.
      <button type="button" onClick={() => { setTileError(false); tiles.current?.redraw() }}>Retry map</button>
      <details><summary>View utility records</summary>{utilities.map(utility => <button key={utility.id} type="button" onClick={() => onSelect(utility.id)}>{utility.name}</button>)}</details>
    </div>}
  </div>
}
