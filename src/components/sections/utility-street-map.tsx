'use client'

import { useEffect, useRef, useState } from 'react'
import * as L from 'leaflet'
import type { Stats } from '@/lib/types'
import { assessmentKind } from '@/lib/sample-read-model'
import { utilityMapTier } from '@/lib/map-presentation'
import 'leaflet/dist/leaflet.css'
import './utility-street-map.css'

type Location = Pick<Stats['mapUtilities'][number], 'id' | 'name' | 'city' | 'state' | 'latitude' | 'longitude' | 'assessment'>
type Center = { lat: number; lng: number; name?: string }

export default function UtilityStreetMap({ utilities, center, radiusMiles, loadingId, onSelect }: {
  utilities: Location[]; center: Center | null; radiusMiles: number; loadingId: string | null; onSelect: (id: string) => void
}) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<L.Map | null>(null)
  const tiles = useRef<L.TileLayer | null>(null)
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
    const layer = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(instance)
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
    if (!instance) return
    const markers = L.layerGroup().addTo(instance)
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
        element.setAttribute('aria-busy', String(loadingId === utility.id))
        element.addEventListener('keydown', event => {
          if (event.key === ' ') { event.preventDefault(); select.current(utility.id) }
        })
      }
    }
    return () => { markers.remove() }
  }, [utilities, loadingId])

  useEffect(() => {
    if (!center || !map.current) return
    // City quick-picks open the street map directly; the radius remains a real
    // distance on the ground, independent of map zoom.
    map.current.setView([center.lat, center.lng], 13, { animate: false })
  }, [center])

  useEffect(() => {
    if (!center || !map.current) return
    const circle = L.circle([center.lat, center.lng], {
      radius: radiusMiles * 1609.344, color: '#087f75', weight: 1, fillOpacity: .05, interactive: false,
    }).addTo(map.current)
    return () => { circle.remove() }
  }, [center, radiusMiles])

  return <div className="utility-street-map">
    <div ref={container} className="utility-street-canvas" data-testid="street-map" data-lenis-prevent tabIndex={0} role="region" aria-label="Interactive street map of water utilities. Use arrow keys to pan and plus or minus to zoom." />
    <button className="utility-map-reset" type="button" onClick={() => map.current?.setView([39, -98], 4, { animate: false })}>US overview</button>
    {tileError && <div className="utility-map-error" role="alert">
      Street map unavailable. Utility records are still accessible.
      <button type="button" onClick={() => { setTileError(false); tiles.current?.redraw() }}>Retry map</button>
      <details><summary>View utility records</summary>{utilities.map(utility => <button key={utility.id} type="button" onClick={() => onSelect(utility.id)}>{utility.name}</button>)}</details>
    </div>}
  </div>
}
