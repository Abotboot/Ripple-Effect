'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell,
} from 'recharts'
import type { ContaminantSummary } from '@/lib/types'

// Horizontal bar chart comparing latest contaminant levels to benchmarks.
// Uses log scale to handle the wide range (e.g. 0.02 ppt vs 80 ppb).
export function ContaminantBarChart({
  summaries,
}: {
  summaries: ContaminantSummary[]
}) {
  if (summaries.length === 0) {
    return <p className="text-sm text-muted-foreground">No measurement data.</p>
  }

  const data = summaries.map((s) => {
    const hg = s.contaminant.healthGuideline
    const ll = s.contaminant.legalLimit
    // ratio vs health guideline (or vs legal limit if no health guideline)
    const ratio = hg != null && hg > 0
      ? s.latestLevel / hg
      : ll != null && ll > 0
      ? s.latestLevel / ll
      : 0
    return {
      name: s.contaminant.name.length > 22
        ? s.contaminant.name.slice(0, 20) + '…'
        : s.contaminant.name,
      fullName: s.contaminant.name,
      level: s.latestLevel,
      unit: s.unit,
      ratio,
      status: s.exceedsLegalLimit
        ? 'danger'
        : s.exceedsHealthGuideline
        ? 'warning'
        : 'ok',
    }
  })

  // Sort by ratio descending so the worst offenders are at top
  data.sort((a, b) => b.ratio - a.ratio)

  const colorFor = (s: string) =>
    s === 'danger' ? '#e11d48' : s === 'warning' ? '#f59e0b' : '#0d9488'

  // Use log scale because levels span many orders of magnitude
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 24, bottom: 4, left: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.01 200)" horizontal={false} />
          <XAxis
            type="number"
            scale="log"
            domain={['auto', 'auto']}
            tick={{ fontSize: 10, fill: 'oklch(0.5 0.02 200)' }}
            stroke="oklch(0.85 0.01 200)"
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toString())}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={140}
            tick={{ fontSize: 11, fill: 'oklch(0.3 0.03 200)' }}
            stroke="oklch(0.85 0.01 200)"
          />
          <Tooltip
            cursor={{ fill: 'oklch(0.96 0.01 200)' }}
            contentStyle={{
              borderRadius: 8,
              border: '1px solid oklch(0.9 0.01 200)',
              fontSize: 12,
              background: 'oklch(1 0 0)',
            }}
            formatter={(value: number, _name, item) => {
              const p = item.payload as { unit: string; ratio: number; status: string }
              const ratioText = p.ratio > 1
                ? `${p.ratio.toFixed(1)}× health guideline`
                : `${(p.ratio * 100).toFixed(0)}% of guideline`
              return [`${value.toFixed(2)} ${p.unit} · ${ratioText}`, p.fullName]
            }}
          />
          <ReferenceLine x={1} stroke="#0d9488" strokeDasharray="4 4" label={{ value: 'Health guideline', fontSize: 9, fill: '#0d9488', position: 'insideTopRight' }} />
          <Bar dataKey="level" radius={[0, 4, 4, 0]} barSize={14}>
            {data.map((d, i) => (
              <Cell key={i} fill={colorFor(d.status)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
