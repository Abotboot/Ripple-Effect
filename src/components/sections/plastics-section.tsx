'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Recycle, Microscope, AlertTriangle, Droplets, Waves, FlaskConical,
  Eye, ExternalLink, Info, Beaker, Leaf, ShieldAlert,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api'
import type { Contaminant } from '@/lib/types'
import type { Section as NavSection } from '@/components/site/site-header'

// Plastic-related + emerging contaminants beyond the regulated catalog.
// All facts below are sourced from peer-reviewed / agency publications.
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
    foundIn: 'Tap water, bottled water, oceans, rivers, soil, air, food.',
    healthNote: 'WHO 2019: evidence too limited to set a health guideline; more research needed. Particle size determines whether they cross gut/lung barriers.',
    source: 'WHO 2019 — Microplastics in Drinking-Water',
    sourceUrl: 'https://www.who.int/publications/i/item/9789241516198',
  },
  {
    name: 'Nanoplastics',
    size: '< 1 µm (down to ~1 nm)',
    sources: 'Further breakdown of microplastics, direct release from products, polymer manufacturing.',
    foundIn: 'Bottled water (a 2024 Columbia University study found ~110,000–370,000 particles/L), tap water, food chain.',
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
    source: 'EPA — Microbeads',
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
    foundIn: 'Wastewater effluent, rivers, oceans, indoor air, drinking water.',
    healthNote: 'Among the most common microplastic morphologies found in tap water surveys. Washing-machine filters can reduce release.',
    source: 'Napper & Thompson, Environ. Sci. Technol. 2016',
    sourceUrl: 'https://pubs.acs.org/doi/10.1021/acs.est.5b06192',
  },
]

// Other emerging contaminants (non-plastic) worth watching.
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
    summary: 'Thousands of per- and polyfluoroalkyl substances used in nonstick, stain-resistant, and firefighting products. Extremely persistent. EPA set the first MCL for PFOA/PFOS at 4 ppt in 2024.',
    source: 'EPA PFAS National Primary Drinking Water Regulation (2024)',
    sourceUrl: 'https://www.epa.gov/sdwa/and-polyfluoroalkyl-substances-pfas',
  },
  {
    name: 'Pharmaceuticals & personal care products',
    category: 'PPCPs',
    summary: 'Trace levels of antibiotics, hormones, antidepressants, and painkillers detected in surface water and finished drinking water. Not fully removed by conventional treatment.',
    source: 'USGS — Emerging Contaminants',
    sourceUrl: 'https://toxics.usgs.gov/investigations/pcps/',
  },
  {
    name: 'Endocrine disruptors (BPA, phthalates)',
    category: 'Endocrine',
    summary: 'Bisphenol A and phthalates leach from plastics and can interfere with hormone systems at very low doses. Often found alongside microplastics because they share plastic sources.',
    source: 'NIEHS — Endocrine Disruptors',
    sourceUrl: 'https://www.niehs.nih.gov/health/topics/agents/endocrine',
  },
  {
    name: 'Perchlorate',
    category: 'Rocket fuel / oxidizer',
    summary: 'Used in rocket fuel, fireworks, and flares. Interferes with thyroid function. EPA issued a regulatory determination in 2011 but has not yet set an MCL.',
    source: 'EPA — Perchlorate',
    sourceUrl: 'https://www.epa.gov/sdwa/perchlorate',
  },
  {
    name: '1,4-Dioxane',
    category: 'Solvent',
    summary: 'A likely human carcinogen used as a solvent stabilizer. Present in some groundwater and resistant to conventional treatment. Often a contaminant in consumer products.',
    source: 'EPA — 1,4-Dioxane',
    sourceUrl: 'https://www.epa.gov/sites/default/files/2014-03/documents/14-dioxane_factsheet.pdf',
  },
  {
    name: 'Cyanotoxins (microcystin)',
    category: 'Algal toxins',
    summary: 'Toxins produced by harmful algal blooms in warm, nutrient-rich water. Microcystin can contaminate drinking-water supplies drawn from lakes. EPA issued health advisories (2015) but no binding MCL.',
    source: 'EPA — Cyanotoxins in Drinking Water',
    sourceUrl: 'https://www.epa.gov/cyanohabs',
  },
]

export function PlasticsSection({ onNavigate }: { onNavigate?: (s: NavSection) => void }) {
  const [tracked, setTracked] = useState<Contaminant[] | null>(null)

  useEffect(() => {
    api.listContaminants().then((cs) => setTracked(cs.filter((c) => c.trackedByUs))).catch(() => setTracked([]))
  }, [])

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
              <Recycle className="mr-1 h-3 w-3" />
              Plastics &amp; emerging contaminants
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Beyond the regulated list
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              The EPA regulates ~90 contaminants in drinking water. But the
              world of plastics and emerging contaminants is far bigger —
              microplastics, nanoplastics, tire-wear particles, PFAS, and more.
              Here&apos;s what we watch that most databases don&apos;t.
            </p>
          </div>
        </div>
      </section>

      {/* Distinction: plastics gap */}
      <section className="border-b border-amber-300/50 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Plastic contamination is largely untracked in public water databases.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The EWG Tap Water Database and EPA SDWIS do not include
                microplastics, nanoplastics, or tire-wear particles. A Ripples
                Effect tracks the plastics below because the science says they&apos;re
                in our water — and what we can&apos;t see, we can&apos;t fix.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Plastics catalog */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
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
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-2 flex items-center gap-2">
          <FlaskConical className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
            Other emerging contaminants
          </h2>
        </div>
        <p className="mb-6 max-w-2xl text-sm text-muted-foreground">
          Non-plastic contaminants of growing concern. Some are newly regulated
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

      {/* What we actively track in this database */}
      <section className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2">
            <Beaker className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-bold tracking-tight sm:text-2xl">
              Contaminants we actively track here
            </h2>
          </div>
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Tracked by us</span> means
              this database actively records measurements — including
              microplastics, which almost no other public water database
              includes. See the full catalog for EPA limits and health guidelines.
            </p>
          </div>
          {!tracked ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tracked.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onNavigate?.('explorer')}
                  className="group flex flex-col items-start rounded-xl border border-border bg-background p-4 text-left transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex w-full items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-foreground">{c.name}</span>
                    {c.slug === 'microplastics' && (
                      <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
                        #1
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-xs text-muted-foreground">{c.category}</span>
                  <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                    <Eye className="h-3 w-3" /> Tracked by us
                  </div>
                </button>
              ))}
            </div>
          )}
          <div className="mt-6">
            <Button variant="outline" onClick={() => onNavigate?.('explorer')}>
              <FlaskConical className="h-4 w-4" />
              View full contaminant catalog
            </Button>
          </div>
        </div>
      </section>

      {/* Why it matters */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="overflow-hidden border-primary/30">
          <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-3">
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">Regulation lags the science</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                EPA limits reflect what was measurable and concerning decades
                ago. Many emerging contaminants have no MCL — but they&apos;re
                in your water anyway.
              </p>
            </div>
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Leaf className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">Plastics are everywhere</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Plastic doesn&apos;t biodegrade — it fragments. Every piece of
                plastic ever made still exists in some form. Tracking it in
                water is the first step to removing it.
              </p>
            </div>
            <div>
              <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Microscope className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold">You can help measure it</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">
                Chapters take the identifier and dip it into local water. The
                more readings, the clearer the picture of plastic contamination
                becomes.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
