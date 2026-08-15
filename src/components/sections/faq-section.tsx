'use client'

import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  HelpCircle, Search, ChevronDown, Droplets, Microscope, ShieldCheck,
  Beaker, AlertTriangle, Heart, Mail, ExternalLink,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'

type FAQItem = {
  id: string
  question: string
  answer: string
  category: 'General' | 'Microplastics' | 'Data' | 'Health' | 'Get involved'
}

const FAQS: FAQItem[] = [
  // General
  { id: 'g1', category: 'General', question: 'What is A Ripple Effect Initiative?', answer: 'A Ripple Effect Initiative is a community-built freshwater and microplastics database. We collect, organize, and publish water quality data so anyone can see what is in the rivers, lakes, and streams near them — including microplastics, which almost no other public database tracks. We are a volunteer non-profit running the 2026 Water Project.' },
  { id: 'g2', category: 'General', question: 'Is the data free to use?', answer: 'Yes. All data in this database is open and freely downloadable. Use the Download open data link in the footer to export utilities, contaminants, samples, and reports as CSV or JSON. We ask that you credit A Ripple Effect Initiative and link back to the site when possible.' },
  { id: 'g3', category: 'General', question: 'How is this different from the EWG Tap Water Database?', answer: 'EWG is a great resource and one of our data sources. The key differences: we focus on freshwater (untreated source water, not just what comes out of the tap), we track microplastics, which EWG does not, and we accept citizen-submitted readings. Think of us as EWG + microplastics + community science.' },
  { id: 'g4', category: 'General', question: 'How do I search for my water?', answer: 'Use the search bar on the home page. Enter your ZIP code, city name, state abbreviation, or utility name. You can also press Cmd+K (Mac) or Ctrl+K (Windows) anywhere on the site to open the command palette for quick search and navigation.' },

  // Microplastics
  { id: 'm1', category: 'Microplastics', question: 'Why doesn\'t the EPA regulate microplastics?', answer: 'The EPA regulates approximately 90 contaminants in drinking water, but microplastics are not among them. There is no federal Maximum Contaminant Limit (MCL) and no routine monitoring requirement. The EPA has not concluded that regulation is warranted, citing limited evidence on health effects, though the WHO called for more research in its 2019 report. This is why almost no public water database includes microplastics data — and why A Ripple Effect Initiative tracks it anyway.' },
  { id: 'm2', category: 'Microplastics', question: 'Are microplastics harmful to human health?', answer: 'The science is still emerging. The WHO\'s 2019 report concluded there was insufficient evidence to determine a significant human health risk, but recommended more research. Studies have linked microplastic ingestion to inflammation, endocrine disruption, and cellular damage in lab settings. Particle size matters — nanoplastics (smaller than 1 micrometer) can cross cellular barriers. We track the data so researchers and the public can see what is actually in the water.' },
  { id: 'm3', category: 'Microplastics', question: 'How do microplastics get into freshwater?', answer: 'Microplastics enter rivers, lakes, and streams from many sources: breakdown of plastic packaging, synthetic textile fibers shed during washing, tire wear particles washed into waterways, microbeads (now banned in rinse-off cosmetics but persisting in the environment), and degradation of larger plastic debris. Conventional water treatment removes a significant fraction but not all — which is why we measure the untreated source.' },
  { id: 'm4', category: 'Microplastics', question: 'What is the microplastics identifier?', answer: 'The microplastics identifier is a low-cost device our crew is designing. Volunteers dip the identifier into local freshwater (a stream, river, lake, or reservoir), and the reading flows into this public database. A companion mobile app is planned so volunteers can push readings directly from the field.' },

  // Data
  { id: 'd1', category: 'Data', question: 'Where does the data come from?', answer: 'We aggregate data from multiple sources: the EWG Tap Water Database, EPA SDWIS (Safe Drinking Water Information System), EPA UCMR (Unregulated Contaminant Monitoring Rule), USGS NWIS, EPA ECHO, and CDC. We also accept citizen-submitted readings through our Submit a Reading form. See the Data Sources page for the full list with links.' },
  { id: 'd2', category: 'Data', question: 'How accurate is the data?', answer: 'Every measurement is tagged with a quality level: Verified (from a utility, EPA program, or certified lab), Provisional (from a research lab, pending full verification), or Citizen (submitted by a community member). We never present unverified data as official. The data quality badge appears next to every reading so you always know the source.' },
  { id: 'd3', category: 'Data', question: 'What is the water safety score?', answer: 'The safety score is a composite 0-100 metric we compute for each utility. It starts at 100 and deducts points for legal limit exceedances (-15 each, capped at -60), health guideline exceedances (-6 each, capped at -30), and low data confidence. The score includes a grade (A-F) and a label (Excellent, Good, Concerning, Poor, Critical). It is a simplified metric for quick comparison — always read the full contaminant breakdown for the complete picture.' },
  { id: 'd4', category: 'Data', question: 'Can I submit my own reading?', answer: 'Yes! Use the Submit Reading page. You will need a microplastics identifier (from one of our kits or your own setup), select the contaminant and water source, enter the measured level, and provide your name and email for verification. Your reading is tagged as Citizen quality and appears in the database immediately. Rate limit: 10 readings per email per 24 hours.' },

  // Health
  { id: 'h1', category: 'Health', question: 'What is the difference between a health guideline and a legal limit?', answer: 'A legal limit (MCL) is the EPA-enforced maximum concentration allowed in public drinking water. A health guideline is a concentration below which no adverse health effects are expected, based on independent research (often from EWG). Health guidelines are usually much stricter than legal limits because legal limits also consider treatment cost and feasibility. For example, lead\'s legal limit (action level) is 15 ppb, but the health guideline is 0.2 ppb — and no level of lead exposure is considered safe.' },
  { id: 'h2', category: 'Health', question: 'What should I do if my water has contaminants above the health guideline?', answer: 'First, don\'t panic. Health guidelines are very conservative. Consider: (1) Read your utility\'s annual Consumer Confidence Report (CCR) for official context. (2) If levels are above the legal limit, contact your utility and local health department. (3) A certified water filter (look for NSF/ANSI certifications) can reduce many contaminants. (4) For microplastics, a reverse osmosis system or a filter rated for particles below 1 micron can help — see the Filters tab on our Microplastics page.' },
  { id: 'h3', category: 'Health', question: 'Is bottled water safer than tap water?', answer: 'Not necessarily. Bottled water is regulated by the FDA, not the EPA, and is tested less frequently than tap water. A 2024 Columbia University study found an average of 110,000-370,000 microplastic particles per liter in bottled water — far higher than typical tap water. If you are concerned about microplastics, a good filter on your tap is generally more effective and far less wasteful than bottled water.' },

  // Get involved
  { id: 'c1', category: 'Get involved', question: 'How can I contribute data?', answer: 'Head to the Submit a Reading page. Take a measurement from a river, lake, stream, or reservoir near you with a microplastics identifier, enter the level, and it appears in the public database tagged as Citizen quality. Every reading makes the freshwater map clearer.' },
  { id: 'c2', category: 'Get involved', question: 'How do I get an identifier kit?', answer: 'Email us at rippleeffectoffice@gmail.com with your city and the water body you want to test. Our crew will reach out with kit details and onboarding as identifiers become available. No coding or special expertise required — just curiosity and a few minutes a week.' },
  { id: 'c3', category: 'Get involved', question: 'Do I need to be a scientist to contribute?', answer: 'No. The identifier kit comes with a step-by-step protocol. If you can collect a water sample in a clean container and read a number off a device, you can contribute. We provide the kit, the protocol, and the data-entry tools. Students, community groups, and curious individuals are all welcome.' },
  { id: 'c4', category: 'Get involved', question: 'Is the identifier kit free?', answer: 'Kits are free for students and community volunteers while supplies last, funded by donations. If you can contribute, the Donate page supports our crowdfunding campaign for more kits and testing supplies.' },
]

const CATEGORY_CONFIG: Record<FAQItem['category'], { icon: React.ElementType; color: string }> = {
  General: { icon: HelpCircle, color: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300' },
  Microplastics: { icon: Microscope, color: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300' },
  Data: { icon: Beaker, color: 'bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300' },
  Health: { icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300' },
  'Get involved': { icon: Heart, color: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300' },
}

export function FaqSection() {
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | FAQItem['category']>('all')

  const filtered = useMemo(() => {
    return FAQS.filter((f) => {
      if (filter !== 'all' && f.category !== filter) return false
      if (q.trim()) {
        const term = q.toLowerCase()
        return f.question.toLowerCase().includes(term) || f.answer.toLowerCase().includes(term)
      }
      return true
    })
  }, [q, filter])

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<FAQItem['category'], FAQItem[]>()
    for (const f of filtered) {
      const arr = map.get(f.category) ?? []
      arr.push(f)
      map.set(f.category, arr)
    }
    return Array.from(map.entries())
  }, [filtered])

  const categories: Array<{ id: 'all' | FAQItem['category']; label: string }> = [
    { id: 'all', label: 'All' },
    { id: 'General', label: 'General' },
    { id: 'Microplastics', label: 'Microplastics' },
    { id: 'Data', label: 'Data' },
    { id: 'Health', label: 'Health' },
    { id: 'Get involved', label: 'Get involved' },
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
              <HelpCircle className="mr-1 h-3 w-3" />
              Help &amp; FAQ
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Questions, answered
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Everything you need to know about A Ripple Effect Initiative,
              microplastics, freshwater data, and how to get involved.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Search + filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search questions..."
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

        <p className="mb-4 text-sm text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of {FAQS.length} questions
        </p>

        {/* FAQ accordion grouped by category */}
        {grouped.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No questions match &ldquo;{q}&rdquo;. Try a different search or{' '}
                <a href="mailto:rippleeffectoffice@gmail.com" className="font-medium text-primary hover:underline">
                  email us
                </a>
                .
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {grouped.map(([category, items]) => {
              const cat = CATEGORY_CONFIG[category]
              const Icon = cat.icon
              return (
                <div key={category}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', cat.color)}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground">{category}</h2>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <Accordion type="single" collapsible className="space-y-2">
                    {items.map((f) => (
                      <AccordionItem key={f.id} value={f.id} className="overflow-hidden rounded-lg border border-border bg-card px-4">
                        <AccordionTrigger className="text-left text-sm font-medium text-foreground hover:no-underline">
                          {f.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm leading-relaxed text-muted-foreground">
                          {f.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              )
            })}
          </div>
        )}

        {/* Still have questions? */}
        <Card className="mt-10 border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col items-center gap-4 p-6 text-center sm:flex-row sm:text-left">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Mail className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-semibold text-foreground">Still have questions?</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                We are happy to help. Email the crew and we will get back to you.
              </p>
            </div>
            <a
              href="mailto:rippleeffectoffice@gmail.com?subject=Question%20about%20A%20Ripple%20Effect%20Initiative"
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Mail className="h-4 w-4" />
              Email us
              <ExternalLink className="h-3 w-3" />
            </a>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
