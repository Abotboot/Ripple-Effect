'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, Search, ShieldCheck, AlertTriangle, Microscope, Eye } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Contaminant } from '@/lib/types'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  Microplastic: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
  PFAS: 'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800',
  Metal: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
  'Disinfection Byproduct': 'bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/50 dark:text-cyan-300 dark:border-cyan-800',
  Pesticide: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
  Agricultural: 'bg-lime-100 text-lime-700 border-lime-200 dark:bg-lime-950/50 dark:text-lime-300 dark:border-lime-800',
  Radioactive: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/50 dark:text-orange-300 dark:border-orange-800',
  Disinfectant: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
  Microbial: 'bg-pink-100 text-pink-700 border-pink-200 dark:bg-pink-950/50 dark:text-pink-300 dark:border-pink-800',
  Other: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/50 dark:text-slate-300 dark:border-slate-700',
}

export function ContaminantExplorerSection() {
  const [contaminants, setContaminants] = useState<Contaminant[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'regulated' | 'unregulated' | 'tracked' | 'plastic'>('all')

  useEffect(() => {
    api.listContaminants().then(setContaminants).catch(() => setContaminants([]))
  }, [])

  const categories = useMemo(() => {
    if (!contaminants) return []
    return Array.from(new Set(contaminants.map((c) => c.category)))
  }, [contaminants])

  const [selectedCat, setSelectedCat] = useState<string>('all')

  const filtered = useMemo(() => {
    if (!contaminants) return []
    return contaminants.filter((c) => {
      if (filter === 'regulated' && !c.regulated) return false
      if (filter === 'unregulated' && c.regulated) return false
      if (filter === 'tracked' && !c.trackedByUs) return false
      if (filter === 'plastic' && c.category !== 'Microplastic') return false
      if (selectedCat !== 'all' && c.category !== selectedCat) return false
      if (q.trim()) {
        const term = q.toLowerCase()
        return (
          c.name.toLowerCase().includes(term) ||
          c.category.toLowerCase().includes(term) ||
          (c.chemicalName ?? '').toLowerCase().includes(term) ||
          (c.description ?? '').toLowerCase().includes(term)
        )
      }
      return true
    })
  }, [contaminants, q, filter, selectedCat])

  // Split: microplastics (featured, first) vs the rest
  const featured = filtered.find((c) => c.slug === 'microplastics')
  const rest = filtered.filter((c) => c.slug !== 'microplastics')

  return (
    <div className="bg-water-hero">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <FlaskConical className="mr-1 h-3 w-3" />
            Contaminant catalog
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Every contaminant we track
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            From regulated metals like lead and arsenic to emerging threats like
            microplastics and PFAS &quot;forever chemicals.&quot; Each entry includes
            EPA limits, EWG health guidelines, and known health effects.
          </p>
        </div>

        {/* Distinction banner: microplastics is first because almost no one else tracks it */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-amber-300/60 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 p-5 dark:border-amber-500/30 dark:from-amber-950/40 dark:via-orange-950/30 dark:to-amber-950/40">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white shadow-md shadow-amber-500/30">
              <Microscope className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-bold text-foreground sm:text-base">
                Microplastics is listed first on purpose.
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Almost no public drinking-water database tracks microplastics
                (no EPA limit, no routine monitoring). We do. Look for the{' '}
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                  <Eye className="h-2.5 w-2.5" /> Tracked by us
                </span>{' '}
                badge on contaminants we actively follow that other databases miss.
              </p>
            </div>
          </div>
        </div>

        {/* Filter bar */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search contaminants..."
              className="pl-9"
            />
          </div>
          <div className="flex flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
            {([
              ['all', 'All'],
              ['tracked', 'Tracked by us'],
              ['plastic', 'Plastics'],
              ['regulated', 'Regulated'],
              ['unregulated', 'Unregulated'],
            ] as const).map(([f, label]) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Category filter chips */}
        {categories.length > 0 && (
          <div className="mb-6 flex flex-wrap gap-1.5">
            <button
              onClick={() => setSelectedCat('all')}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                selectedCat === 'all'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-card text-muted-foreground hover:text-foreground'
              )}
            >
              All categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={cn(
                  'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                  selectedCat === cat
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border bg-card text-muted-foreground hover:text-foreground'
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Featured: microplastics first */}
        {!contaminants ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="mt-2 h-4 w-1/3" />
                  <Skeleton className="mt-4 h-16 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
            <p className="text-sm text-muted-foreground">
              No contaminants match your filters.
            </p>
          </div>
        ) : (
          <>
            {featured && (
              <div className="mb-6">
                <FeaturedMicroplasticsCard contaminant={featured} />
              </div>
            )}
            {rest.length > 0 && (
              <motion.div
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              >
                {rest.map((c) => (
                  <motion.div
                    key={c.id}
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                  >
                    <ContaminantCard contaminant={c} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </>
        )}
      </section>
    </div>
  )
}

function FeaturedMicroplasticsCard({ contaminant: c }: { contaminant: Contaminant }) {
  return (
    <Card className="overflow-hidden border-amber-300/60 bg-gradient-to-br from-amber-50 to-orange-50 dark:border-amber-500/40 dark:from-amber-950/30 dark:to-orange-950/20">
      <CardContent className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-500 text-white shadow-lg shadow-amber-500/30">
            <Microscope className="h-7 w-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-xl font-bold text-foreground">{c.name}</h3>
              <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                #1 — We track this
              </span>
            </div>
            {c.chemicalName && (
              <p className="mt-0.5 text-xs text-muted-foreground">{c.chemicalName}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="rounded-md border border-amber-300 bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                {c.category}
              </span>
              <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
                <AlertTriangle className="mr-1 h-3 w-3" />
                Unregulated
              </Badge>
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                <Eye className="h-2.5 w-2.5" /> Tracked by us
              </span>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              {c.description ?? 'No description available.'}
            </p>
            {c.rarityNote && (
              <div className="mt-3 rounded-lg border border-amber-300/60 bg-white/60 p-3 text-xs text-amber-900 dark:border-amber-700/50 dark:bg-black/20 dark:text-amber-200">
                <span className="font-semibold">Why we track it: </span>
                {c.rarityNote}
              </div>
            )}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-md bg-amber-100/60 p-2 dark:bg-amber-950/40">
                <div className="text-[10px] uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">
                  Health guideline
                </div>
                <div className="mt-0.5 font-semibold tabular-nums text-amber-900 dark:text-amber-200">
                  {c.healthGuideline != null && c.healthGuideline > 0
                    ? `${c.healthGuideline} ${c.healthGuidelineUnit ?? ''}`
                    : 'None set'}
                </div>
              </div>
              <div className="rounded-md bg-rose-100/60 p-2 dark:bg-rose-950/40">
                <div className="text-[10px] uppercase tracking-wide text-rose-700/80 dark:text-rose-400/80">
                  Legal limit
                </div>
                <div className="mt-0.5 font-semibold tabular-nums text-rose-900 dark:text-rose-200">
                  {c.legalLimit != null
                    ? `${c.legalLimit} ${c.legalLimitUnit ?? ''}`
                    : 'None (unregulated)'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function ContaminantCard({ contaminant: c }: { contaminant: Contaminant }) {
  const catColor = CATEGORY_COLORS[c.category] ?? CATEGORY_COLORS.Other
  return (
    <Card className="flex h-full flex-col overflow-hidden transition-all hover:border-primary/40 hover:shadow-md">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-tight text-foreground">{c.name}</h3>
            {c.chemicalName && (
              <p className="mt-0.5 text-xs text-muted-foreground">{c.chemicalName}</p>
            )}
          </div>
          <span className={cn('rounded-md border px-2 py-0.5 text-[10px] font-medium', catColor)}>
            {c.category}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.regulated ? (
            <Badge variant="outline" className="bg-emerald-50 text-[10px] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
              <ShieldCheck className="mr-1 h-3 w-3" />
              EPA regulated
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Unregulated
            </Badge>
          )}
          {c.trackedByUs && (
            <span className="inline-flex items-center gap-1 rounded-md border border-amber-400 bg-amber-500 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              <Eye className="h-2.5 w-2.5" /> Tracked by us
            </span>
          )}
        </div>

        <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
          {c.description ?? 'No description available.'}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4 text-xs">
          <div className="rounded-md bg-amber-50 p-2 dark:bg-amber-950/30">
            <div className="text-[10px] uppercase tracking-wide text-amber-700/80 dark:text-amber-400/80">
              Health guideline
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-amber-900 dark:text-amber-200">
              {c.healthGuideline != null && c.healthGuideline > 0
                ? `${c.healthGuideline} ${c.healthGuidelineUnit ?? ''}`
                : '—'}
            </div>
          </div>
          <div className="rounded-md bg-rose-50 p-2 dark:bg-rose-950/30">
            <div className="text-[10px] uppercase tracking-wide text-rose-700/80 dark:text-rose-400/80">
              Legal limit
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-rose-900 dark:text-rose-200">
              {c.legalLimit != null
                ? `${c.legalLimit} ${c.legalLimitUnit ?? ''}`
                : 'None'}
            </div>
          </div>
        </div>

        {c.healthEffects && (
          <p className="mt-3 text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Health effects: </span>
            <span className="line-clamp-2">{c.healthEffects}</span>
          </p>
        )}
      </CardContent>
    </Card>
  )
}
