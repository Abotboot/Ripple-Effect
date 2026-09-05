'use client'

import { useState, useMemo } from 'react'
import { scaleLog } from 'd3-scale'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertTriangle, ShieldAlert, ShieldCheck, Info,
  ExternalLink, Sparkles, Filter, CheckCircle2,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export interface ContaminantBenchmark {
  id: string
  name: string
  category: 'pfas' | 'heavy-metals' | 'plastics' | 'byproducts' | 'agricultural'
  unit: string
  ewgGuideline: number
  epaLimit: number | null // null means unregulated by EPA!
  typicalUntreated: number
  typicalTreated: number
  description: string
  healthRisk: string
  filterTip: string
  utilities: Array<{
    name: string
    city: string
    state: string
    level: number
  }>
}

const CONTAMINANTS_DATA: ContaminantBenchmark[] = [
  {
    id: 'pfoa',
    name: 'PFOA / PFAS (Forever Chemicals)',
    category: 'pfas',
    unit: 'ppt',
    ewgGuideline: 0.004,
    epaLimit: 4.0,
    typicalUntreated: 6.8,
    typicalTreated: 4.2,
    description: 'Fluorinated synthetic surfactants used in Teflon, firefighting foam, and water-repellent fabrics. They do not naturally break down in the environment.',
    healthRisk: 'Immune system suppression, liver damage, testicular and kidney cancer, low birth weight.',
    filterTip: 'Reverse osmosis or NSF 53/58 certified activated carbon filters reduce PFAS by up to 99%.',
    utilities: [
      { name: 'Charlotte Water', city: 'Charlotte', state: 'NC', level: 5.4 },
      { name: 'Greater Cincinnati Water Works', city: 'Cincinnati', state: 'OH', level: 3.8 },
      { name: 'City of Philadelphia Water', city: 'Philadelphia', state: 'PA', level: 4.9 },
      { name: 'Cape Fear Public Utility', city: 'Wilmington', state: 'NC', level: 8.2 },
      { name: 'Detroit Water and Sewerage', city: 'Detroit', state: 'MI', level: 2.1 },
    ],
  },
  {
    id: 'microplastics',
    name: 'Microplastics (All Shapes & Polymers)',
    category: 'plastics',
    unit: 'particles/L',
    ewgGuideline: 0.5,
    epaLimit: null, // UNREGULATED
    typicalUntreated: 8.4,
    typicalTreated: 5.9,
    description: 'Plastic fragments smaller than 5mm stemming from synthetic clothing shedding, tire road wear, and urban litter fragmentation in surface water.',
    healthRisk: 'Cellular membrane disruption, inflammation, endocrine disrupting chemical leaching (BPA, phthalates).',
    filterTip: 'Sub-micron (<0.5 μm) carbon block and reverse osmosis filtration capture over 98% of particles.',
    utilities: [
      { name: 'Chicago Water Dept (Lake Michigan)', city: 'Chicago', state: 'IL', level: 7.2 },
      { name: 'Los Angeles DWP', city: 'Los Angeles', state: 'CA', level: 6.1 },
      { name: 'New Orleans S&WB (Mississippi River)', city: 'New Orleans', state: 'LA', level: 9.8 },
      { name: 'Cleveland Water (Lake Erie)', city: 'Cleveland', state: 'OH', level: 8.5 },
      { name: 'Seattle Public Utilities', city: 'Seattle', state: 'WA', level: 2.4 },
    ],
  },
  {
    id: 'lead',
    name: 'Lead (Pb)',
    category: 'heavy-metals',
    unit: 'ppb',
    ewgGuideline: 0.1,
    epaLimit: 15.0,
    typicalUntreated: 1.2,
    typicalTreated: 3.6,
    description: 'Toxic heavy metal leaching primarily from aging service pipes, household plumbing, and industrial discharge into rivers.',
    healthRisk: 'Irreversible cognitive damage in children, lowered IQ, behavioral disorders, hypertension in adults.',
    filterTip: 'Look for NSF 53 or NSF 58 certification specifically tested for lead reduction.',
    utilities: [
      { name: 'Chicago Dept of Water', city: 'Chicago', state: 'IL', level: 4.8 },
      { name: 'Milwaukee Water Works', city: 'Milwaukee', state: 'WI', level: 3.2 },
      { name: 'Pittsburgh Water & Sewer', city: 'Pittsburgh', state: 'PA', level: 5.1 },
      { name: 'New York City DEP', city: 'New York', state: 'NY', level: 2.0 },
      { name: 'Denver Water', city: 'Denver', state: 'CO', level: 3.9 },
    ],
  },
  {
    id: 'tthm',
    name: 'Total Trihalomethanes (TTHMs)',
    category: 'byproducts',
    unit: 'ppb',
    ewgGuideline: 0.15,
    epaLimit: 80.0,
    typicalUntreated: 0.05,
    typicalTreated: 34.0,
    description: 'Disinfection byproducts formed when chlorine treatment reacts with natural organic matter (decaying leaves, algae) in freshwater.',
    healthRisk: 'Increased risk of bladder and colorectal cancer, adverse pregnancy outcomes.',
    filterTip: 'Standard granular activated carbon (GAC) pitcher filters significantly reduce TTHMs.',
    utilities: [
      { name: 'Houston Public Works', city: 'Houston', state: 'TX', level: 48.0 },
      { name: 'Dallas Water Utilities', city: 'Dallas', state: 'TX', level: 38.5 },
      { name: 'Phoenix Water Services', city: 'Phoenix', state: 'AZ', level: 52.0 },
      { name: 'Atlanta Dept of Watershed', city: 'Atlanta', state: 'GA', level: 29.0 },
      { name: 'Miami-Dade Water and Sewer', city: 'Miami', state: 'FL', level: 41.2 },
    ],
  },
  {
    id: 'arsenic',
    name: 'Arsenic (Inorganic)',
    category: 'heavy-metals',
    unit: 'ppb',
    ewgGuideline: 0.004,
    epaLimit: 10.0,
    typicalUntreated: 2.4,
    typicalTreated: 1.1,
    description: 'Naturally occurring mineral and industrial byproduct found in aquifers, riverbeds, and agricultural runoff.',
    healthRisk: 'Carcinogen linked to skin, bladder, and lung cancer, cardiovascular disease.',
    filterTip: 'Reverse osmosis, ion exchange, or activated alumina filtration are required for arsenic.',
    utilities: [
      { name: 'Tucson Water', city: 'Tucson', state: 'AZ', level: 3.4 },
      { name: 'Albuquerque Water Authority', city: 'Albuquerque', state: 'NM', level: 2.8 },
      { name: 'El Paso Water Utilities', city: 'El Paso', state: 'TX', level: 4.1 },
      { name: 'Los Angeles DWP', city: 'Los Angeles', state: 'CA', level: 1.6 },
      { name: 'Salt Lake City Public Utilities', city: 'Salt Lake City', state: 'UT', level: 1.2 },
    ],
  },
]

export function ContaminantSpectrumChart() {
  const [selectedId, setSelectedId] = useState<string>('pfoa')
  const [hoveredItem, setHoveredItem] = useState<{
    name: string
    city: string
    state: string
    level: number
  } | null>(null)

  const active = useMemo(
    () => CONTAMINANTS_DATA.find((c) => c.id === selectedId) || CONTAMINANTS_DATA[0],
    [selectedId]
  )

  // Compute logarithmic scale domain based on active contaminant
  const { minVal, maxVal, scale } = useMemo(() => {
    const vals = [
      active.ewgGuideline,
      active.epaLimit ?? active.typicalUntreated * 2,
      active.typicalUntreated,
      active.typicalTreated,
      ...active.utilities.map((u) => u.level),
    ].filter(Boolean) as number[]

    const calculatedMin = Math.min(...vals) * 0.4
    const calculatedMax = Math.max(...vals) * 2.5

    // D3 log scale mapping [minVal, maxVal] to [0, 100]%
    const s = scaleLog()
      .domain([calculatedMin, calculatedMax])
      .range([4, 96])
      .clamp(true)

    return { minVal: calculatedMin, maxVal: calculatedMax, scale: s }
  }, [active])

  const ewgPos = scale(active.ewgGuideline)
  const epaPos = active.epaLimit ? scale(active.epaLimit) : null
  const untreatedPos = scale(active.typicalUntreated)
  const treatedPos = scale(active.typicalTreated)

  return (
    <Card className="overflow-hidden border-border/80 shadow-md">
      <CardHeader className="border-b border-border/60 bg-muted/20 pb-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary">
                D3 Logarithmic Spectrum
              </Badge>
              <span className="text-xs text-muted-foreground">EWG vs EPA vs Real Tap Data</span>
            </div>
            <CardTitle className="mt-1.5 text-xl font-bold tracking-tight text-foreground">
              Contaminant Safety Gap Visualizer
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Notice the massive chasm between what science proves is safe (EWG Health Guideline) and what federal law legally permits (EPA Legal Limit).
            </p>
          </div>

          {/* Contaminant Selector Chips */}
          <div className="flex flex-wrap gap-1.5 sm:justify-end">
            {CONTAMINANTS_DATA.map((c) => {
              const isSelected = c.id === active.id
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setSelectedId(c.id)
                    setHoveredItem(null)
                  }}
                  className={`relative rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-primary text-primary-foreground shadow-sm'
                      : 'bg-muted/70 text-muted-foreground hover:bg-muted hover:text-foreground'
                  }`}
                >
                  {c.id === 'microplastics' ? 'Microplastics' : c.name.split(' ')[0]}
                  {isSelected && (
                    <motion.div
                      layoutId="spectrum-tab"
                      className="absolute inset-0 rounded-lg bg-primary -z-10"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-6">
        {/* Contaminant summary banner */}
        <div className="mb-6 rounded-xl border border-border/70 bg-card/60 p-4">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-extrabold text-foreground">{active.name}</h3>
                <Badge variant="secondary" className="font-mono text-xs">
                  {active.unit}
                </Badge>
                {active.epaLimit === null && (
                  <Badge className="border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400 font-semibold">
                    0 Federal Legal Limit (Unregulated)
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-xs text-muted-foreground max-w-2xl">{active.description}</p>
            </div>

            {/* Benchmark stats badges */}
            <div className="flex shrink-0 items-center gap-2 pt-2 md:pt-0">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                  EWG Guideline
                </div>
                <div className="font-mono text-sm font-bold text-amber-900 dark:text-amber-200">
                  {active.ewgGuideline} {active.unit}
                </div>
              </div>

              <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-1.5 text-left">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-rose-700 dark:text-rose-400">
                  EPA Legal Limit
                </div>
                <div className="font-mono text-sm font-bold text-rose-900 dark:text-rose-200">
                  {active.epaLimit != null ? `${active.epaLimit} ${active.unit}` : 'None (No limit)'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* D3 Spectrum Graph */}
        <div className="relative pt-6 pb-12">
          {/* Axis Track Background with Threshold Zones */}
          <div className="relative h-12 w-full overflow-hidden rounded-xl border border-border/80 bg-muted/40 shadow-inner">
            {/* Zone 1: Safe Zone (0 to EWG) */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500/25 to-emerald-400/15"
              style={{ width: `${ewgPos}%` }}
              title="Safe Scientific Baseline"
            />

            {/* Zone 2: Caution Zone (EWG to EPA or Max) */}
            <div
              className="absolute top-0 bottom-0 bg-gradient-to-r from-amber-500/20 via-amber-400/25 to-amber-500/35"
              style={{
                left: `${ewgPos}%`,
                width: epaPos ? `${epaPos - ewgPos}%` : `${100 - ewgPos}%`,
              }}
              title="Exceeds Health Guideline (Known biological risk)"
            />

            {/* Zone 3: Danger Zone (Beyond EPA limit, if applicable) */}
            {epaPos && (
              <div
                className="absolute top-0 bottom-0 right-0 bg-gradient-to-r from-rose-500/30 to-rose-600/50"
                style={{ left: `${epaPos}%` }}
                title="Exceeds Federal Legal Limit"
              />
            )}

            {/* Center rail guide */}
            <div className="absolute top-1/2 left-0 right-0 h-[2px] -translate-y-1/2 bg-border/80" />

            {/* Plotted Sample Utilities */}
            {active.utilities.map((u, i) => {
              const pos = scale(u.level)
              const isHovered = hoveredItem?.name === u.name
              const exceedEwg = u.level > active.ewgGuideline
              const exceedEpa = active.epaLimit != null && u.level > active.epaLimit

              return (
                <div
                  key={u.name}
                  onMouseEnter={() => setHoveredItem(u)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer z-10 transition-transform duration-150 hover:scale-135"
                  style={{ left: `${pos}%` }}
                >
                  <div
                    className={`h-4 w-4 rounded-full border-2 shadow-md transition-all ${
                      exceedEpa
                        ? 'border-white bg-rose-600 ring-2 ring-rose-500/50'
                        : exceedEwg
                        ? 'border-white bg-amber-500 ring-2 ring-amber-400/50'
                        : 'border-white bg-emerald-500 ring-2 ring-emerald-400/50'
                    } ${isHovered ? 'scale-135 ring-4 ring-primary' : ''}`}
                  />
                </div>
              )
            })}

            {/* National Avg Untreated Marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ left: `${untreatedPos}%` }}
            >
              <div className="h-6 w-1 rounded-full bg-cyan-600 dark:bg-cyan-400 shadow-sm" />
            </div>

            {/* National Avg Treated Marker */}
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-20 pointer-events-none"
              style={{ left: `${treatedPos}%` }}
            >
              <div className="h-6 w-1 rounded-full bg-primary shadow-sm" />
            </div>
          </div>

          {/* Benchmark Flag Lines */}
          {/* 1. EWG Benchmark Marker */}
          <div
            className="absolute top-1 pointer-events-none -translate-x-1/2 flex flex-col items-center"
            style={{ left: `${ewgPos}%` }}
          >
            <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-amber-800 dark:text-amber-300 border border-amber-500/40">
              EWG: {active.ewgGuideline}
            </span>
            <div className="h-3 w-[1px] bg-amber-500/70" />
          </div>

          {/* 2. EPA Legal Limit Marker */}
          {epaPos && (
            <div
              className="absolute top-1 pointer-events-none -translate-x-1/2 flex flex-col items-center"
              style={{ left: `${epaPos}%` }}
            >
              <span className="rounded bg-rose-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-rose-800 dark:text-rose-300 border border-rose-500/40">
                EPA: {active.epaLimit}
              </span>
              <div className="h-3 w-[1px] bg-rose-500/70" />
            </div>
          )}

          {/* Bottom Labels for Untreated vs Treated Markers */}
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground px-1">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-3 rounded-full bg-amber-500" />
                Tracked Utility City
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-1 bg-cyan-500 rounded" />
                Untreated River/Lake Avg ({active.typicalUntreated} {active.unit})
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-3 w-1 bg-primary rounded" />
                Treated Tap Avg ({active.typicalTreated} {active.unit})
              </span>
            </div>
            <div className="font-mono text-[11px] text-muted-foreground hidden sm:block">
              Logarithmic Scale (D3.js)
            </div>
          </div>
        </div>

        {/* Dynamic Detail Card for Hovered or Selected Utility */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Health & Legal Insight */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-semibold text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Health Impacts & Hazards
            </div>
            <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
              {active.healthRisk}
            </p>
            <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-[11px] text-muted-foreground">
              <strong className="text-foreground">Filter Defense: </strong>
              {active.filterTip}
            </div>
          </div>

          {/* Interactive Utility Inspector */}
          <div className="rounded-xl border border-border/70 bg-card p-4">
            <div className="flex items-center justify-between text-sm font-semibold">
              <span className="flex items-center gap-2 text-foreground">
                <Info className="h-4 w-4 text-primary" />
                Utility Measurement Inspector
              </span>
              <span className="text-[11px] text-muted-foreground">Hover dots on spectrum</span>
            </div>

            {hoveredItem ? (
              <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 animate-in fade-in duration-200">
                <div className="flex items-baseline justify-between">
                  <span className="font-bold text-sm text-foreground">{hoveredItem.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {hoveredItem.city}, {hoveredItem.state}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-black text-primary">
                    {hoveredItem.level}
                  </span>
                  <span className="font-mono text-xs text-muted-foreground">{active.unit}</span>
                  <Badge
                    className={`ml-auto text-xs ${
                      hoveredItem.level > (active.epaLimit ?? Infinity)
                        ? 'bg-rose-500 text-white'
                        : hoveredItem.level > active.ewgGuideline
                        ? 'bg-amber-500 text-white'
                        : 'bg-emerald-500 text-white'
                    }`}
                  >
                    {hoveredItem.level > (active.epaLimit ?? Infinity)
                      ? 'Exceeds Legal Limit'
                      : hoveredItem.level > active.ewgGuideline
                      ? `${Math.round(hoveredItem.level / active.ewgGuideline)}× EWG Guideline`
                      : 'Safe'}
                  </Badge>
                </div>
              </div>
            ) : (
              <div className="mt-3 flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 p-5 text-center text-xs text-muted-foreground">
                <span>Hover over any plotted node on the spectrum above to inspect its real measurement and health multiplier.</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
