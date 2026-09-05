'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Waves, AlertTriangle, ShieldCheck, Filter,
  ArrowRight, Info, Droplets, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FlowNode {
  id: string
  label: string
  sublabel: string
  pct: number
  color: string
  description: string
}

const SOURCES: FlowNode[] = [
  {
    id: 'textiles',
    label: 'Synthetic Clothing',
    sublabel: 'Microfibers from laundry',
    pct: 35,
    color: '#0284c7', // sky-600
    description: 'Up to 700,000 synthetic microfibers are shed in a single laundry cycle. They bypass standard wastewater treatment plants due to microscopic size.',
  },
  {
    id: 'tires',
    label: 'Tire Road Wear',
    sublabel: '6PPD-quinone & rubber',
    pct: 28,
    color: '#d97706', // amber-600
    description: 'Tire dust washes from highways during storms directly into local creeks and river basins. 6PPD-quinone is acutely toxic to coho salmon and aquatic life.',
  },
  {
    id: 'stormwater',
    label: 'Urban Stormwater',
    sublabel: 'City runoff & debris',
    pct: 24,
    color: '#0d9488', // teal-600
    description: 'Street litter, industrial pellets (nurdles), and weathered plastic debris swept through curbside drains with zero filtration.',
  },
  {
    id: 'packaging',
    label: 'Degraded Packaging',
    sublabel: 'UV breakdown of single-use plastics',
    pct: 13,
    color: '#e11d48', // rose-600
    description: 'Solar ultraviolet rays embrittle discarded polyethylene and polypropylene bottles and bags, fragmenting them into sub-millimeter particles.',
  },
]

const FILTERS: FlowNode[] = [
  {
    id: 'municipal',
    label: 'Municipal Plant Sand Bed',
    sublabel: '72% blocked · 28% passes through',
    pct: 28,
    color: '#e11d48',
    description: 'Most public drinking water plants were designed for bacteria and turbidity, not microscopic synthetic polymers under 50 microns.',
  },
  {
    id: 'pitcher',
    label: 'Standard Pitcher Filter',
    sublabel: '45% blocked · coarse mesh',
    pct: 55,
    color: '#f59e0b',
    description: 'Standard gravity pitcher filters trap visible sand and chlorine taste, but allow smaller microplastics and nanoplastics straight into your glass.',
  },
  {
    id: 'carbon-block',
    label: 'Solid Carbon Block (0.5μm)',
    sublabel: '92% blocked · high pressure',
    pct: 8,
    color: '#0d9488',
    description: 'Sub-micron compressed activated carbon blocks physically catch particles down to 0.5 microns, including most fibers and tire fragments.',
  },
  {
    id: 'ro',
    label: 'Reverse Osmosis (RO)',
    sublabel: '99.8% blocked · molecular membrane',
    pct: 0.2,
    color: '#059669',
    description: 'Semi-permeable polyamide membranes block particles down to 0.0001 microns, removing virtually all microplastics and dissolved PFAS.',
  },
]

export function MicroplasticsFlowChart() {
  const [selectedSource, setSelectedSource] = useState<FlowNode>(SOURCES[0])
  const [selectedFilter, setSelectedFilter] = useState<FlowNode>(FILTERS[0])

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-cyan-500/40 bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
                Freshwater Pathway Interactive
              </Badge>
              <span className="text-xs text-muted-foreground">Source-to-Glass Tracking</span>
            </div>
            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight text-foreground">
              Where Microplastics Come From & What Actually Stops Them
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Microplastics enter untreated freshwater rivers and lakes long before reaching your water plant. Click any source or barrier to inspect particle mechanics.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Visual Flow Diagram */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Column 1: Primary Sources */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>1. Upstream Runoff Sources</span>
              <span>Share</span>
            </div>

            {SOURCES.map((source) => {
              const isSelected = selectedSource.id === source.id
              return (
                <button
                  key={source.id}
                  onClick={() => setSelectedSource(source)}
                  className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {source.label}
                    </span>
                    <Badge
                      variant="secondary"
                      className="font-mono text-xs font-bold"
                      style={{ color: source.color }}
                    >
                      {source.pct}%
                    </Badge>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">{source.sublabel}</span>

                  {/* Flow Bar indicator */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${source.pct}%`, backgroundColor: source.color }}
                    />
                  </div>
                </button>
              )
            })}
          </div>

          {/* Column 2: The Freshwater Transit Basin */}
          <div className="flex flex-col justify-between rounded-2xl border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 via-background to-cyan-500/5 p-5">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-cyan-700 dark:text-cyan-400">
                <Waves className="h-4 w-4" />
                2. Surface Freshwater Inflow
              </div>
              <h4 className="mt-2 text-base font-extrabold text-foreground">
                Rivers, Lakes & Aquifers
              </h4>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                Rain and municipal drainage flush these particles directly into the drinking water watersheds.
                Untreated water samples tested in our database show an average of{' '}
                <strong className="text-foreground font-mono">8.4 particles/L</strong> in raw lake water and{' '}
                <strong className="text-foreground font-mono">14.2 particles/L</strong> in major industrial rivers.
              </p>
            </div>

            {/* River flow graphic SVG */}
            <div className="my-6 relative flex flex-col items-center justify-center py-4">
              <svg className="w-full h-24" viewBox="0 0 300 80" fill="none">
                <path
                  d="M10 40 C 90 10, 150 70, 290 40"
                  stroke="currentColor"
                  strokeWidth="6"
                  strokeLinecap="round"
                  className="text-cyan-500/30"
                />
                <motion.path
                  d="M10 40 C 90 10, 150 70, 290 40"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray="8 8"
                  className="text-cyan-500"
                  animate={{ strokeDashoffset: [0, -32] }}
                  transition={{ repeat: Infinity, duration: 2, ease: 'linear' }}
                />
              </svg>
              <span className="text-[11px] font-medium text-cyan-800 dark:text-cyan-300">
                Continuously carried into municipal intakes
              </span>
            </div>

            {/* Active Source Detail Callout */}
            <div className="rounded-xl border border-cyan-500/20 bg-background/80 p-3.5 backdrop-blur-sm">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-cyan-600 dark:text-cyan-400">
                Selected Source Breakdown: {selectedSource.label}
              </div>
              <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                {selectedSource.description}
              </p>
            </div>
          </div>

          {/* Column 3: Filtration Barriers */}
          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between pb-1 border-b border-border/60 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span>3. Barrier & Filter Retention</span>
              <span>Pass Rate</span>
            </div>

            {FILTERS.map((filter) => {
              const isSelected = selectedFilter.id === filter.id
              return (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter)}
                  className={`group relative flex flex-col items-start rounded-xl border p-3.5 text-left transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/5 shadow-sm ring-1 ring-primary/40'
                      : 'border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                      {filter.label}
                    </span>
                    <Badge
                      variant="outline"
                      className="font-mono text-xs font-bold"
                      style={{ color: filter.color, borderColor: filter.color }}
                    >
                      {filter.pct}% gets through
                    </Badge>
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">{filter.sublabel}</span>

                  {/* Pass rate indicator */}
                  <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${100 - filter.pct}%`, backgroundColor: filter.color }}
                    />
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Selected Filter Insight Banner */}
        <div className="mt-6 rounded-xl border border-border/70 bg-muted/30 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className="mt-0.5 rounded-lg p-2 text-white"
              style={{ backgroundColor: selectedFilter.color }}
            >
              <Filter className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-bold text-foreground">
                {selectedFilter.label} Performance Analysis
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground max-w-2xl">
                {selectedFilter.description}
              </p>
            </div>
          </div>

          <div className="shrink-0 rounded-lg border border-border/80 bg-card px-3 py-1.5 text-right">
            <div className="text-[10px] uppercase font-semibold text-muted-foreground">
              Filter Capture Rate
            </div>
            <div className="font-mono text-base font-extrabold text-foreground">
              {Math.round(100 - selectedFilter.pct)}% blocked
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
