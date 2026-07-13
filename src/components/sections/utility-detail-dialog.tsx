'use client'

import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Building2, MapPin, Users, Globe, AlertTriangle, ShieldCheck,
  TrendingUp, FlaskConical, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { UtilityWithStats } from '@/lib/types'
import { ContaminantTrendChart } from '@/components/charts/contaminant-trend-chart'
import { ContaminantBarChart } from '@/components/charts/contaminant-bar-chart'

export function UtilityDetailDialog({
  utility,
  onClose,
}: {
  utility: UtilityWithStats | null
  onClose: () => void
}) {
  return (
    <AnimatePresence>
      {utility && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-background shadow-2xl sm:max-w-4xl sm:rounded-2xl"
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="relative shrink-0 overflow-hidden bg-water-surface px-5 py-6 text-primary-foreground sm:px-7">
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30"
              >
                <X className="h-4 w-4" />
              </button>
              <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <MapPin className="h-3 w-3" />
                {utility.city}, {utility.state} · PWSID {utility.pwsid}
              </div>
              <h2 className="mt-1.5 pr-10 text-xl font-bold leading-tight sm:text-2xl">
                {utility.name}
              </h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                <Badge className="bg-white/20 text-white hover:bg-white/20">
                  <Building2 className="mr-1 h-3 w-3" />
                  {utility.systemType}
                </Badge>
                <Badge className="bg-white/20 text-white hover:bg-white/20">
                  {utility.sourceType} source
                </Badge>
                <Badge className="bg-white/20 text-white hover:bg-white/20">
                  {utility.treatmentStatus}
                </Badge>
                <Badge className="bg-white/20 text-white hover:bg-white/20">
                  <Users className="mr-1 h-3 w-3" />
                  {utility.population.toLocaleString()} served
                </Badge>
              </div>
            </div>

            {/* Body */}
            <ScrollArea className="flex-1 scroll-area">
              <div className="space-y-6 p-5 sm:p-7">
                {/* Summary stats */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <StatTile
                    label="Contaminants"
                    value={utility.contaminantSummaries.length.toString()}
                    icon={FlaskConical}
                  />
                  <StatTile
                    label="Samples"
                    value={utility.totalSamples.toString()}
                    icon={TrendingUp}
                  />
                  <StatTile
                    label="Above health guideline"
                    value={utility.healthExceedances.toString()}
                    icon={AlertTriangle}
                    tone={utility.healthExceedances > 0 ? 'warning' : 'ok'}
                  />
                  <StatTile
                    label="Above legal limit"
                    value={utility.exceedances.toString()}
                    icon={ShieldCheck}
                    tone={utility.exceedances > 0 ? 'danger' : 'ok'}
                  />
                </div>

                {utility.notes && (
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                    <Info className="mr-1.5 inline h-3.5 w-3.5" />
                    {utility.notes}
                  </div>
                )}

                {utility.website && (
                  <div className="text-sm">
                    <a
                      href={utility.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-primary hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />
                      Visit utility website
                    </a>
                  </div>
                )}

                {/* Bar chart comparing all contaminants */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <FlaskConical className="h-4 w-4 text-primary" />
                      Latest measurements vs health &amp; legal limits
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ContaminantBarChart summaries={utility.contaminantSummaries} />
                  </CardContent>
                </Card>

                {/* Per-contaminant detail list */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Contaminant breakdown
                  </h3>
                  {utility.contaminantSummaries.map((s) => (
                    <ContaminantDetailCard key={s.contaminant.id} summary={s} />
                  ))}
                </div>

                <Separator />
                <p className="text-xs text-muted-foreground">
                  Health guidelines reflect EWG / independent research thresholds.
                  Legal limits reflect EPA Maximum Contaminant Levels (MCLs).
                  Microplastics are currently <strong>unregulated</strong> in the
                  US — there is no federal legal limit. Always cross-reference
                  with your utility&apos;s annual Consumer Confidence Report (CCR).
                </p>
              </div>
            </ScrollArea>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function StatTile({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string
  value: string
  icon: React.ElementType
  tone?: 'default' | 'ok' | 'warning' | 'danger'
}) {
  const toneCls =
    tone === 'warning'
      ? 'text-amber-600'
      : tone === 'danger'
      ? 'text-rose-600'
      : tone === 'ok'
      ? 'text-emerald-600'
      : 'text-foreground'
  const iconCls =
    tone === 'warning'
      ? 'bg-amber-100 text-amber-600'
      : tone === 'danger'
      ? 'bg-rose-100 text-rose-600'
      : tone === 'ok'
      ? 'bg-emerald-100 text-emerald-600'
      : 'bg-primary/10 text-primary'
  return (
    <div className="rounded-xl border border-border/60 bg-card p-3">
      <div className={`mb-1.5 inline-flex h-7 w-7 items-center justify-center rounded-md ${iconCls}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>
      <div className={`text-lg font-bold tabular-nums ${toneCls}`}>{value}</div>
      <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
    </div>
  )
}

function ContaminantDetailCard({
  summary,
}: {
  summary: UtilityWithStats['contaminantSummaries'][number]
}) {
  const { contaminant: c, latestLevel, unit, exceedsHealthGuideline, exceedsLegalLimit, healthRatio } = summary

  const status = exceedsLegalLimit
    ? { label: 'Above legal limit', tone: 'danger' as const }
    : exceedsHealthGuideline
    ? { label: 'Above health guideline', tone: 'warning' as const }
    : { label: 'Within guidelines', tone: 'ok' as const }

  const statusCls =
    status.tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700'
      : status.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700'

  // Health ratio progress (capped at 1000x for display)
  const ratioForBar = healthRatio ? Math.min(Math.log10(Math.max(healthRatio, 1)) * 33, 100) : null

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
              {!c.regulated && (
                <Badge variant="outline" className="bg-amber-50 text-[10px] text-amber-700">
                  Unregulated
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {c.category}
              {c.chemicalName ? ` · ${c.chemicalName}` : ''}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCls}`}
          >
            {status.tone === 'danger' && <AlertTriangle className="h-3 w-3" />}
            {status.tone === 'warning' && <AlertTriangle className="h-3 w-3" />}
            {status.tone === 'ok' && <ShieldCheck className="h-3 w-3" />}
            {status.label}
          </span>
        </div>

        {/* Level vs benchmarks */}
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Latest
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-foreground">
              {latestLevel.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Health guideline
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-foreground">
              {c.healthGuideline != null ? (
                <>
                  {c.healthGuideline} <span className="text-[10px] font-normal text-muted-foreground">{c.healthGuidelineUnit ?? unit}</span>
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Legal limit (MCL)
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-foreground">
              {c.legalLimit != null ? (
                <>
                  {c.legalLimit} <span className="text-[10px] font-normal text-muted-foreground">{c.legalLimitUnit ?? unit}</span>
                </>
              ) : (
                <span className="text-muted-foreground">Not regulated</span>
              )}
            </div>
          </div>
        </div>

        {/* Health ratio bar */}
        {healthRatio != null && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>vs health guideline</span>
              <span className={healthRatio > 1 ? 'font-semibold text-amber-600' : 'text-emerald-600'}>
                {healthRatio >= 100
                  ? `${Math.round(healthRatio)}× higher`
                  : healthRatio >= 1
                  ? `${healthRatio.toFixed(1)}× higher`
                  : `${(healthRatio * 100).toFixed(0)}% of guideline`}
              </span>
            </div>
            <Progress
              value={ratioForBar ?? 0}
              className={`h-1.5 ${
                status.tone === 'danger'
                  ? '[&>[data-slot=progress-indicator]]:bg-rose-500'
                  : status.tone === 'warning'
                  ? '[&>[data-slot=progress-indicator]]:bg-amber-500'
                  : '[&>[data-slot=progress-indicator]]:bg-emerald-500'
              }`}
            />
          </div>
        )}

        {/* Trend chart */}
        {summary.trend.length > 1 && (
          <div className="mt-3">
            <ContaminantTrendChart
              data={summary.trend}
              unit={unit}
              healthGuideline={c.healthGuideline ?? undefined}
              legalLimit={c.legalLimit ?? undefined}
            />
          </div>
        )}

        {c.description && (
          <p className="mt-3 text-xs text-muted-foreground">{c.description}</p>
        )}
        {c.healthEffects && (
          <p className="mt-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Health effects: </span>
            {c.healthEffects}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
