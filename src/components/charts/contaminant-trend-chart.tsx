'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Legend,
} from 'recharts'

type TrendPoint = { date: string; level: number; treatmentStatus: string }

// Small inline trend chart for a single contaminant at a single utility.
// Optionally shows health guideline and legal limit reference lines.
export function ContaminantTrendChart({
  data,
  unit,
  healthGuideline,
  legalLimit,
}: {
  data: TrendPoint[]
  unit: string
  healthGuideline?: number
  legalLimit?: number
}) {
  // Format samples into chart points; split by treatment status
  const treated = data.filter((d) => d.treatmentStatus === 'Treated')
  const untreated = data.filter((d) => d.treatmentStatus === 'Untreated')

  // Merge on date for the chart
  const allDates = Array.from(
    new Set(data.map((d) => new Date(d.date).toISOString().slice(0, 10)))
  ).sort()

  const chartData = allDates.map((date) => {
    const t = treated.find((d) => new Date(d.date).toISOString().slice(0, 10) === date)
    const u = untreated.find((d) => new Date(d.date).toISOString().slice(0, 10) === date)
    return {
      date,
      Treated: t ? +t.level.toFixed(3) : null,
      Untreated: u ? +u.level.toFixed(3) : null,
    }
  })

  const hasUntreated = untreated.length > 0

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Trend over time
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
            {healthGuideline != null && healthGuideline > 0 && (
              <ReferenceLine
                y={healthGuideline}
                stroke="#f59e0b"
                strokeDasharray="4 4"
                label={{ value: 'Health', fontSize: 8, fill: '#f59e0b', position: 'right' }}
              />
            )}
            {legalLimit != null && legalLimit > 0 && (
              <ReferenceLine
                y={legalLimit}
                stroke="#e11d48"
                strokeDasharray="4 4"
                label={{ value: 'Legal', fontSize: 8, fill: '#e11d48', position: 'right' }}
              />
            )}
            <Line
              type="monotone"
              dataKey="Treated"
              stroke="#0d9488"
              strokeWidth={2}
              dot={{ r: 3, fill: '#0d9488' }}
              connectNulls
            />
            {hasUntreated && (
              <Line
                type="monotone"
                dataKey="Untreated"
                stroke="#94a3b8"
                strokeWidth={2}
                strokeDasharray="5 3"
                dot={{ r: 3, fill: '#94a3b8' }}
                connectNulls
              />
            )}
            <Legend
              wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
              iconType="line"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
