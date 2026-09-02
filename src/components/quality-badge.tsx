'use client'

import { ShieldCheck, FlaskConical, Users, HelpCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SampleQuality = 'verified' | 'provisional' | 'citizen'

const QUALITY_CONFIG: Record<
  SampleQuality,
  { label: string; icon: React.ElementType; className: string; title: string }
> = {
  verified: {
    label: 'Verified',
    icon: ShieldCheck,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    title: 'Lab-verified. Measured by a utility, EPA program, or certified lab',
  },
  provisional: {
    label: 'Provisional',
    icon: FlaskConical,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    title: 'Provisional. From a research lab; pending full verification',
  },
  citizen: {
    label: 'Citizen',
    icon: Users,
    className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    title: 'Citizen-submitted. Contributed by a community member or chapter',
  },
}

export function QualityBadge({
  quality,
  size = 'sm',
  showIcon = true,
}: {
  quality: string
  size?: 'xs' | 'sm' | 'md'
  showIcon?: boolean
}) {
  const q = (quality in QUALITY_CONFIG ? quality : 'verified') as SampleQuality
  const config = QUALITY_CONFIG[q]
  const Icon = config.icon
  const sizeCls =
    size === 'xs'
      ? 'px-1.5 py-0 text-[9px] gap-0.5'
      : size === 'md'
      ? 'px-2.5 py-1 text-xs gap-1'
      : 'px-2 py-0.5 text-[10px] gap-0.5'
  const iconCls = size === 'md' ? 'h-3.5 w-3.5' : 'h-3 w-3'

  return (
    <span
      title={config.title}
      className={cn(
        'inline-flex items-center rounded-md border font-medium',
        sizeCls,
        config.className
      )}
    >
      {showIcon && <Icon className={iconCls} />}
      {config.label}
    </span>
  )
}

export function QualityLegend() {
  return (
    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
      <span className="font-medium text-foreground">Data quality:</span>
      {(Object.keys(QUALITY_CONFIG) as SampleQuality[]).map((q) => {
        const config = QUALITY_CONFIG[q]
        const Icon = config.icon
        return (
          <span key={q} className="inline-flex items-center gap-1.5">
            <span className={cn('inline-flex items-center rounded border px-1.5 py-0 text-[9px]', config.className)}>
              <Icon className="h-2.5 w-2.5" />
              {config.label}
            </span>
            <span className="hidden sm:inline">{config.title.split('.')[1]?.trim()}</span>
          </span>
        )
      })}
    </div>
  )
}

export { HelpCircle }
