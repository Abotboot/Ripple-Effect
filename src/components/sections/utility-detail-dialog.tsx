'use client'

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import {
  X, Building2, MapPin, Globe, AlertTriangle, ShieldCheck,
  TrendingUp, FlaskConical, Info, Download, Share2, Printer,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import type { UtilityWithStats } from '@/lib/types'
import { ContaminantTrendChart } from '@/components/charts/contaminant-trend-chart'
import { ContaminantBarChart } from '@/components/charts/contaminant-bar-chart'
import { QualityBadge } from '@/components/quality-badge'
import { SourceBadge } from '@/components/source-badge'
import { WaterReportCardModal } from '@/components/social/water-report-card-modal'
import { normalizeToBenchmarkUnit } from '@/lib/provenance'
import { hasPublishedScore, summaryPresentation, utilityComparisons } from '@/lib/assessment-presentation'

function escapeHtml(str: unknown): string {
  if (str == null) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSafeUrl(url?: string | null): boolean {
  if (!url) return false
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export function UtilityDetailDialog({
  utility,
  onClose,
}: {
  utility: UtilityWithStats | null
  onClose: () => void
}) {
  const [shareCardOpen, setShareCardOpen] = useState(false)
  const dialog = useRef<HTMLDivElement>(null)
  const closeButton = useRef<HTMLButtonElement>(null)
  const handlers = useRef({ onClose, shareCardOpen })
  const headingId = useId()
  const utilityId = utility?.id
  useLayoutEffect(() => { handlers.current = { onClose, shareCardOpen } }, [onClose, shareCardOpen])
  useEffect(() => {
    if (!utilityId || !dialog.current) return
    const previous = document.activeElement as HTMLElement | null
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeButton.current?.focus({ preventScroll: true })
    const controls = () => [...(dialog.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]') ?? [])]
      .filter(element => element.getClientRects().length > 0 && !element.closest('[hidden], [inert]'))
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault(); event.stopPropagation()
        if (handlers.current.shareCardOpen) { setShareCardOpen(false); closeButton.current?.focus({ preventScroll: true }) }
        else handlers.current.onClose()
      } else if (event.key === 'Tab' && !handlers.current.shareCardOpen) {
        const items = controls(), first = items[0], last = items[items.length - 1]
        if (!first) { event.preventDefault(); dialog.current?.focus(); return }
        if (!dialog.current?.contains(document.activeElement)) { event.preventDefault(); (event.shiftKey ? last : first).focus() }
        else if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    const focus = () => { if (!handlers.current.shareCardOpen && !dialog.current?.contains(document.activeElement)) closeButton.current?.focus({ preventScroll: true }) }
    document.addEventListener('keydown', keyboard, true)
    document.addEventListener('focusin', focus)
    return () => {
      document.removeEventListener('keydown', keyboard, true)
      document.removeEventListener('focusin', focus)
      document.body.style.overflow = previousOverflow
      if (previous?.isConnected) previous.focus?.({ preventScroll: true })
    }
  }, [utilityId])
  const { healthCompared, legalCompared, healthAbove, legalAbove } = utilityComparisons(utility?.contaminantSummaries ?? [])

  if (typeof document === 'undefined') return null
  return createPortal(
    <>
      <AnimatePresence>
        {utility && (
          <motion.div
            data-lenis-prevent
            className="fixed inset-0 z-[110] flex items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <motion.div
              ref={dialog}
              role="dialog"
              aria-modal="true"
              aria-labelledby={headingId}
              tabIndex={-1}
              data-testid="utility-detail-dialog"
              className="relative flex h-[100dvh] sm:h-auto sm:max-h-[88dvh] w-full flex-col overflow-hidden bg-background shadow-2xl sm:max-w-4xl"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="relative shrink-0 overflow-hidden bg-[#203c35] px-5 py-4 pt-[max(16px,env(safe-area-inset-top))] text-[#e5efeb] sm:px-7">
                <div className="mb-3 flex justify-end gap-1.5">
                  <button type="button" onClick={onClose} className="mr-auto flex min-h-11 shrink-0 items-center gap-2 text-sm text-white sm:hidden" aria-label="Back to results">← Back</button>
                  <button
                    onClick={() => setShareCardOpen(true)}
                    aria-label="Share community card"
                    className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30"
                    title="Generate shareable report card"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                <a
                  href={`/api/export?format=csv&table=samples`}
                  onClick={(e) => {
                    e.preventDefault()
                    window.open(`/api/samples?utilityId=${utility.id}&limit=5000`, '_blank')
                  }}
                  aria-label="Download samples"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30"
                  title="Download samples (JSON)"
                >
                  <Download className="h-4 w-4" />
                </a>
                <button
                  onClick={() => {
                    // Open a printable report in a new window
                    const w = window.open('', '_blank', 'width=800,height=900')
                    if (!w) return
                    const score = utility.safetyScore
                    const name = escapeHtml(utility.name)
                    const city = escapeHtml(utility.city)
                    const state = escapeHtml(utility.state)
                    const pwsid = escapeHtml(utility.pwsid)
                    const sourceType = escapeHtml(utility.sourceType)
                    const treatmentStatus = escapeHtml(utility.treatmentStatus)
                    const html = `<!DOCTYPE html><html><head><title>${name} | Water Quality Report</title>
<style>
  body { font-family: -apple-system, system-ui, sans-serif; max-width: 760px; margin: 40px auto; padding: 0 24px; color: #1a1a1a; line-height: 1.6; }
  h1 { color: #0d9488; font-size: 24px; margin-bottom: 4px; }
  h2 { color: #0d9488; font-size: 16px; margin-top: 28px; border-bottom: 2px solid #0d9488; padding-bottom: 4px; }
  .meta { color: #666; font-size: 13px; margin-bottom: 20px; }
  .score { display: inline-block; padding: 8px 16px; border-radius: 8px; font-size: 18px; font-weight: bold; margin: 12px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; margin-top: 8px; }
  th { background: #f0f9f8; text-align: left; padding: 8px; border-bottom: 2px solid #0d9488; }
  td { padding: 6px 8px; border-bottom: 1px solid #e5e5e5; }
  .danger { color: #e11d48; font-weight: bold; }
  .warning { color: #f59e0b; font-weight: bold; }
  .neutral { color: #52525b; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #ccc; font-size: 11px; color: #666; }
  @media print { body { margin: 0; } }
</style></head><body>
<h1>${name}</h1>
<div class="meta">${city}, ${state} · PWSID: ${pwsid}<br>
Source: ${sourceType} · Treatment: ${treatmentStatus}</div>
${hasPublishedScore(score) ? `<div class="score">Water Safety Score: ${score.score}/100 (Grade ${escapeHtml(score.grade)}, ${escapeHtml(score.label)})</div>` : '<div class="score neutral">Safety score not assessed</div>'}
<h2>Summary</h2>
<p>Contaminants tracked: ${utility.contaminantSummaries.length} · Samples: ${utility.totalSamples} · Above health guideline: ${healthCompared ? `${healthAbove} / ${healthCompared} compared` : 'Not assessed'} · Above legal limit: ${legalCompared ? `${legalAbove} / ${legalCompared} compared` : 'Not assessed'}</p>
<h2>Contaminant Breakdown</h2>
<table>
<tr><th>Contaminant</th><th>Latest measurement</th><th>Health comparison</th><th>Legal comparison</th></tr>
${utility.contaminantSummaries.map((s) => {
  const assessment = summaryPresentation(s)
  return `<tr><td>${escapeHtml(s.contaminant.name)}</td><td>${escapeHtml(assessment.valueText)}</td><td class="${assessment.health.tone}">${escapeHtml(assessment.health.label)}</td><td class="${assessment.legal.tone}">${escapeHtml(assessment.legal.label)}</td></tr>`
}).join('')}
</table>
<div class="footer">
Report generated from A Ripple Effect Initiative freshwater database on ${escapeHtml(new Date().toLocaleDateString())}.<br>
Comparison states describe reviewed records only. Missing comparisons do not establish water safety.<br>
Learn more at https://arippleeffectinitiative.org
</div>
</body></html>`
                    w.document.write(html)
                    w.document.close()
                    setTimeout(() => w.print(), 500)
                  }}
                  aria-label="Print report"
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30"
                  title="Print / save as PDF"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  ref={closeButton}
                  onClick={onClose}
                  aria-label="Close"
                  className="flex h-11 w-11 items-center justify-center rounded-lg bg-white/20 text-white transition-colors hover:bg-white/30"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-medium text-white/80">
                <MapPin className="h-3 w-3" />
                {utility.city}, {utility.state} · PWSID {utility.pwsid}
              </div>
              <h2 id={headingId} style={{ color: '#e5efeb' }} className="mt-1.5 line-clamp-3 text-lg font-bold leading-tight sm:text-2xl">
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
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain" tabIndex={0} role="region" aria-label="Utility measurements" data-testid="utility-detail-scroll">
              <div className="space-y-6 p-5 sm:p-7 pb-[max(48px,env(safe-area-inset-bottom))]">
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
                    value={healthCompared ? `${healthAbove} / ${healthCompared}` : 'Not assessed'}
                    icon={AlertTriangle}
                    tone={healthAbove > 0 ? 'warning' : 'default'}
                  />
                  <StatTile
                    label="Above legal limit"
                    value={legalCompared ? `${legalAbove} / ${legalCompared}` : 'Not assessed'}
                    icon={ShieldCheck}
                    tone={legalAbove > 0 ? 'danger' : 'default'}
                  />
                </div>

                {/* Water Safety Score */}
                <SafetyScoreCard score={utility.safetyScore} />

                {utility.notes && (
                  <div className="rounded-lg border border-border/60 bg-muted/40 p-3 text-sm text-muted-foreground">
                    <Info className="mr-1.5 inline h-3.5 w-3.5" />
                    {utility.notes}
                  </div>
                )}

                {utility.website && isSafeUrl(utility.website) && (
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
                      Latest records and benchmark comparisons
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
                  Benchmarks are displayed only when supplied with the record. A missing
                  limit is not a finding that a contaminant is unregulated or safe.
                </p>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
      <WaterReportCardModal
        utility={utility}
        open={shareCardOpen}
        onClose={() => setShareCardOpen(false)}
      />
    </>, document.body
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

export function ContaminantDetailCard({
  summary,
}: {
  summary: UtilityWithStats['contaminantSummaries'][number]
}) {
  const {
    contaminant: c,
    latestLevel,
    unit,
    quality,
    provenance,
    verificationStatus,
    source,
    robot,
  } = summary

  const status = summaryPresentation(summary)
  const healthRatio = status.health.ratio

  const statusCls =
    status.tone === 'danger'
      ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300'
      : status.tone === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300'
      : 'border-zinc-200 bg-zinc-50 text-zinc-700 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-zinc-300'

  // Health ratio progress (capped at 1000x for display)
  const ratioForBar = healthRatio ? Math.min(Math.log10(Math.max(healthRatio, 1)) * 33, 100) : null

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-sm font-semibold text-foreground">{c.name}</h4>
              {c.legalLimit == null && (
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  No legal benchmark supplied
                </Badge>
              )}
              <QualityBadge
                quality={quality}
                provenance={provenance}
                verificationStatus={verificationStatus}
                source={source}
                size="xs"
              />
              <SourceBadge source={source} robot={robot} size="xs" />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {c.category}
              {c.chemicalName ? ` · ${c.chemicalName}` : ''}
              {summary.sampleCount > 0 && (
                <> · <span className="tabular-nums">{summary.sampleCount}</span> samples</>
              )}
            </p>
          </div>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusCls}`}
          >
            {status.tone === 'danger' && <AlertTriangle className="h-3 w-3" />}
            {status.tone === 'warning' && <AlertTriangle className="h-3 w-3" />}
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
              {status.hasData && latestLevel != null ? latestLevel.toFixed(2) : 'Not measured'}{' '}
              <span className="text-[10px] font-normal text-muted-foreground">{unit}</span>
            </div>
          </div>
          <div className="rounded-md bg-muted/50 p-2">
            <div className="text-[10px] uppercase tracking-wide text-muted-foreground">
              Health guideline
            </div>
            <div className="mt-0.5 font-semibold tabular-nums text-foreground">
              {c.healthGuideline != null ? (
                <>
                  {c.healthGuideline} <span className="text-[10px] font-normal text-muted-foreground">{c.healthGuidelineUnit || 'Unit unavailable'}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No benchmark supplied</span>
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
                  {c.legalLimit} <span className="text-[10px] font-normal text-muted-foreground">{c.legalLimitUnit || 'Unit unavailable'}</span>
                </>
              ) : (
                <span className="text-muted-foreground">No benchmark supplied</span>
              )}
            </div>
          </div>
        </div>

        {/* Health ratio bar */}
        {healthRatio != null && (
          <div className="mt-3">
            <div className="mb-1 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>vs health guideline</span>
              <span className={healthRatio > 1 ? 'font-semibold text-amber-600' : 'text-muted-foreground'}>
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
                  : '[&>[data-slot=progress-indicator]]:bg-slate-400'
              }`}
            />
          </div>
        )}

        {/* Trend chart */}
        {summary.trend.length > 1 && (() => {
          const hgInUnit = status.health.ratio != null && c.healthGuideline != null && c.healthGuidelineUnit
            ? normalizeToBenchmarkUnit(c.healthGuideline, c.healthGuidelineUnit, unit)
            : undefined
          const llInUnit = status.legal.ratio != null && c.legalLimit != null && c.legalLimitUnit
            ? normalizeToBenchmarkUnit(c.legalLimit, c.legalLimitUnit, unit)
            : undefined
          return (
            <div className="mt-3">
              <ContaminantTrendChart
                data={summary.trend}
                unit={unit}
                reviewed={status.reviewed}
                healthGuideline={hgInUnit ?? undefined}
                legalLimit={llInUnit ?? undefined}
              />
            </div>
          )
        })()}

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

// -- Water Safety Score card --
export function SafetyScoreCard({
  score,
}: {
  score: UtilityWithStats['safetyScore']
}) {
  if (!hasPublishedScore(score)) return <Card data-testid="unassessed-score" className="border-border"><CardContent className="p-5"><h3 className="text-base font-semibold text-foreground">Safety score not assessed</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">There is not enough reviewed evidence for a published score.</p></CardContent></Card>
  const { score: value, grade, label, color, bgColor, deductions, dataConfidence } = score
  const borderClass = value >= 80
    ? 'border-emerald-300/60 dark:border-emerald-700/40'
    : value >= 70
    ? 'border-sky-300/60 dark:border-sky-700/40'
    : value >= 60
    ? 'border-amber-300/60 dark:border-amber-700/40'
    : 'border-rose-300/60 dark:border-rose-700/40'

  const barColor = value >= 80
    ? 'bg-emerald-500'
    : value >= 70
    ? 'bg-sky-500'
    : value >= 60
    ? 'bg-amber-500'
    : 'bg-rose-500'

  return (
    <Card className={`overflow-hidden border-2 ${borderClass}`}>
      <CardContent className="p-5">
        <div className="flex items-center gap-4">
          {/* Score circle */}
          <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full ${bgColor}`}>
            <div className="text-center">
              <div className={`text-2xl font-extrabold tabular-nums ${color}`}>{value}</div>
              <div className={`text-[10px] font-bold ${color}`}>Grade {grade}</div>
            </div>
          </div>

          {/* Label + confidence */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-foreground">Water safety score</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${bgColor} ${color}`}>
                {label}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              A published composite score based on the supplied scoring policy.
            </p>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <span className="text-muted-foreground">
                Data confidence:{' '}
                <span className="font-medium text-foreground">{dataConfidence}%</span>
              </span>
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${dataConfidence}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Score bar */}
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={`h-full ${barColor}`}
              initial={{ width: 0 }}
              animate={{ width: `${value}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
            />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
            <span>0 (Critical)</span>
            <span>50</span>
            <span>100 (Excellent)</span>
          </div>
        </div>

        {/* Deductions breakdown */}
        {deductions.length > 0 && (
          <div className="mt-4 space-y-1.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Score breakdown
            </p>
            {deductions.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="text-muted-foreground">{d.reason}</span>
                <span className="font-medium tabular-nums text-rose-600 dark:text-rose-400">
                  −{d.points}
                </span>
              </div>
            ))}
            <div className="mt-1.5 flex items-center justify-between border-t border-border pt-1.5 text-xs">
              <span className="font-semibold text-foreground">Final score</span>
              <span className={`font-bold tabular-nums ${color}`}>{value}/100</span>
            </div>
          </div>
        )}

        <p className="mt-3 text-[11px] text-muted-foreground">
          This score is a simplified composite for quick comparison. Always read
          the full contaminant breakdown below and cross-reference with your
          utility&apos;s Consumer Confidence Report.
        </p>
      </CardContent>
    </Card>
  )
}
