'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, FlaskConical, AlertTriangle, Droplets, Microscope,
  TrendingDown, ArrowRight, Heart, Info, ExternalLink, BookOpen,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Section } from '@/components/site/site-header'
import { MicroplasticsTrendSection } from '@/components/sections/microplastics-trend-section'

type ContaminantDetail = {
  contaminant: {
    id: string
    slug: string
    name: string
    description: string | null
    healthEffects: string | null
    sources: string | null
    healthGuideline: number | null
    legalLimit: number | null
  }
  utilityStats: Array<{
    utilityId: string
    utilityName: string
    city: string
    state: string
    pwsid: string
    latestLevel: number
    avgLevel: number
    maxLevel: number
    sampleCount: number
    unit: string
  }>
  totals: {
    samples: number
    utilities: number
    avgTreated: number
    avgUntreated: number
    maxLevel: number
  }
}

// Theme-aware chart colors (use CSS variables so they adapt to dark mode).
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

export function MicroplasticsSection({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [data, setData] = useState<ContaminantDetail | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listContaminants().then(async (contaminants) => {
      const mp = contaminants.find((c) => c.slug === 'microplastics')
      if (!mp) {
        setLoading(false)
        return
      }
      const res = await fetch(`/api/contaminants/${mp.id}`)
      const json = await res.json()
      setData(json)
      setLoading(false)
    })
  }, [])

  const treatmentComparison = data
    ? [
        { name: 'Untreated source', value: +data.totals.avgUntreated.toFixed(2), color: 'var(--chart-5)' },
        { name: 'After treatment', value: +data.totals.avgTreated.toFixed(2), color: 'var(--chart-1)' },
      ]
    : []

  const reductionPct =
    data && data.totals.avgUntreated > 0
      ? Math.max(
          0,
          Math.round(
            ((data.totals.avgUntreated - data.totals.avgTreated) /
              data.totals.avgUntreated) *
              100
          )
        )
      : 0

  return (
    <div>
      {/* Mission hero */}
      <section className="relative overflow-hidden bg-water-surface text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 right-[5%] h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-[20%] h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/30 bg-white/15 text-white hover:bg-white/15">
              <Microscope className="mr-1 h-3 w-3" />
              2026 Water Project · Featured Initiative
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              The Microplastics Database Project
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Microplastics data is unavailable in most of the world — including
              much of the US. We&apos;re building a low-cost identifier and a
              public database to map microplastics in our city&apos;s water, and
              eventually the world.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
              <Badge className="bg-white/20 text-white hover:bg-white/20">
                Currently unregulated by EPA
              </Badge>
              <Badge className="bg-white/20 text-white hover:bg-white/20">
                No federal legal limit
              </Badge>
              <Badge className="bg-white/20 text-white hover:bg-white/20">
                Emerging health concern
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Distinction banner: we track it, almost no one else does */}
      <section className="border-b border-amber-300/50 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Almost no public drinking-water database tracks microplastics. We do.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The EWG Tap Water Database, EPA SDWIS, and nearly every state
                water portal omit microplastics entirely &mdash; there is no federal
                limit and no routine monitoring requirement. A Ripples Effect
                tracks it anyway, because what you can&apos;t see can still hurt you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="border-b border-border/60 bg-card/50">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border/60 sm:grid-cols-4">
          <Stat
            icon={FlaskConical}
            label="Utilities tested"
            value={data ? data.totals.utilities.toString() : '—'}
          />
          <Stat
            icon={Droplets}
            label="Total samples"
            value={data ? data.totals.samples.toString() : '—'}
          />
          <Stat
            icon={TrendingDown}
            label="Treatment reduces by"
            value={reductionPct ? `${reductionPct}%` : '—'}
            tone="ok"
          />
          <Stat
            icon={AlertTriangle}
            label="Peak measured"
            value={data ? `${data.totals.maxLevel.toFixed(1)} p/L` : '—'}
            tone="warning"
          />
        </div>
      </section>

      {/* Treated vs untreated comparison */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Data provenance callout */}
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
          <div className="text-muted-foreground">
            <span className="font-medium text-foreground">About this data: </span>
            Sample ranges are calibrated to published research &mdash; the WHO 2019
            report <em>&ldquo;Microplastics in drinking-water&rdquo;</em> and the Orb Media 2017
            tap-water survey of 14 countries. Specific city measurements shown
            here are illustrative simulations within those published ranges, not
            lab-verified results. We replace them with real readings as chapters
            collect data.{' '}
            <button
              onClick={() => onNavigate?.('sources')}
              className="font-medium text-primary hover:underline"
            >
              See all data sources &rarr;
            </button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Droplets className="h-4 w-4 text-primary" />
                Treatment effectiveness
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Average microplastic particles per liter (p/L) before and after
                treatment — comparing source water intake vs finished tap water.
              </p>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <div className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={treatmentComparison} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 12, fill: AXIS_TICK }}
                        stroke={AXIS_LINE}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: AXIS_TICK }}
                        stroke={AXIS_LINE}
                        width={40}
                        label={{ value: 'particles/L', angle: -90, position: 'insideLeft', fontSize: 10, fill: AXIS_TICK }}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [`${v} particles/L`, 'Avg level']}
                      />
                      <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={80}>
                        {treatmentComparison.map((d, i) => (
                          <Cell key={i} fill={d.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              {reductionPct > 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  On average, treatment removes <strong className="text-emerald-600 dark:text-emerald-400">{reductionPct}%</strong> of
                  microplastics — but a significant fraction still reaches the tap.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-primary" />
                Microplastics by city
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Latest measured microplastic levels across all utilities in our database.
              </p>
            </CardHeader>
            <CardContent>
              {loading || !data ? (
                <Skeleton className="h-[260px] w-full" />
              ) : (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.utilityStats
                        .slice()
                        .sort((a, b) => b.latestLevel - a.latestLevel)
                        .map((u) => ({
                          city: `${u.city}, ${u.state}`,
                          level: +u.latestLevel.toFixed(2),
                        }))}
                      layout="vertical"
                      margin={{ top: 4, right: 20, bottom: 4, left: 8 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke={GRID_LINE} horizontal={false} />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 11, fill: AXIS_TICK }}
                        stroke={AXIS_LINE}
                      />
                      <YAxis
                        type="category"
                        dataKey="city"
                        width={120}
                        tick={{ fontSize: 11, fill: AXIS_TICK }}
                        stroke={AXIS_LINE}
                      />
                      <Tooltip
                        cursor={{ fill: 'var(--muted)' }}
                        contentStyle={tooltipStyle}
                        formatter={(v: number) => [`${v} particles/L`, 'Latest level']}
                      />
                      <Bar dataKey="level" radius={[0, 4, 4, 0]} barSize={16} fill="var(--chart-1)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="mt-2 text-xs text-muted-foreground">
                Units: particles per liter (p/L). No EPA legal limit exists; the
                WHO advises more research but has not set a health guideline.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Trend over time */}
      <MicroplasticsTrendSection />

      {/* What are microplastics / why it matters */}
      <section className="bg-water-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <InfoCard
              icon={Microscope}
              title="What are microplastics?"
              body={data?.contaminant.description ?? 'Tiny plastic particles less than 5mm in size. Found in drinking water worldwide and currently unregulated in the US.'}
            />
            <InfoCard
              icon={AlertTriangle}
              title="Health effects"
              body={data?.contaminant.healthEffects ?? 'Emerging research links microplastic ingestion to inflammation, endocrine disruption, and cellular damage. Particle size determines whether they cross gut and lung barriers.'}
              tone="warning"
            />
            <InfoCard
              icon={Droplets}
              title="Where they come from"
              body={data?.contaminant.sources ?? 'Plastic packaging, synthetic textiles, tire wear, breakdown of larger plastic debris, and water treatment processes that cannot filter sub-micron particles.'}
            />
          </div>

          {/* The plan + Start a Chapter */}
          <Card className="mt-8 overflow-hidden border-primary/30">
            <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary">
                  The project plan
                </Badge>
                <h3 className="text-2xl font-bold tracking-tight">
                  A low-cost identifier and a public database
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  Our crew is designing a low-cost microplastics identifier that
                  can be used to see microplastics in a quantifiable way. The
                  data flows into this open database — for everyone to see.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Two uses we&apos;re planning for:
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Tap water</strong> — measure microplastics in everyone&apos;s drinking water</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Water streams</strong> — measure industrial runoff and pre-treatment microplastics</span>
                  </li>
                </ul>
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Companion mobile app in the works &mdash; chapters will be able
                    to read microplastics counts off the identifier and push
                    readings straight into this database from the field.
                  </span>
                </div>
              </div>
              <div className="rounded-xl bg-water-surface p-6 text-primary-foreground">
                <h4 className="text-sm font-semibold uppercase tracking-wide text-white/80">
                  Get involved
                </h4>
                <p className="mt-2 text-lg font-semibold">
                  Start a chapter in your city
                </p>
                <p className="mt-2 text-sm text-white/85">
                  Take our microplastics identifier, dip it into your own local
                  water streams and tap, and push the data here. We&apos;ll send
                  you the kit and the protocol. No coding required.
                </p>
                <Button
                  variant="secondary"
                  className="mt-4 bg-white text-primary hover:bg-white/90"
                  onClick={() => onNavigate?.('chapter')}
                >
                  <Heart className="h-4 w-4" />
                  Start a chapter
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <a
                  href="https://github.com/Abotboot/Ripple-Effect"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-white/80 hover:text-white hover:underline"
                >
                  <ExternalLink className="h-3 w-3" />
                  View the open-source repo
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}

function Stat({
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
      ? 'text-emerald-600 dark:text-emerald-400'
      : tone === 'warning'
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-foreground'
  const iconCls =
    tone === 'ok'
      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
      : tone === 'warning'
      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
      : 'bg-primary/10 text-primary'
  return (
    <div className="px-4 py-5 sm:px-6 sm:py-6">
      <div className={`mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md ${iconCls}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`text-2xl font-bold tabular-nums sm:text-3xl ${valueCls}`}>{value}</div>
      <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

function InfoCard({
  icon: Icon,
  title,
  body,
  tone = 'default',
}: {
  icon: React.ElementType
  title: string
  body: string
  tone?: 'default' | 'warning'
}) {
  const iconCls =
    tone === 'warning'
      ? 'bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
      : 'bg-primary/10 text-primary'
  return (
    <Card>
      <CardContent className="p-5">
        <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${iconCls}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
