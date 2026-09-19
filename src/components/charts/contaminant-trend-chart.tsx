'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'
import { areUnitsCompatible, isEligibleForScoring, normalizeToBenchmarkUnit } from '@/lib/provenance'
import type { ContaminantSummary } from '@/lib/types'

type TrendPoint = ContaminantSummary['trend'][number]

export function buildTrendRows(data: TrendPoint[], unit: string, reviewed: boolean) {
  const rows = new Map<string, { date: string; Treated: number | null; Untreated: number | null }>()
  let excluded = 0
  for (const point of data) {
    const date = new Date(point.date)
    if (!Number.isFinite(date.getTime())) { excluded++; continue }
    const key = date.toISOString()
    const row = rows.get(key) ?? { date: key, Treated: null, Untreated: null }
    rows.set(key, row)
    if (typeof point.level !== 'number' || !Number.isFinite(point.level) || point.level < 0 ||
      !point.unit || !areUnitsCompatible(point.unit, unit) || (reviewed && !isEligibleForScoring(point)) ||
      (point.treatmentStatus !== 'Treated' && point.treatmentStatus !== 'Untreated')) { excluded++; continue }
    const level = normalizeToBenchmarkUnit(point.level, point.unit, unit)
    if (level == null) { excluded++; continue }
    row[point.treatmentStatus] = level
  }
  return { rows: [...rows.values()].sort((a, b) => a.date.localeCompare(b.date)), excluded }
}

// Small inline trend chart for a single contaminant at a single utility.
// Optionally shows health guideline and legal limit reference lines.
export function ContaminantTrendChart({
  data,
  unit,
  healthGuideline,
  legalLimit,
  reviewed = false,
}: {
  data: TrendPoint[]
  unit: string
  healthGuideline?: number
  legalLimit?: number
  reviewed?: boolean
}) {
  const { rows: chartData, excluded } = buildTrendRows(data, unit, reviewed)
  const hasUntreated = chartData.some(point => point.Untreated != null)
  if (!chartData.some(point => point.Treated != null || point.Untreated != null)) return <p className="text-xs text-muted-foreground">No trend can be compared in the recorded unit. Original observations remain unassessed.</p>

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {reviewed ? 'Reviewed observations over time' : 'Unreviewed observations · not a safety trend'}
        </span>
      </div>
      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 9, fill: 'oklch(0.5 0.02 200)' }}
              stroke="oklch(0.85 0.01 200)"
              tickFormatter={(d) => {
                const dt = new Date(d)
                return `${dt.getMonth() + 1}/${dt.getFullYear().toString().slice(2)}`
              }}
            />
            <YAxis
              tick={{ fontSize: 9, fill: 'oklch(0.5 0.02 200)' }}
              stroke="oklch(0.85 0.01 200)"
              width={36}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 8,
                border: '1px solid oklch(0.9 0.01 200)',
                fontSize: 11,
                background: 'oklch(1 0 0)',
              }}
              formatter={(value: number, name) => [`${value} ${unit}`, name]}
              labelFormatter={(d) => `Sampled ${d}`}
            />
            {reviewed && healthGuideline != null && Number.isFinite(healthGuideline) && healthGuideline > 0 && (
              <ReferenceLine
                y={healthGuideline}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'Health', fontSize: 8, fill: '#f59e0b', position: 'right' }}
              />
            )}
            {reviewed && legalLimit != null && Number.isFinite(legalLimit) && legalLimit > 0 && (
              <ReferenceLine
                y={legalLimit}
                stroke="#e11d48"
                strokeDasharray="4 4"
                label={{ value: 'Legal', fontSize: 8, fill: '#e11d48', position: 'right' }}
              />
            )}
            <Line
              type="linear"
              dataKey="Treated"
              stroke="#708d9b"
              strokeWidth={2}
              dot={{ r: 3, fill: '#708d9b' }}
              connectNulls={false}
            />
            {hasUntreated && (
              <Line
                type="linear"
                dataKey="Untreated"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#94a3b8' }}
                connectNulls={false}
              />
            )}
            <Legend
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              iconType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      {excluded > 0 && <p className="mt-2 text-xs text-muted-foreground">{excluded} observations omitted from the plotted comparison because their value, unit or review status could not be used.</p>}
    </div>
  )
}
