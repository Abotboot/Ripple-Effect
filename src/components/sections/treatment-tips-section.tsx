'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Filter, Search, Droplets, ShieldCheck, Wrench, DollarSign, Award,
  Beaker, FlaskConical, Recycle, Info, CheckCircle2, XCircle, Printer,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type FilterType = {
  name: string
  icon: string
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
    icon: 'pitcher',
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
    icon: 'ro',
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
    icon: 'whole-house',
    costRange: '$500–$3,000+ upfront, $100–$300/year maintenance',
    maintenance: 'Replace media annually, professional service recommended',
    effectiveness: { lead: 'medium', chlorine: 'high', pfas: 'low', microplastics: 'low', thm: 'high', arsenic: 'none' },
    description: 'Treats all water entering the home. Good for chlorine, sediment, and scale. Does NOT effectively remove lead, PFAS, or microplastics — pair with a point-of-use system for drinking water.',
    certifications: ['NSF/ANSI 42 (taste/odor)', 'NSF/ANSI 44 (cation exchange)'],
    pros: ['Treats all water (showers, laundry, etc.)', 'Reduces chlorine exposure from bathing', 'Protects plumbing from scale'],
    cons: ['Expensive upfront', 'Doesn\'t remove lead/PFAS/microplastics', 'Requires professional installation', 'Ongoing maintenance'],
  },
  {
    name: 'Distillation',
    icon: 'distill',
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
    icon: 'ceramic',
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

import { AlertTriangle } from 'lucide-react'

export function TreatmentTipsSection() {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    if (!q.trim()) return FILTER_TYPES
    const term = q.toLowerCase()
    return FILTER_TYPES.filter((f) =>
      f.name.toLowerCase().includes(term) ||
      f.description.toLowerCase().includes(term) ||
      f.pros.some((p) => p.toLowerCase().includes(term)) ||
      f.cons.some((c) => c.toLowerCase().includes(term))
    )
  }, [q])

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
              <Filter className="mr-1 h-3 w-3" />
              Water treatment guide
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Filter the right way
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Not all filters remove all contaminants. Find the right filtration
              system for what&apos;s in your water — with effectiveness ratings,
              NSF certifications, and cost estimates.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Important notice */}
        <div className="mb-8 flex items-start gap-3 rounded-xl border border-amber-300/60 bg-amber-50 p-4 dark:border-amber-500/30 dark:bg-amber-950/30">
          <Info className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div className="text-sm">
            <span className="font-medium text-foreground">Before you buy: </span>
            <span className="text-muted-foreground">
              Check your utility&apos;s contaminant breakdown first (search your ZIP on the home page).
              Different filters target different contaminants — there is no one-size-fits-all solution.
              Look for NSF/ANSI certifications to verify a filter actually does what it claims.
            </span>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search filter types..."
            className="pl-9"
          />
        </div>

        {/* Filter cards */}
        <div className="space-y-6">
          {filtered.map((filter, i) => (
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
              — packaging claims are not always verified.
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
                Microplastics are particles, not dissolved chemicals — so filtration works differently.
                Reverse osmosis, ceramic filters, and distillation are most effective (they physically block particles).
                Activated carbon pitchers help but vary by pore size. For nanoplastics (&lt;1µm), only reverse osmosis
                and distillation are reliable. Avoid single-use plastic bottles — a 2024 study found bottled water
                contains ~110,000–370,000 particles/L, far more than tap.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
