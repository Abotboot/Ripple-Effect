'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Search, Beaker, Scale, Droplets, FlaskConical, ShieldAlert,
  AlertTriangle, Info, Microscope, Waves,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

type GlossaryTerm = {
  term: string
  category: 'Unit' | 'Regulation' | 'Contaminant' | 'Method' | 'Health'
  definition: string
  example?: string
}

const GLOSSARY: GlossaryTerm[] = [
  // Units
  { term: 'ppb', category: 'Unit', definition: 'Parts per billion. A concentration unit equal to 1 microgram of a substance per liter of water (µg/L). Used for most trace contaminants like lead and arsenic.', example: '10 ppb arsenic = 10 micrograms of arsenic in every liter of water.' },
  { term: 'ppm', category: 'Unit', definition: 'Parts per million. Equal to 1 milligram per liter (mg/L). Used for higher-concentration contaminants like nitrate and chlorine.', example: '10 ppm nitrate = 10 mg of nitrate per liter of water.' },
  { term: 'ppt', category: 'Unit', definition: 'Parts per trillion. Equal to 1 nanogram per liter (ng/L). Used for ultra-trace contaminants like PFAS.', example: '4 ppt PFOA = 4 nanograms of PFOA per liter — about 4 drops in an Olympic pool.' },
  { term: 'particles/L', category: 'Unit', definition: 'Number of microplastic particles per liter of water. The standard unit for microplastic concentration since there is no mass-based standard.', example: '5 particles/L means 5 microplastic pieces detected in one liter.' },
  { term: 'µg/L', category: 'Unit', definition: 'Micrograms per liter. Numerically equal to ppb. Common in lab reports.', example: '15 µg/L lead = 15 ppb lead.' },

  // Regulation
  { term: 'MCL', category: 'Regulation', definition: 'Maximum Contaminant Limit. The EPA-enforced legal limit for a contaminant in public drinking water. Utilities must keep levels at or below the MCL.', example: 'The MCL for lead is 15 ppb (action level); for arsenic it is 10 ppb.' },
  { term: 'MCLG', category: 'Regulation', definition: 'Maximum Contaminant Level Goal. A non-enforceable health goal — the level of a contaminant below which there is no known or expected health risk. Often lower than the MCL.', example: 'The MCLG for lead is 0 (no safe level), though the MCL is 15 ppb.' },
  { term: 'Action Level', category: 'Regulation', definition: 'A concentration that triggers treatment or other requirements. For lead and copper, utilities must take action if more than 10% of tap samples exceed the action level.', example: 'Lead action level = 15 ppb; copper action level = 1.3 ppm.' },
  { term: 'CCR', category: 'Regulation', definition: 'Consumer Confidence Report. An annual water quality report that all community water systems must provide to their customers. Shows detected contaminants and compliance status.', example: 'Your utility\'s CCR is usually mailed or posted online every July.' },
  { term: 'UCMR', category: 'Regulation', definition: 'Unregulated Contaminant Monitoring Rule. An EPA program requiring public water systems to test for contaminants that don\'t yet have MCLs. UCMR 5 (2023-2025) includes 29 PFAS compounds and lithium.', example: 'Microplastics are NOT yet on the UCMR list.' },
  { term: 'SDWIS', category: 'Regulation', definition: 'Safe Drinking Water Information System. The EPA\'s federal database tracking public water system compliance and violations. PWSIDs map to SDWIS records.', example: 'Every utility in this database has a PWSID that maps to an SDWIS record.' },
  { term: 'PWSID', category: 'Regulation', definition: 'Public Water System Identification. A unique alphanumeric ID assigned by the EPA to every regulated public water system.', example: 'IL0316040 = Chicago Department of Water Management.' },
  { term: 'ECHO', category: 'Regulation', definition: 'Enforcement and Compliance History Online. An EPA tool for searching compliance and enforcement data for water systems, including inspections and formal actions.' },

  // Contaminants
  { term: 'PFAS', category: 'Contaminant', definition: 'Per- and polyfluoroalkyl substances. A family of thousands of synthetic "forever chemicals" used in nonstick coatings, stain repellents, and firefighting foam. Extremely persistent in the environment and human body. EPA set the first MCLs for PFOA and PFOS at 4 ppt in 2024.', example: 'PFOA, PFOS, GenX, and PFBS are all PFAS compounds.' },
  { term: 'PFOA', category: 'Contaminant', definition: 'Perfluorooctanoic acid. A PFAS compound used in Teflon manufacturing. Linked to kidney/testicular cancer, thyroid disease, and immune suppression. MCL: 4 ppt.' },
  { term: 'PFOS', category: 'Contaminant', definition: 'Perfluorooctane sulfonate. A PFAS compound used in Scotchgard and firefighting foam (AFFF). Linked to liver damage and immune effects. MCL: 4 ppt.' },
  { term: 'TTHM', category: 'Contaminant', definition: 'Total Trihalomethanes. A group of 4 disinfection byproducts (chloroform, bromodichloromethane, dibromochloromethane, bromoform) formed when chlorine reacts with organic matter. MCL: 80 ppb. Linked to bladder cancer.' },
  { term: 'HAA5', category: 'Contaminant', definition: 'Haloacetic Acids (5 species). A group of disinfection byproducts formed during chlorination. MCL: 60 ppb. Linked to cancer and developmental harm.' },
  { term: 'Chromium-6', category: 'Contaminant', definition: 'Hexavalent chromium. The cancer-causing chemical made famous by Erin Brockovich. Regulated only as total chromium (MCL 100 ppb), though the health guideline is 0.02 ppb.' },
  { term: 'Microplastics', category: 'Contaminant', definition: 'Plastic particles smaller than 5mm. Found in drinking water worldwide. Currently UNREGULATED in the US — no EPA MCL, no routine monitoring requirement. A Ripples Effect tracks these because almost no other public database does.' },
  { term: 'Nanoplastics', category: 'Contaminant', definition: 'Plastic particles smaller than 1 micrometer (down to 1 nanometer). Can cross cellular barriers. A 2024 Columbia University study found ~110,000-370,000 particles/L in bottled water.' },
  { term: 'Disinfection byproducts', category: 'Contaminant', definition: 'Chemicals formed when disinfectants (chlorine, chloramine) react with natural organic matter in source water. Include TTHMs and HAA5. Levels rise during warm seasons.' },
  { term: 'Lead', category: 'Contaminant', definition: 'A neurotoxic heavy metal that enters drinking water through corrosion of plumbing (lead service lines, brass fixtures, solder). Especially harmful to children — causes irreversible neurological damage. No safe level exists. Action level: 15 ppb; health guideline: 0.2 ppb.' },
  { term: 'Arsenic', category: 'Contaminant', definition: 'A naturally occurring carcinogenic element found in bedrock. Enters groundwater through natural erosion. MCL: 10 ppb; health guideline: 0.004 ppb. Linked to skin, bladder, and lung cancer.' },

  // Methods
  { term: 'Grab sample', category: 'Method', definition: 'A single water sample collected at a specific time and place. Most common sampling method for drinking water testing.' },
  { term: 'Composite sample', category: 'Method', definition: 'A sample created by mixing multiple grab samples collected over time or from different locations. Gives an average concentration.' },
  { term: 'Log scale', category: 'Method', definition: 'A logarithmic scale used to visualize data that spans many orders of magnitude. Our contaminant charts use log scale because levels range from 0.02 ppt to 80 ppb.' },
  { term: 'Detection limit', category: 'Method', definition: 'The lowest concentration of a contaminant that a lab method can reliably measure. Below the detection limit = "not detected" (ND).' },
  { term: 'Citizen science', category: 'Method', definition: 'Data collection by community members rather than official labs. A Ripples Effect accepts citizen readings (tagged with quality=citizen) to fill geographic gaps. Clearly labeled and never presented as verified.' },

  // Health
  { term: 'Health guideline', category: 'Health', definition: 'A concentration below which no adverse health effects are expected, based on independent research (often EWG or state agencies). Usually stricter than the legal MCL, which is set considering treatment cost and feasibility.', example: 'Lead health guideline = 0.2 ppb, but MCL = 15 ppb.' },
  { term: 'EWG', category: 'Health', definition: 'Environmental Working Group. A non-profit that maintains a tap water database with health guidelines often stricter than EPA limits. Their guidelines are based on independent scientific reviews.' },
  { term: 'Endocrine disruptor', category: 'Health', definition: 'A chemical that interferes with the hormone system at very low doses. Linked to reproductive harm, developmental issues, and certain cancers. Atrazine and BPA are examples.' },
  { term: 'Bioaccumulation', category: 'Health', definition: 'The gradual accumulation of a substance in an organism\'s body over time. PFAS bioaccumulate because they don\'t break down — levels build up with continued exposure.' },
  { term: 'Carcinogen', category: 'Health', definition: 'A substance known or suspected to cause cancer. EPA classifies carcinogens as known, probable, or possible human carcinogens. Arsenic and chromium-6 are known human carcinogens.' },
]

const CATEGORY_CONFIG: Record<GlossaryTerm['category'], { icon: React.ElementType; color: string }> = {
  Unit: { icon: Beaker, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
  Regulation: { icon: Scale, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  Contaminant: { icon: FlaskConical, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
  Method: { icon: Microscope, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  Health: { icon: ShieldAlert, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
}

export function GlossarySection() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | GlossaryTerm['category']>('all')

  const filtered = useMemo(() => {
    return GLOSSARY.filter((t) => {
      if (filter !== 'all' && t.category !== filter) return false
      if (q.trim()) {
        const term = q.toLowerCase()
        return (
          t.term.toLowerCase().includes(term) ||
          t.definition.toLowerCase().includes(term) ||
          (t.example ?? '').toLowerCase().includes(term)
        )
      }
      return true
    }).sort((a, b) => a.term.localeCompare(b.term))
  }, [q, filter])

  const categories: Array<{ id: 'all' | GlossaryTerm['category']; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'Unit', label: 'Units' },
    { id: 'Regulation', label: 'Regulation' },
    { id: 'Contaminant', label: 'Contaminants' },
    { id: 'Method', label: 'Methods' },
    { id: 'Health', label: 'Health' },
  ]

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
              <BookOpen className="mr-1 h-3 w-3" />
              Water quality glossary
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Decode the jargon
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              MCL, ppb, PFAS, TTHM — water quality reports are full of acronyms.
              Here&apos;s what they all mean, in plain English.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Search + filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search terms..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
            {categories.map((c) => (
              <button
                key={c.id}
                onClick={() => setFilter(c.id)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  filter === c.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {GLOSSARY.length} terms
        </p>

        {/* Terms grid */}
        <motion.div
          className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          initial="hidden"
          animate="show"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.03 } } }}
        >
          {filtered.map((t) => {
            const cat = CATEGORY_CONFIG[t.category]
            const Icon = cat.icon
            return (
              <motion.div
                key={t.term}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              >
                <Card className="h-full transition-all hover:border-primary/40 hover:shadow-md">
                  <CardContent className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base font-semibold text-foreground">{t.term}</h3>
                      <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium', cat.color)}>
                        <Icon className="h-2.5 w-2.5" />
                        {t.category}
                      </span>
                    </div>
                    <p className="mt-2 flex-1 text-sm text-muted-foreground">{t.definition}</p>
                    {t.example && (
                      <div className="mt-3 rounded-lg bg-muted/40 p-2.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Example: </span>
                        {t.example}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </motion.div>

        {filtered.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No terms match &ldquo;{q}&rdquo;. Try a different search.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Info callout */}
        <Card className="mt-8 border-primary/20 bg-primary/5">
          <CardContent className="flex items-start gap-3 p-5">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium text-foreground">Why this matters</p>
              <p className="mt-1 text-muted-foreground">
                Water quality data is only useful if you can understand it. We
                define every term used in this database so you can make informed
                decisions about your water. If a term is missing,{' '}
                <a href="mailto:rippleeffectoffice@gmail.com" className="font-medium text-primary hover:underline">
                  let us know
                </a>{' '}
                and we&apos;ll add it.
              </p>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
