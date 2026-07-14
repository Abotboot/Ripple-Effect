'use client'

import { useEffect, useState } from 'react'
import { Droplets, AlertTriangle, FlaskConical, Users, MapPin } from 'lucide-react'
import { api } from '@/lib/api'
import type { Stats } from '@/lib/types'

// Animated marquee bar showing live stats. Sits right under the hero.
export function LiveTicker() {
  const [stats, setStats] = useState<Stats | null>(null)

  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
  }, [])

  if (!stats) return null

  const items = [
    { icon: Droplets, text: `${stats.utilitiesCount} utilities tracked across ${stats.statesCovered} states` },
    { icon: FlaskConical, text: `${stats.contaminantsCount} contaminants catalogued including microplastics` },
    { icon: Users, text: `${(stats.populationServed / 1_000_000).toFixed(1)}M people served by tracked utilities` },
    { icon: AlertTriangle, text: `${stats.healthExceedances} measurements above EWG health guidelines` },
    { icon: Droplets, text: `Microplastics avg: ${stats.microplasticsAvg} particles/L in treated tap water` },
    { icon: MapPin, text: `${stats.reportsCount} community reports filed` },
    { icon: AlertTriangle, text: `${stats.legalExceedances} measurements above EPA legal limits` },
  ]

  // Duplicate the items so the marquee can loop seamlessly
  const doubled = [...items, ...items]

  return (
    <div className="relative overflow-hidden border-y border-primary/20 bg-primary text-primary-foreground">
      {/* Fade edges */}
      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-primary to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-primary to-transparent" />

      <div className="flex w-max animate-marquee items-center gap-8 py-2.5">
        {doubled.map((item, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2 text-xs font-medium text-primary-foreground/95">
            <item.icon className="h-3.5 w-3.5 text-white/70" />
            <span>{item.text}</span>
            <span className="ml-3 text-white/30">•</span>
          </div>
        ))}
      </div>
    </div>
  )
}
