'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, PieChart as PieIcon, Trophy, AlertTriangle, MapPin,
  TrendingUp, Building2, Beaker, ShieldCheck, FlaskConical, Award,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

type Dashboard = {
  scoreDistribution: { a: number; b: number; c: number; d: number; f: number }
  topExceedances: Array<{ name: string; slug: string; category: string; healthCount: number; legalCount: number }>
  stateRankings: Array<{ state: string; avgScore: number; utilityCount: number }>
  qualityBreakdown: { verified: number; provisional: number; citizen: number }
  categoryBreakdown: Array<{ category: string; count: number }>
  totalUtilities: number
  totalSamples: number
  totalContaminants: number
  trackedByUs: number
  bestUtility: { id: string; name: string; city: string; state: string; score: number; grade: string; label: string } | null
  worstUtility: { id: string; name: string; city: string; state: string; score: number; grade: string; label: string } | null
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
}

const SCORE_COLORS: Record<string, string> = {
  'A (90+)': 'var(--chart-3)',
  'B (80-89)': 'var(--chart-1)',
  'C (70-79)': 'var(--chart-4)',
  'D (60-69)': 'var(--chart-2)',
  'F (<60)': 'var(--chart-5)',
}

const QUALITY_COLORS: Record<string, string> = {
  Verified: 'var(--chart-3)',
  Provisional: 'var(--chart-4)',
  Citizen: 'var(--chart-2)',
}

const CATEGORY_COLORS: Record<string, string> = {
  Microplastic: 'var(--chart-4)',
  PFAS: 'var(--chart-5)',
  Metal: 'var(--chart-1)',
  'Disinfection Byproduct': 'var(--chart-2)',
  Pesticide: 'var(--chart-3)',
  Agricultural: 'var(--chart-3)',
  Radioactive: 'var(--chart-5)',
  Disinfectant: 'var(--chart-1)',
}

export function DashboardSection() {
  const [data, setData] = useState<Dashboard | null>(null)

  useEffect(() => {
    api.getDashboard().then(setData).catch(() => setData(null))
  }, [])

  const scoreData = data ? [
    { name: 'A (90+)', value: data.scoreDistribution.a },
    { name: 'B (80-89)', value: data.scoreDistribution.b },
    { name: 'C (70-79)', value: data.scoreDistribution.c },
    { name: 'D (60-69)', value: data.scoreDistribution.d },
    { name: 'F (<60)', value: data.scoreDistribution.f },
  ] : []

  const qualityData = data ? [
    { name: 'Verified', value: data.qualityBreakdown.verified },
    { name: 'Provisional', value: data.qualityBreakdown.provisional },
    { name: 'Citizen', value: data.qualityBreakdown.citizen },
  ].filter((d) => d.value > 0) : []

  return (
    <div className="bg-water-hero">
      {/* Hero */}
      <section className="relative overflow-hidden bg-water-surface text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 right-[5%] h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-[20%] h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/30 bg-white/15 text-white hover:bg-white/15">
              <BarChart3 className="mr-1 h-3 w-3" />
              National dashboard
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              The state of US tap water
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Aggregated water quality statistics across every utility in our
              database. Safety score distribution, top exceedance contaminants,
              state rankings, and data quality breakdown.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {!data ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        ) : (
          <>
            {/* Top stats */}
            <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <StatCard icon={Building2} label="Utilities" value={data.totalUtilities} color="text-primary" />
              <StatCard icon={Beaker} label="Samples" value={data.totalSamples} color="text-sky-600 dark:text-sky-400" />
              <StatCard icon={FlaskConical} label="Contaminants" value={data.totalContaminants} color="text-amber-600 dark:text-amber-400" />
              <StatCard icon={ShieldCheck} label="Tracked by us" value={data.trackedByUs} color="text-emerald-600 dark:text-emerald-400" />
            </div>

            {/* Best + worst utility */}
            <div className="mb-8 grid gap-4 sm:grid-cols-2">
              {data.bestUtility && (
                <Card className="overflow-hidden border-emerald-300/60 dark:border-emerald-700/40">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Best utility</h3>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground">{data.bestUtility.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {data.bestUtility.city}, {data.bestUtility.state}
                        </p>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/50">
                        <span className="text-xl font-extrabold tabular-nums text-emerald-600 dark:text-emerald-400">{data.bestUtility.score}</span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400">Grade {data.bestUtility.grade}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              {data.worstUtility && (
                <Card className="overflow-hidden border-rose-300/60 dark:border-rose-700/40">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Needs attention</h3>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-base font-bold text-foreground">{data.worstUtility.name}</p>
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {data.worstUtility.city}, {data.worstUtility.state}
                        </p>
                      </div>
                      <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/50">
                        <span className="text-xl font-extrabold tabular-nums text-rose-600 dark:text-rose-400">{data.worstUtility.score}</span>
                        <span className="text-[9px] font-bold text-rose-600 dark:text-rose-400">Grade {data.worstUtility.grade}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Charts grid */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Safety score distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Safety score distribution
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    How utilities score on the 0-100 water safety index.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
                        <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--border)" width={32} />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={48}>
                          {scoreData.map((d, i) => (
                            <Cell key={i} fill={SCORE_COLORS[d.name] ?? 'var(--chart-1)'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Data quality breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <PieIcon className="h-4 w-4 text-primary" />
                    Data quality breakdown
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    All samples by verification level.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={qualityData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          innerRadius={45}
                          paddingAngle={2}
                        >
                          {qualityData.map((d, i) => (
                            <Cell key={i} fill={QUALITY_COLORS[d.name] ?? 'var(--chart-1)'} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Top exceedance contaminants */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Top exceedance contaminants
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Contaminants most frequently exceeding health/legal limits.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="h-[260px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.topExceedances.map((e) => ({
                          name: e.name.length > 18 ? e.name.slice(0, 16) + '…' : e.name,
                          health: e.healthCount,
                          legal: e.legalCount,
                        }))}
                        layout="vertical"
                        margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                        <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
                        <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="health" name="Health exceedances" stackId="a" fill="var(--chart-4)" radius={[0, 0, 0, 0]} />
                        <Bar dataKey="legal" name="Legal exceedances" stackId="a" fill="var(--chart-5)" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* State rankings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-primary" />
                    State rankings
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Average safety score by state.
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="max-h-[260px] overflow-y-auto scroll-area space-y-1.5">
                    {data.stateRankings.map((s, i) => (
                      <div key={s.state} className="flex items-center gap-2 rounded-lg border border-border/40 p-2">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                          {i + 1}
                        </span>
                        <span className="flex-1 font-medium text-foreground">{s.state}</span>
                        <span className="text-xs text-muted-foreground">{s.utilityCount} utils</span>
                        <div className="flex items-center gap-1.5">
                          <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                            <div
                              className={`h-full ${s.avgScore >= 80 ? 'bg-emerald-500' : s.avgScore >= 70 ? 'bg-sky-500' : s.avgScore >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
                              style={{ width: `${s.avgScore}%` }}
                            />
                          </div>
                          <span className="w-8 text-right text-sm font-bold tabular-nums text-foreground">{s.avgScore}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Category breakdown */}
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <FlaskConical className="h-4 w-4 text-primary" />
                  Samples by contaminant category
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.categoryBreakdown} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                      <XAxis dataKey="category" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} stroke="var(--border)" angle={-20} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} stroke="var(--border)" width={32} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[6, 6, 0, 0]} barSize={40}>
                        {data.categoryBreakdown.map((d, i) => (
                          <Cell key={i} fill={CATEGORY_COLORS[d.category] ?? 'var(--chart-1)'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Card>
        <CardContent className="p-5">
          <div className={`mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-muted/40 ${color}`}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="text-2xl font-bold tabular-nums text-foreground">{value.toLocaleString()}</div>
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
        </CardContent>
      </Card>
    </motion.div>
  )
}
