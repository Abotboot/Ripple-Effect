'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LineChart as LineChartIcon, TrendingUp, TrendingDown, Minus,
  Droplets, FlaskConical, Loader2,
} from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'

type TrendPoint = {
  quarter: string
  label: string
  treatedAvg: number
  untreatedAvg: number
  maxLevel: number
}

const tooltipStyle = {
  borderRadius: 10,
  border: '1px solid var(--border)',
  background: 'var(--popover)',
  color: 'var(--popover-foreground)',
  fontSize: 12,
  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
}

export function MicroplasticsTrendSection() {
  const [data, setData] = useState<{
    trend: TrendPoint[]
    direction: 'up' | 'down' | 'flat'
    pctChange: number
    totalSamples: number
    dateRange: { from: string; to: string } | null
  } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    api.getMicroplasticsTrend()
      .then(setData)
      .catch(() => setError(true))
  }, [])

  const directionInfo = data ? {
    up: { icon: TrendingUp, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/50', label: 'Rising' },
    down: { icon: TrendingDown, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/50', label: 'Falling' },
    flat: { icon: Minus, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50', label: 'Stable' },
  }[data.direction] : null

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Card className="overflow-hidden border-primary/20">
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <LineChartIcon className="h-4 w-4 text-primary" />
                Microplastics trend over time
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Quarterly average microplastic levels (particles/L) in treated
                vs untreated water. Are levels changing?
              </p>
            </div>
            {directionInfo && data && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold ${directionInfo.bg} ${directionInfo.color}`}
              >
                <directionInfo.icon className="h-4 w-4" />
                {directionInfo.label}
                {data.pctChange !== 0 && (
                  <span className="ml-1 text-xs">
                    ({data.pctChange > 0 ? '+' : ''}{data.pctChange}%)
                  </span>
                )}
              </motion.div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-[320px] w-full" />
          ) : error ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              Could not load trend data.
            </div>
          ) : data.trend.length === 0 ? (
            <div className="flex h-[320px] items-center justify-center text-sm text-muted-foreground">
              No trend data available yet.
            </div>
          ) : (
            <>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.trend}
                    margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      stroke="var(--border)"
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                      stroke="var(--border)"
                      width={40}
                      label={{ value: 'particles/L', angle: -90, position: 'insideLeft', fontSize: 10, fill: 'var(--muted-foreground)' }}
                    />
                    <Tooltip
                      contentStyle={tooltipStyle}
                      formatter={(v: number, name: string) => [
                        `${v} particles/L`,
                        name === 'untreatedAvg' ? 'Untreated source' : 'After treatment',
                      ]}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                      formatter={(value) =>
                        value === 'untreatedAvg' ? 'Untreated source' : 'After treatment'
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="untreatedAvg"
                      stroke="var(--chart-5)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'var(--chart-5)' }}
                      activeDot={{ r: 5 }}
                      name="untreatedAvg"
                    />
                    <Line
                      type="monotone"
                      dataKey="treatedAvg"
                      stroke="var(--chart-1)"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: 'var(--chart-1)' }}
                      activeDot={{ r: 5 }}
                      name="treatedAvg"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Stats strip */}
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <FlaskConical className="h-3 w-3" />
                    Samples
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-foreground">{data.totalSamples}</div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Period</div>
                  <div className="mt-1 text-sm font-semibold text-foreground">
                    {data.dateRange ? `${data.dateRange.from} – ${data.dateRange.to}` : '—'}
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Droplets className="h-3 w-3" />
                    Latest treated avg
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {data.trend.length > 0 ? `${data.trend[data.trend.length - 1].treatedAvg}` : '—'} p/L
                  </div>
                </div>
                <div className="rounded-lg border border-border bg-muted/30 p-3">
                  <div className="flex items-center gap-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                    <Droplets className="h-3 w-3" />
                    Peak measured
                  </div>
                  <div className="mt-1 text-lg font-bold tabular-nums text-foreground">
                    {data.trend.length > 0 ? `${Math.max(...data.trend.map((t) => t.maxLevel))}` : '—'} p/L
                  </div>
                </div>
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                Trend data is illustrative (calibrated to WHO/Orb Media published
                ranges) until chapters begin submitting real identifier readings.
                As first-party data arrives, this chart will reflect actual
                measured trends over time.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </section>
  )
}
