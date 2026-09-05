'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  BarChart3, FlaskConical, AlertTriangle, Droplets, Microscope,
  TrendingDown, ArrowRight, Info, ExternalLink, BookOpen, Filter,
  Award, Wrench, DollarSign, ShieldCheck, CheckCircle2, XCircle,
  Recycle, Eye, Waves, Leaf, ShieldAlert, Beaker, HandHeart,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Cell,
} from 'recharts'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { Section } from '@/components/site/site-header'
import { MicroplasticsTrendSection } from '@/components/sections/microplastics-trend-section'
import { ContaminantSpectrumChart } from '@/components/d3/contaminant-spectrum-chart'
import { MicroplasticsFlowChart } from '@/components/d3/microplastics-flow-chart'

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

// -- Plastic contaminants (from the old Plastics page) --
type PlasticEntry = {
  name: string
  size: string
  sources: string
  foundIn: string
  healthNote: string
  source: string
  sourceUrl: string
}

const PLASTIC_ENTRIES: PlasticEntry[] = [
  {
    name: 'Microplastics',
    size: '< 5 mm (down to ~1 µm)',
    sources: 'Plastic packaging breakdown, synthetic textile fibers, tire wear particles, microbeads, degraded larger plastics.',
    foundIn: 'Rivers, lakes, streams, oceans, soil, air, food, and the water supplies drawn from them.',
    healthNote: 'WHO 2019: evidence too limited to set a health guideline; more research needed. Particle size determines whether they cross gut/lung barriers.',
    source: 'WHO 2019, Microplastics in Drinking-Water',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241516198',
  },
  {
    name: 'Nanoplastics',
    size: '< 1 µm (down to ~1 nm)',
    sources: 'Further breakdown of microplastics, direct release from products, polymer manufacturing.',
    foundIn: 'Surface freshwater, bottled water (a 2024 Columbia University study found ~110,000–370,000 particles/L), food chain.',
    healthNote: 'Sub-micron particles can cross cellular barriers. Research is early; potential for cellular uptake is a concern.',
    source: 'Qian et al., PNAS 2024',
    sourceUrl: 'https://www.pnas.org/doi/10.1073/pnas.2300582121',
  },
  {
    name: 'Microbeads',
    size: '< 5 mm',
    sources: 'Historically used in exfoliating face washes and toothpastes. Banned in rinse-off cosmetics in the US (Microbead-Free Waters Act of 2015) but persist in the environment.',
    foundIn: 'Lakes, rivers, marine sediment; legacy contamination persists.',
    healthNote: 'Ingested by aquatic organisms and passed up the food chain. The 2015 ban addressed new production, not existing environmental loads.',
    source: 'EPA, Microbeads',
    sourceUrl: 'https://www.epa.gov/water-contaminants/microbeads',
  },
  {
    name: 'Tire-wear particles (TRWP)',
    size: '~10 µm – 5 mm',
    sources: 'Friction of vehicle tires on roads. One of the largest sources of microplastic pollution globally.',
    foundIn: 'Road runoff, stormwater, rivers, coastal waters, air near roadways.',
    healthNote: 'Contain a cocktail of rubber, additives, and adsorbed heavy metals. 6PPD-quinone (a tire additive) is acutely toxic to coho salmon at parts-per-trillion levels.',
    source: 'Tian et al., Science 2021',
    sourceUrl: 'https://www.science.org/doi/10.1126/science.abq4053',
  },
  {
    name: 'Synthetic textile fibers',
    size: '~5 µm – 5 mm',
    sources: 'Shedding from polyester, nylon, acrylic, and fleece garments during washing. A typical wash can release hundreds of thousands of fibers.',
    foundIn: 'Wastewater effluent, rivers, lakes, oceans, indoor air.',
    healthNote: 'Among the most common microplastic morphologies found in freshwater surveys. Washing-machine filters can reduce release.',
    source: 'Napper & Thompson, Environ. Sci. Technol. 2016',
    sourceUrl: 'https://pubs.acs.org/doi/10.1021/acs.est.5b06192',
  },
]

// -- Other emerging contaminants --
type EmergingEntry = {
  name: string
  category: string
  summary: string
  source: string
  sourceUrl: string
}

const EMERGING_ENTRIES: EmergingEntry[] = [
  {
    name: 'PFAS ("forever chemicals")',
    category: 'PFAS',
    summary: 'Thousands of per- and polyfluoroalkyl substances used in nonstick, stain-resistant, and firefighting products. Extremely persistent in rivers and groundwater. EPA set the first MCL for PFOA/PFOS at 4 ppt in 2024.',
    source: 'EPA PFAS National Primary Drinking Water Regulation (2024)',
    sourceUrl: 'https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas',
  },
  {
    name: 'Pharmaceuticals & personal care products',
    category: 'PPCPs',
    summary: 'Trace levels of antibiotics, hormones, antidepressants, and painkillers detected in surface water. Not fully removed by conventional wastewater treatment, so they reach rivers and lakes.',
    source: 'USGS, Emerging Contaminants',
    sourceUrl: 'https://toxics.usgs.gov/investigations/pcps/',
  },
  {
    name: 'Endocrine disruptors (BPA, phthalates)',
    category: 'Endocrine',
    summary: 'Bisphenol A and phthalates leach from plastics and can interfere with hormone systems at very low doses. Often found alongside microplastics because they share plastic sources.',
    source: 'NIEHS, Endocrine Disruptors',
    sourceUrl: 'https://www.niehs.nih.gov/health/topics/agents/endocrine',
  },
  {
    name: 'Perchlorate',
    category: 'Rocket fuel / oxidizer',
    summary: 'Used in rocket fuel, fireworks, and flares. Interferes with thyroid function. Contaminates groundwater and surface water near manufacturing and testing sites.',
    source: 'EPA, Perchlorate',
    sourceUrl: 'https://www.epa.gov/sdwa/perchlorate',
  },
  {
    name: '1,4-Dioxane',
    category: 'Solvent',
    summary: 'A likely human carcinogen used as a solvent stabilizer. Present in some groundwater and resistant to conventional treatment. Often a contaminant in consumer products.',
    source: 'EPA, 1,4-Dioxane',
    sourceUrl: 'https://www.epa.gov/sites/default/files/2014-03/documents/14-dioxane_factsheet.pdf',
  },
  {
    name: 'Cyanotoxins (microcystin)',
    category: 'Algal toxins',
    summary: 'Toxins produced by harmful algal blooms in warm, nutrient-rich freshwater. Microcystin can contaminate lakes and reservoirs. EPA issued health advisories (2015) but no binding MCL.',
    source: 'EPA, Cyanotoxins in Drinking Water',
    sourceUrl: 'https://www.epa.gov/cyanohabs',
  },
]

// -- Filter / removal guide (from the old Filters page) --
type FilterType = {
  name: string
  costRange: string
  maintenance: string
  effectiveness: Record<string, 'high' | 'medium' | 'low' | 'none'>
  description: string
  certifications: string[]
  pros: string[]
  cons: string[]
}

const FILTER_TYPES: FilterType[] = [
  {
    name: 'Activated Carbon (Pitcher/Faucet)',
    costRange: '$20–$80 upfront, $15–$40/filter every 2-3 months',
    maintenance: 'Replace filter cartridge every 2-3 months',
    effectiveness: { lead: 'medium', chlorine: 'high', pfas: 'medium', microplastics: 'medium', thm: 'high', arsenic: 'none' },
    description: 'The most common and affordable option. Activated carbon absorbs contaminants through its porous surface. Good for taste/odor improvement and chlorine byproducts.',
    certifications: ['NSF/ANSI 42 (taste/odor)', 'NSF/ANSI 53 (health effects)'],
    pros: ['Affordable and easy to install', 'Improves taste and odor', 'Reduces chlorine byproducts', 'No plumbing required'],
    cons: ['Limited contaminant removal', 'Doesn\'t remove arsenic or fluoride', 'Filter replacement adds up', 'Small capacity'],
  },
  {
    name: 'Reverse Osmosis (Under-Sink)',
    costRange: '$150–$500 upfront, $50–$100/year for filters',
    maintenance: 'Replace pre-filters every 6-12 months, membrane every 2-3 years',
    effectiveness: { lead: 'high', chlorine: 'high', pfas: 'high', microplastics: 'high', thm: 'high', arsenic: 'high' },
    description: 'Forces water through a semi-permeable membrane that removes virtually all contaminants. The most effective point-of-use system, but produces wastewater and removes beneficial minerals.',
    certifications: ['NSF/ANSI 58 (reverse osmosis)'],
    pros: ['Removes the widest range of contaminants', 'Effective against microplastics and nanoplastics', 'Reduces PFAS, lead, arsenic', 'Installs under the sink'],
    cons: ['Produces 3-5 gallons of wastewater per gallon filtered', 'Removes beneficial minerals (remineralization recommended)', 'Slower flow rate', 'Requires installation'],
  },
  {
    name: 'Whole-House (Point of Entry)',
    costRange: '$500–$3,000+ upfront, $100–$300/year maintenance',
    maintenance: 'Replace media annually, professional service recommended',
    effectiveness: { lead: 'medium', chlorine: 'high', pfas: 'low', microplastics: 'low', thm: 'high', arsenic: 'none' },
    description: 'Treats all water entering the home. Good for chlorine, sediment, and scale. Does NOT effectively remove lead, PFAS, or microplastics, so pair with a point-of-use system.',
    certifications: ['NSF/ANSI 42 (taste/odor)', 'NSF/ANSI 44 (cation exchange)'],
    pros: ['Treats all water (showers, laundry, etc.)', 'Reduces chlorine exposure from bathing', 'Protects plumbing from scale'],
    cons: ['Expensive upfront', 'Doesn\'t remove lead/PFAS/microplastics', 'Requires professional installation', 'Ongoing maintenance'],
  },
  {
    name: 'Distillation',
    costRange: '$100–$300 upfront, electricity cost ~$0.20/gallon',
    maintenance: 'Clean mineral buildup monthly',
    effectiveness: { lead: 'high', chlorine: 'high', pfas: 'high', microplastics: 'high', thm: 'medium', arsenic: 'high' },
    description: 'Boils water and condenses the steam, leaving contaminants behind. Very effective but slow and energy-intensive. Produces very pure water.',
    certifications: ['NSF/ANSI 62 (distillation)'],
    pros: ['Removes nearly all contaminants', 'No filter cartridges to replace', 'Very pure output'],
    cons: ['Very slow (hours per gallon)', 'Energy-intensive', 'Removes beneficial minerals', 'Bulky countertop unit'],
  },
  {
    name: 'Ceramic Filter',
    costRange: '$30–$200 upfront, $20–$50/filter every 6-12 months',
    maintenance: 'Clean ceramic element monthly, replace annually',
    effectiveness: { lead: 'medium', chlorine: 'medium', pfas: 'low', microplastics: 'high', thm: 'medium', arsenic: 'none' },
    description: 'Uses a porous ceramic element to filter out particles and bacteria. Excellent for microplastics and biological contaminants. Often combined with activated carbon.',
    certifications: ['NSF/ANSI 53 (health effects)', 'EPA Est. Number'],
    pros: ['Excellent for microplastics and bacteria', 'Long-lasting filter element', 'Can be cleaned and reused', 'No electricity required'],
    cons: ['Slow flow rate', 'Doesn\'t remove dissolved chemicals (PFAS, arsenic)', 'Fragile ceramic element', 'Limited capacity'],
  },
]

const CONTAMINANT_NAMES: Record<string, string> = {
  lead: 'Lead',
  chlorine: 'Chlorine',
  pfas: 'PFAS',
  microplastics: 'Microplastics',
  thm: 'Trihalomethanes',
  arsenic: 'Arsenic',
}

const EFFECTIVENESS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  high: { label: 'Highly effective', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300', icon: CheckCircle2 },
  medium: { label: 'Moderately effective', color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300', icon: ShieldCheck },
  low: { label: 'Low effectiveness', color: 'bg-orange-100 text-orange-700 dark:bg-orange-950/50 dark:text-orange-300', icon: AlertTriangle },
  none: { label: 'Not effective', color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300', icon: XCircle },
}

export function MicroplasticsSection({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [data, setData] = useState<ContaminantDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [errored, setErrored] = useState(false)

  useEffect(() => {
    let cancelled = false
    api.listContaminants()
      .then(async (contaminants) => {
        const mp = contaminants.find((c) => c.slug === 'microplastics')
        if (!mp) {
          setLoading(false)
          return
        }
        const res = await fetch(`/api/contaminants/${mp.id}`)
        if (!res.ok) throw new Error(`API ${res.status}`)
        const json: ContaminantDetail = await res.json()
        if (!cancelled) {
          setData(json)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setErrored(true)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Shown instead of a chart if the API failed or returned no usable data,
  // so cards never render as a permanently blank box.
  const chartError = !loading && (!data || errored) && (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
      {errored
        ? 'Live data is temporarily unavailable. Please refresh in a moment.'
        : 'No microplastics measurements recorded yet.'}
    </div>
  )

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
              Featured Initiative
                          </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Microplastics in our freshwater
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Microplastics data is unavailable in most of the world, including
                            much of the US. We&apos;re building a low-cost identifier and a
                            public database to map microplastics in our rivers, lakes, and
                            streams, the untreated water everything starts with.
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
                Almost no public water database tracks microplastics in freshwater. We do.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The EWG Tap Water Database, EPA SDWIS, and nearly every state
                water portal omit microplastics entirely &mdash; there is no federal
                limit and no routine monitoring requirement. A Ripple Effect
                Initiative tracks it anyway, because what you can&apos;t see can
                still hurt you.
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
            label="Water sources tested"
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

      {/* Tabbed info hub */}
      <Tabs defaultValue="data" className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <TabsList className="mx-auto flex w-full max-w-xl">
          <TabsTrigger value="data" className="flex-1 gap-1.5">
            <BarChart3 className="h-4 w-4" />
            <span className="hidden sm:inline">The data</span>
            <span className="sm:hidden">Data</span>
          </TabsTrigger>
          <TabsTrigger value="plastics" className="flex-1 gap-1.5">
            <Recycle className="h-4 w-4" />
            <span className="hidden sm:inline">Plastics &amp; contaminants</span>
            <span className="sm:hidden">Plastics</span>
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex-1 gap-1.5">
            <Filter className="h-4 w-4" />
            <span className="hidden sm:inline">Filters &amp; removal</span>
            <span className="sm:hidden">Filters</span>
          </TabsTrigger>
        </TabsList>

        {/* -- Tab: the data -- */}
        <TabsContent value="data">
          <section className="py-4">
            {/* Data provenance callout */}
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">About this data: </span>
                Sample ranges are calibrated to published research &mdash; the WHO 2019
                report <em>&ldquo;Microplastics in drinking-water&rdquo;</em> and the Orb Media 2017
                survey of 14 countries. Specific city measurements shown
                here are illustrative simulations within those published ranges, not
                lab-verified results. We replace them with real readings as volunteers
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
                    Why untreated water matters
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Average microplastic particles per liter (p/L) in untreated
                    source water vs after treatment, the gap is what reaches people.
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[260px] w-full" />
                  ) : chartError ? (
                    <div className="flex h-[260px] items-center justify-center">{chartError}</div>
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
                      microplastics, which is exactly why we measure the untreated source.
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
                    Latest measured microplastic levels across all water sources in our database.
                  </p>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-[300px] w-full" />
                  ) : !data || data.utilityStats.length === 0 ? (
                    <div className="flex h-[300px] items-center justify-center rounded-lg border border-dashed border-border px-6 text-center text-sm text-muted-foreground">
                      No microplastics measurements recorded yet.
                    </div>
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

          {/* D3 Contaminant Safety Gap Spectrum */}
          <div className="mx-auto max-w-7xl pt-4 pb-8">
            <ContaminantSpectrumChart />
          </div>

          {/* What are microplastics / why it matters */}
          <section className="py-12">
            <div className="grid gap-6 lg:grid-cols-3">
              <InfoCard
                icon={Microscope}
                title="What are microplastics?"
                body={data?.contaminant.description ?? 'Tiny plastic particles less than 5mm in size. Found in freshwater worldwide and currently unregulated in the US.'}
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
          </section>
        </TabsContent>

        {/* -- Tab: plastics & contaminants -- */}
        <TabsContent value="plastics">
          <section className="py-4">
            <div className="mb-6 flex items-center gap-2">
              <Microscope className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Plastic contaminants we follow
              </h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {PLASTIC_ENTRIES.map((p, i) => (
                <motion.div
                  key={p.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="flex h-full flex-col overflow-hidden border-amber-300/40 hover:border-amber-400/60 hover:shadow-md dark:border-amber-700/40">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground">{p.name}</h3>
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-500 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                          <Eye className="h-2.5 w-2.5" /> Tracked
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Particle size: <span className="font-medium text-foreground">{p.size}</span>
                      </div>

                      <div className="mt-3 space-y-2 text-xs">
                        <div>
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Droplets className="h-3 w-3 text-primary" /> Sources
                          </div>
                          <p className="mt-0.5 text-muted-foreground">{p.sources}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <Waves className="h-3 w-3 text-primary" /> Found in
                          </div>
                          <p className="mt-0.5 text-muted-foreground">{p.foundIn}</p>
                        </div>
                        <div>
                          <div className="flex items-center gap-1 font-medium text-foreground">
                            <AlertTriangle className="h-3 w-3 text-amber-500" /> Health note
                          </div>
                          <p className="mt-0.5 text-muted-foreground">{p.healthNote}</p>
                        </div>
                      </div>

                      <a
                        href={p.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {p.source}
                      </a>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Other emerging contaminants */}
          <section className="py-8">
            <div className="mb-2 flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                Other emerging contaminants
              </h2>
            </div>
            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
              Non-plastic contaminants of growing concern in freshwater. Some are newly regulated
              (PFAS), some have advisories but no limit (cyanotoxins, perchlorate),
              and some are still being characterized.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {EMERGING_ENTRIES.map((e, i) => (
                <motion.div
                  key={e.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-semibold text-foreground">{e.name}</h3>
                        <span className="rounded-md border border-border bg-secondary/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                          {e.category}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{e.summary}</p>
                      <a
                        href={e.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-auto inline-flex items-center gap-1 pt-3 text-[11px] font-medium text-primary hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        {e.source}
                      </a>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </section>

          {/* Why it matters */}
          <section className="py-8">
            <Card className="overflow-hidden border-primary/30">
              <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-3">
                <div>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">Regulation lags the science</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    EPA limits reflect what was measurable and concerning decades
                    ago. Many emerging contaminants have no MCL, but they&apos;re
                    in our rivers and lakes anyway.
                  </p>
                </div>
                <div>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Leaf className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">Plastics are everywhere</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Plastic doesn&apos;t biodegrade; it fragments. Every piece of
                    plastic ever made still exists in some form. Tracking it in
                    freshwater is the first step to removing it.
                  </p>
                </div>
                <div>
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Microscope className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold">You can help measure it</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    Volunteers take the identifier and dip it into local freshwater.
                    The more readings, the clearer the picture of plastic
                    contamination becomes.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>

        {/* -- Tab: filters & removal -- */}
        <TabsContent value="filters">
          <section className="py-4">
            <div className="mb-2 flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
                What actually removes microplastics
              </h2>
            </div>
            <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
              Not all filters remove all contaminants. Here&apos;s how the common
              filtration systems stack up, with effectiveness ratings, NSF
              certifications, and cost estimates.
            </p>

            {/* D3 Freshwater & Filtration Pathway Flow */}
            <div className="mb-8">
              <MicroplasticsFlowChart />
            </div>

            {/* Filter cards */}
            <div className="space-y-6">
              {FILTER_TYPES.map((filter, i) => (
                <motion.div
                  key={filter.name}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <Card className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <Filter className="h-5 w-5 text-primary" />
                            {filter.name}
                          </CardTitle>
                          <p className="mt-1.5 text-sm text-muted-foreground">{filter.description}</p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* Cost + maintenance */}
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <DollarSign className="h-3 w-3" />
                            Cost
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">{filter.costRange}</div>
                        </div>
                        <div className="rounded-lg border border-border bg-muted/30 p-3">
                          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Wrench className="h-3 w-3" />
                            Maintenance
                          </div>
                          <div className="mt-1 text-sm font-medium text-foreground">{filter.maintenance}</div>
                        </div>
                      </div>

                      {/* Effectiveness matrix */}
                      <div>
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Beaker className="h-3.5 w-3.5" />
                          Effectiveness by contaminant
                        </div>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                          {Object.entries(filter.effectiveness).map(([contam, level]) => {
                            const cfg = EFFECTIVENESS_CONFIG[level]
                            const Icon = cfg.icon
                            return (
                              <div key={contam} className={cn('rounded-lg border p-2 text-center', cfg.color)}>
                                <div className="text-[10px] font-medium">{CONTAMINANT_NAMES[contam]}</div>
                                <Icon className="mx-auto mt-1 h-3.5 w-3.5" />
                                <div className="mt-0.5 text-[9px] font-medium leading-tight">{cfg.label.split(' ')[0]}</div>
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Certifications */}
                      <div>
                        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <Award className="h-3.5 w-3.5" />
                          Certifications to look for
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {filter.certifications.map((cert) => (
                            <span key={cert} className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                              <ShieldCheck className="h-3 w-3" />
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Pros + Cons */}
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <div className="mb-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400">Pros</div>
                          <ul className="space-y-1">
                            {filter.pros.map((p) => (
                              <li key={p} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
                                <span>{p}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <div className="mb-1.5 text-xs font-semibold text-rose-700 dark:text-rose-400">Cons</div>
                          <ul className="space-y-1">
                            {filter.cons.map((c) => (
                              <li key={c} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                                <XCircle className="mt-0.5 h-3 w-3 shrink-0 text-rose-500" />
                                <span>{c}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Certification guide */}
            <Card className="mt-10 border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Award className="h-4 w-4 text-primary" />
                  Understanding NSF/ANSI certifications
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { code: 'NSF 42', desc: 'Aesthetic effects (taste, odor, chlorine, particulates). Basic filtration.' },
                    { code: 'NSF 53', desc: 'Health effects (lead, VOCs, cysts, PFAS). The key certification for safety.' },
                    { code: 'NSF 58', desc: 'Reverse osmosis systems. Covers contaminant reduction + structural integrity.' },
                    { code: 'NSF 62', desc: 'Water distillation systems. Verifies contaminant reduction performance.' },
                    { code: 'NSF 401', desc: 'Emerging contaminants (pharmaceuticals, BPA, some pesticides).' },
                    { code: 'NSF P473', desc: 'PFAS reduction. Specifically verifies removal of PFOA and PFOS.' },
                  ].map((cert) => (
                    <div key={cert.code} className="rounded-lg border border-border bg-card p-3">
                      <div className="text-sm font-bold text-foreground">{cert.code}</div>
                      <div className="mt-1 text-xs text-muted-foreground">{cert.desc}</div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  NSF International is an independent, accredited organization that tests and certifies water treatment products.
                  Always verify a filter&apos;s certification on the{' '}
                  <a href="https://www.nsf.org" target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                    NSF official website
                  </a>{' '}
                  packaging claims are not always verified.
                </p>
              </CardContent>
            </Card>

            {/* Microplastics-specific tip */}
            <Card className="mt-6 border-amber-300/60 dark:border-amber-700/40">
              <CardContent className="flex items-start gap-3 p-5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Recycle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-foreground">Removing microplastics</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Microplastics are particles, not dissolved chemicals, so filtration works differently.
                    Reverse osmosis, ceramic filters, and distillation are most effective (they physically block particles).
                    Activated carbon pitchers help but vary by pore size. For nanoplastics (&lt;1µm), only reverse osmosis
                    and distillation are reliable. Avoid single-use plastic bottles; a 2024 study found bottled water
                    contains ~110,000–370,000 particles/L, far more than most freshwater sources.
                  </p>
                </div>
              </CardContent>
            </Card>
          </section>
        </TabsContent>
      </Tabs>

      {/* The plan + get involved */}
      <section className="bg-water-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <Card className="overflow-hidden border-primary/30">
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
                  data flows into this open database, for everyone to see.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Where we dip it:
                </p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  <li className="flex items-start gap-2">
                    <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Rivers &amp; lakes</strong>, measure microplastics in the freshwater communities rely on</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Streams &amp; runoff</strong>, measure industrial runoff and pre-treatment microplastics</span>
                  </li>
                </ul>
                <div className="mt-4 flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                  <BookOpen className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span>
                    Companion mobile app in the works &mdash; volunteers will be able
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
                  Test your local freshwater
                </p>
                <p className="mt-2 text-sm text-white/85">
                  Take a reading from a river, lake, or stream near you and push
                  the data here. Every measurement makes the map clearer.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="secondary"
                    className="bg-white text-primary hover:bg-white/90"
                    onClick={() => onNavigate?.('submit')}
                  >
                    <Beaker className="h-4 w-4" />
                    Submit a reading
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/40 bg-transparent text-white hover:bg-white/10 hover:text-white"
                    onClick={() => onNavigate?.('donate')}
                  >
                    <HandHeart className="h-4 w-4" />
                    Support the project
                  </Button>
                </div>
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
