'use client'

import { useEffect, useState, type CSSProperties } from 'react'
import { api, type WaterReading } from '@/lib/api'
import { READING_STATUS } from '@/lib/reading-status'
import type { Section } from '@/components/site/site-header'
import './water-ticker.css'

/** Hands a reading to the map section, which flies to it on arrival. */
export function showReadingOnMap(id: string, onNavigate?: (s: Section) => void) {
  try { sessionStorage.setItem('pendingWaterReading', id) } catch { /* storage blocked: map still opens */ }
  onNavigate?.('map')
}

// A slow current of the latest readings, each named by the water it came from.
export function WaterTicker({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [readings, setReadings] = useState<WaterReading[] | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    api.getWaterReadings(controller.signal)
      .then(result => setReadings(Array.isArray(result.items) ? result.items.slice(0, 16) : []))
      .catch(() => setReadings([]))
    return () => controller.abort()
  }, [])

  if (!readings?.length) return null
  // Two copies make the loop seamless; the second is hidden from assistive tech.
  const loop = [...readings, ...readings]
  const seconds = Math.max(28, readings.length * 6)

  return (
    <section className="water-ticker" aria-label="Recent readings on the water" data-reveal="fade" data-loop>
      <div className="water-ticker-label">
        <span className="water-ticker-live" aria-hidden="true" />
        On the water
      </div>
      <div className="water-ticker-viewport">
        <ul className="water-ticker-track" style={{ '--ticker-duration': `${seconds}s` } as CSSProperties}>
          {loop.map((reading, index) => {
            const copy = index >= readings.length
            return (
              <li key={`${reading.id}-${index}`} aria-hidden={copy || undefined}>
                <button
                  type="button"
                  tabIndex={copy ? -1 : undefined}
                  onClick={() => showReadingOnMap(reading.id, onNavigate)}
                  style={{ '--pin': READING_STATUS[reading.status].color } as CSSProperties}
                  data-cursor="Map"
                >
                  <span className="water-ticker-dot" aria-hidden="true" />
                  <strong>{reading.waterBody || reading.location || 'Unnamed water'}</strong>
                  <span>{reading.level} {reading.unit}</span>
                  <em>{reading.contaminant.name} · {reading.reviewLabel}</em>
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
