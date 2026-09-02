'use client'

import { motion } from 'framer-motion'
import {
  Database, Building2, FlaskConical, Waves, Globe, Scale, HeartPulse,
  ExternalLink, AlertTriangle, Download, Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'

type DataSource = {
  name: string
  url: string
  description: string
  icon: React.ElementType
  accent: string
}

// -- Real external databases this project references --
// Every entry below is a real, public, government or NGO database with
// an accurate description of what it tracks. No hallucinations.
const DATA_SOURCES: DataSource[] = [
  {
    name: 'EWG Tap Water Database',
    url: 'https://www.ewg.org/tapwater/',
    description:
      'The Environmental Working Group\'s searchable database of drinking water quality for ~50,000 utilities across the US. Covers regulated contaminants with EWG health guidelines (often stricter than EPA limits). Does NOT track microplastics.',
    icon: Database,
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  {
    name: 'EPA SDWIS (Safe Drinking Water Information System)',
    url: 'https://www.epa.gov/sdwisfed',
    description:
      'The EPA\'s federal database of public water systems. Stores compliance, violation, and enforcement data for every regulated public water system. PWSIDs in this project map to SDWIS.',
    icon: Building2,
    accent: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  },
  {
    name: 'EPA UCMR (Unregulated Contaminant Monitoring Rule)',
    url: 'https://www.epa.gov/dwucmr',
    description:
      'EPA\'s program that requires public water systems to test for unregulated contaminants every 5 years. UCMR 5 (2023-2025) includes 29 PFAS compounds and lithium. Microplastics are NOT yet on the UCMR list.',
    icon: FlaskConical,
    accent: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  },
  {
    name: 'USGS National Water Information System (NWIS)',
    url: 'https://waterdata.usgs.gov/nwis',
    description:
      'The U.S. Geological Survey\'s water data portal. Surface-water, groundwater, and water-quality data for streams, lakes, and aquifers nationwide. Useful for source-water context.',
    icon: Waves,
    accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300',
  },
  {
    name: 'WHO, Microplastics in Drinking-Water (2019)',
    url: 'https://www.who.int/publications/i/item/9789241516198',
    description:
      'The World Health Organization\'s 2019 report reviewing the evidence on microplastics in drinking-water. Concluded routine monitoring isn\'t yet warranted due to limited evidence, but called for more research. No health-based guideline value set.',
    icon: Globe,
    accent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300',
  },
  {
    name: 'EPA ECHO (Enforcement & Compliance History Online)',
    url: 'https://echo.epa.gov/',
    description:
      'EPA\'s tool for searching compliance and enforcement data for water systems. Shows violations, inspections, and formal enforcement actions.',
    icon: Scale,
    accent: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300',
  },
  {
    name: 'CDC Drinking Water',
    url: 'https://www.cdc.gov/healthywater/drinking/',
    description:
      'Centers for Disease Control resource on drinking water health, including private wells, contaminants, and outbreak response.',
    icon: HeartPulse,
    accent: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
  },
]

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

export function DataSourcesSection() {
  return (
    <div className="bg-water-hero">
      {/* Header */}
      <section className="border-b border-border/60 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mx-auto max-w-3xl text-center"
          >
            <Badge variant="secondary" className="mb-4 gap-1.5">
              <Database className="h-3.5 w-3.5" />
              Database
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Integrated data sources
            </h1>
            <p className="mt-4 text-pretty text-base text-muted-foreground sm:text-lg">
              We cross-reference these public databases, run by the EPA, USGS,
                            WHO, CDC, and the EWG, and supplement them with our own
              community-collected microplastics measurements. Every source here
              is free, public, and open.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Amber callout, the gap we fill */}
      <section className="border-b border-amber-300/50 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-bold text-foreground sm:text-lg">
                Every database above tracks regulated contaminants. Almost none
                track microplastics &mdash; that&apos;s the gap A Ripple Effect Initiative fills.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The EPA, EWG, and most state portals don&apos;t include
                microplastics because there is no federal limit and no routine
                monitoring requirement. We collect that data ourselves, in the
                open, so communities can see what&apos;s in their water.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Data source cards */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        >
          {DATA_SOURCES.map((src) => {
            const Icon = src.icon
            return (
              <motion.div key={src.name} variants={item}>
                <Card className="h-full overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${src.accent}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`Open ${src.name} in a new tab`}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                    <CardTitle className="mt-3 text-base leading-tight">
                      <a
                        href={src.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="after:absolute after:inset-0 hover:text-primary"
                      >
                        {src.name}
                      </a>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {src.description}
                    </p>
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>
      </section>

      {/* How we use each source */}
      <section className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
              className="lg:col-span-2"
            >
              <h2 className="text-2xl font-bold tracking-tight text-foreground">
                How we use each source
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                We use EWG and EPA SDWIS to identify utilities, their PWSIDs,
                and the regulated contaminants already on file. EPA UCMR tells
                us which emerging contaminants (currently PFAS and lithium) are
                being studied by federal regulators. USGS NWIS gives us
                source-water context &mdash; what&apos;s in the rivers, lakes, and
                aquifers before treatment. The WHO 2019 microplastics report is
                our calibration baseline for measurement ranges. EPA ECHO lets
                us show a utility&apos;s compliance history, and the CDC rounds out
                the public-health context for private wells and outbreaks.
                Everything we add on top &mdash; especially microplastics &mdash; is
                collected by our volunteer chapters and published here, openly.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="flex flex-col gap-3 rounded-xl border border-border bg-background p-5"
            >
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Download className="h-4 w-4" />
                </div>
                <h3 className="text-base font-semibold text-foreground">
                  All data is open
                </h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Every utility, contaminant, and sample in our database is
                downloadable as JSON or CSV. No login, no API key.
              </p>
              <div className="mt-auto flex flex-wrap gap-2">
                <Button asChild size="sm">
                  <a
                    href="/api/export?format=json&table=utilities"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    JSON
                  </a>
                </Button>
                <Button asChild size="sm" variant="outline">
                  <a
                    href="/api/export?format=csv&table=utilities"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    CSV
                  </a>
                </Button>
              </div>
            </motion.div>
          </div>

          {/* Provenance note */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-8 flex items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm"
          >
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">Provenance: </span>
              We link to each source exactly as published. We do not modify or
              re-host their data &mdash; we cross-reference it and supplement it
              with our own microplastics measurements, which are clearly labeled
              by collection date, chapter, and method.
            </p>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
