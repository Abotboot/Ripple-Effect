'use client'

import { useEffect, useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, Search, ShieldCheck, AlertTriangle, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Contaminant } from '@/lib/types'
import { cn } from '@/lib/utils'

const CATEGORY_COLORS: Record<string, string> = {
  Microplastic: 'bg-amber-100 text-amber-700 border-amber-200',
  PFAS: 'bg-rose-100 text-rose-700 border-rose-200',
  Metal: 'bg-purple-100 text-purple-700 border-purple-200',
  'Disinfection Byproduct': 'bg-cyan-100 text-cyan-700 border-cyan-200',
  Pesticide: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Agricultural: 'bg-lime-100 text-lime-700 border-lime-200',
  Radioactive: 'bg-orange-100 text-orange-700 border-orange-200',
  Disinfectant: 'bg-sky-100 text-sky-700 border-sky-200',
  Microbial: 'bg-pink-100 text-pink-700 border-pink-200',
  Other: 'bg-slate-100 text-slate-700 border-slate-200',
}

export function ContaminantExplorerSection() {
  const [contaminants, setContaminants] = useState<Contaminant[] | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'regulated' | 'unregulated'>('all')

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
          <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
            {(['all', 'regulated', 'unregulated'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  filter === f
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {f}
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

        {/* Grid */}
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
          <motion.div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
          >
            {filtered.map((c) => (
              <motion.div
                key={c.id}
                variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
              >
                <ContaminantCard contaminant={c} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </section>
    </div>
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
            <Badge variant="outline" className="bg-emerald-50 text-[10px] text-emerald-700">
              <ShieldCheck className="mr-1 h-3 w-3" />
              EPA regulated
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Unregulated
            </Badge>
          )}
        </div>

        <p className="mt-3 line-clamp-3 text-xs text-muted-foreground">
          {c.description ?? 'No description available.'}
        </p>

        <div className="mt-auto grid grid-cols-2 gap-2 pt-4 text-xs">
          <div className="rounded-md bg-amber-50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-amber-700/80">
              Health guideline
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-amber-900">
              {c.healthGuideline != null
                ? `${c.healthGuideline} ${c.healthGuidelineUnit ?? ''}`
                : '—'}
            </div>
          </div>
          <div className="rounded-md bg-rose-50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-rose-700/80">
              Legal limit
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-rose-900">
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
