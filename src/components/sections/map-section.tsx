'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Map as MapIcon, MapPin, Loader2, AlertTriangle, ShieldCheck, Building2, Users } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Stats, UtilityWithStats } from '@/lib/types'
import { UtilityDetailDialog } from '@/components/sections/utility-detail-dialog'
import { cn } from '@/lib/utils'

type MapUtility = Stats['mapUtilities'][number]

// Convert lat/long to x/y on our simplified US map (Albers-ish projection).
// US bounding box: roughly lat 24-50, long -125 to -66.
// Map viewBox: 0 0 1000 580 (approximate aspect of continental US).
const LAT_MIN = 24.5
const LAT_MAX = 49.5
const LONG_MIN = -125
const LONG_MAX = -66.5

function project(lat: number, lng: number): { x: number; y: number } {
  // Simple equirectangular with a slight horizontal curve correction
  const x = ((lng - LONG_MIN) / (LONG_MAX - LONG_MIN)) * 1000
  // Invert y (lat increases northward, screen y increases downward)
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * 580
  return { x, y }
}

export function MapSection() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<UtilityWithStats | null>(null)
  const [loadingDetail, setLoadingDetail] = useState<string | null>(null)
  const [hovered, setHovered] = useState<MapUtility | null>(null)

  useEffect(() => {
    api.getStats().then((s) => {
      setStats(s)
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const openUtility = async (u: MapUtility) => {
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

  // Sort utilities so the worst-exceeding ones render on top
  const sortedUtilities = useMemo(() => {
    if (!stats) return []
    return [...stats.mapUtilities].sort((a, b) => {
      const aScore = a.legalExceedances * 2 + a.healthExceedances
      const bScore = b.legalExceedances * 2 + b.healthExceedances
      return aScore - bScore // ascending so worst are last (rendered on top)
    })
  }, [stats])

  // Legend tiers
  const tierFor = (u: MapUtility): { label: string; color: string; ring: string } => {
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

  return (
    <div className="bg-water-hero min-h-screen">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <MapIcon className="mr-1 h-3 w-3" />
            National Map View
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Water utilities across America
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Every dot is a water utility in our database. The color shows how its
            measured contaminants compare to health guidelines and legal limits.
            Click any dot to dive into the full contaminant breakdown.
          </p>
        </div>

        {/* Legend */}
        <div className="mb-6 flex flex-wrap items-center justify-center gap-3">
          {[
            { label: 'Within guidelines', color: '#10b981' },
            { label: 'Some health exceedances', color: '#06b6d4' },
            { label: 'Many health exceedances', color: '#f59e0b' },
            { label: 'Above legal limit', color: '#e11d48' },
          ].map((l) => (
            <div key={l.label} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: l.color }} />
              {l.label}
            </div>
          ))}
        </div>

        {/* Map */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {loading ? (
              <Skeleton className="h-[400px] sm:h-[560px] w-full rounded-none" />
            ) : (
              <div className="relative">
                {/* US Map SVG */}
                <svg
                  viewBox="0 0 1000 580"
                  className="w-full h-auto"
                  style={{ background: 'linear-gradient(180deg, oklch(0.97 0.015 195) 0%, oklch(0.93 0.025 195) 100%)' }}
                  role="img"
                  aria-label="Map of US water utilities colored by contamination level"
                >
                  {/* State grid backdrop (subtle dots) */}
                  <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                      <circle cx="2" cy="2" r="0.8" fill="oklch(0.85 0.02 195)" opacity="0.4" />
                    </pattern>
                    <filter id="dotGlow" x="-50%" y="-50%" width="200%" height="200%">
                      <feGaussianBlur stdDeviation="3" result="b" />
                      <feMerge>
                        <feMergeNode in="b" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <rect width="1000" height="580" fill="url(#grid)" />

                  {/* Simplified US continental outline (approximate) */}
                  <path
                    d="M 50 200 L 90 130 L 180 95 L 280 80 L 380 75 L 480 80 L 580 85 L 680 95 L 760 110 L 830 130 L 900 155 L 940 200 L 950 250 L 930 290 L 900 310 L 870 330 L 850 370 L 830 410 L 800 450 L 760 490 L 700 510 L 640 520 L 580 510 L 520 490 L 470 460 L 430 425 L 400 395 L 370 380 L 320 395 L 280 410 L 240 395 L 200 370 L 160 335 L 120 300 L 80 260 Z"
                    fill="oklch(1 0 0 / 0.4)"
                    stroke="oklch(0.7 0.05 195)"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />

                  {/* Utility dots */}
                  {sortedUtilities.map((u, i) => {
                    const p = project(u.latitude, u.longitude)
                    const tier = tierFor(u)
                    const isHovered = hovered?.id === u.id
                    const isLoading = loadingDetail === u.id
                    const radius = Math.max(6, Math.min(14, 6 + Math.log2(u.population / 100000) * 1.5))
                    return (
                      <g
                        key={u.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => openUtility(u)}
                        onMouseEnter={() => setHovered(u)}
                        onMouseLeave={() => setHovered(null)}
                      >
                        {/* Pulse ring for utilities above legal limit */}
                        {u.legalExceedances > 0 && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={radius + 4}
                            fill="none"
                            stroke={tier.color}
                            strokeWidth="1.5"
                            opacity="0.5"
                          >
                            <animate attributeName="r" values={`${radius + 4};${radius + 10};${radius + 4}`} dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.5;0;0.5" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        {/* Outer ring */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={radius + 2}
                          fill={tier.ring}
                          opacity={isHovered ? 1 : 0.6}
                        />
                        {/* Main dot */}
                        <motion.circle
                          cx={p.x}
                          cy={p.y}
                          r={radius}
                          fill={tier.color}
                          stroke="white"
                          strokeWidth="1.5"
                          filter={isHovered ? 'url(#dotGlow)' : undefined}
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          transition={{ delay: i * 0.05, type: 'spring', stiffness: 200 }}
                          style={{ transformOrigin: `${p.x}px ${p.y}px` }}
                        />
                        {isLoading && (
                          <circle
                            cx={p.x}
                            cy={p.y}
                            r={radius + 6}
                            fill="none"
                            stroke="oklch(0.55 0.13 195)"
                            strokeWidth="2"
                            strokeDasharray="20 10"
                          >
                            <animateTransform attributeName="transform" type="rotate" from={`0 ${p.x} ${p.y}`} to={`360 ${p.x} ${p.y}`} dur="1s" repeatCount="indefinite" />
                          </circle>
                        )}
                      </g>
                    )
                  })}

                  {/* Hovered tooltip */}
                  {hovered && (
                    <g style={{ pointerEvents: 'none' }}>
                      {(() => {
                        const p = project(hovered.latitude, hovered.longitude)
                        const tooltipW = 220
                        const tooltipH = 70
                        // Flip tooltip if near right edge
                        const tx = p.x + tooltipW > 980 ? p.x - tooltipW - 12 : p.x + 12
                        const ty = p.y + tooltipH > 560 ? p.y - tooltipH - 12 : p.y + 12
                        return (
                          <>
                            <rect
                              x={tx}
                              y={ty}
                              width={tooltipW}
                              height={tooltipH}
                              rx="8"
                              fill="oklch(1 0 0 / 0.97)"
                              stroke="oklch(0.7 0.05 195)"
                              strokeWidth="1"
                              filter="drop-shadow(0 4px 6px oklch(0 0 0 / 0.1))"
                            />
                            <text x={tx + 10} y={ty + 18} fontSize="11" fontWeight="600" fill="oklch(0.2 0.03 200)">
                              {hovered.name.length > 28 ? hovered.name.slice(0, 26) + '…' : hovered.name}
                            </text>
                            <text x={tx + 10} y={ty + 34} fontSize="10" fill="oklch(0.45 0.02 200)">
                              {hovered.city}, {hovered.state} · pop. {hovered.population.toLocaleString()}
                            </text>
                            <text x={tx + 10} y={ty + 52} fontSize="10" fill={tierFor(hovered).color} fontWeight="600">
                              {hovered.healthExceedances} health · {hovered.legalExceedances} legal exceedances
                            </text>
                          </>
                        )
                      })()}
                    </g>
                  )}
                </svg>

                {/* Caption overlay */}
                <div className="absolute bottom-2 left-3 text-[10px] text-muted-foreground">
                  Click a dot to view full contaminant breakdown · Dot size ∝ population served
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick stats below map */}
        {!loading && stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              icon={Building2}
              label="Utilities mapped"
              value={stats.mapUtilities.length.toString()}
            />
            <MiniStat
              icon={Users}
              label="People represented"
              value={`${(stats.populationServed / 1_000_000).toFixed(1)}M`}
            />
            <MiniStat
              icon={AlertTriangle}
              label="Above legal limit"
              value={stats.mapUtilities.filter((u) => u.legalExceedances > 0).length.toString()}
              tone="warning"
            />
            <MiniStat
              icon={ShieldCheck}
              label="Within guidelines"
              value={stats.mapUtilities.filter((u) => u.healthExceedances === 0 && u.legalExceedances === 0).length.toString()}
              tone="ok"
            />
          </div>
        )}

        {/* Detailed utility list (alternative to map for screen readers / mobile) */}
        {!loading && stats && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <MapPin className="h-4 w-4 text-primary" />
                All utilities ({stats.mapUtilities.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {stats.mapUtilities
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
                        <div className="flex shrink-0 gap-2 text-[10px]">
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
