'use client'

import { Bot, Building2, Users, FlaskConical, Landmark, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Distinguishes data measured by A Ripple Effect's own identifier robot from
 * data pulled in from external sources (EPA, utilities, research labs, citizens).
 */
export type SampleSource =
  | 'Ripple Robot'
  | 'Utility CCR'
  | 'Citizen Test'
  | 'Research Lab'
  | 'EPA UCMR'
  | 'EWG'
  | 'Illustrative data'
  | 'Unknown'

export function isRobotSource(source: string | null | undefined, robot?: boolean): boolean {
  if (robot) return true
  return (source ?? '') === 'Ripple Robot'
}

export function SourceBadge({
  source,
  robot,
  size = 'sm',
}: {
  source: string
  robot?: boolean
  size?: 'xs' | 'sm' | 'md'
}) {
  const robotData = isRobotSource(source, robot)
  const config = robotData
    ? {
        label: 'Our Robot',
        icon: Bot,
        className:
          'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
        title: "Measured by A Ripple Effect's own microplastics identifier robot",
      }
    : SOURCE_CONFIG[source as SampleSource] ?? {
        label: source || 'External',
        icon: FileText,
        className:
          'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-950/50 dark:text-slate-300 dark:border-slate-800',
        title: 'Collected from an external source',
      }
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
      className={cn('inline-flex items-center rounded-md border font-medium', sizeCls, config.className)}
    >
      <Icon className={iconCls} />
      {config.label}
    </span>
  )
}

const SOURCE_CONFIG: Record<SampleSource, { label: string; icon: React.ElementType; className: string; title: string }> = {
  'Ripple Robot': {
    label: 'Our Robot',
    icon: Bot,
    className: 'bg-violet-100 text-violet-700 border-violet-200 dark:bg-violet-950/50 dark:text-violet-300 dark:border-violet-800',
    title: "Measured by A Ripple Effect's own microplastics identifier robot",
  },
  'Utility CCR': {
    label: 'Utility CCR',
    icon: Building2,
    className: 'bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800',
    title: 'From the utility’s own Consumer Confidence Report',
  },
  'Citizen Test': {
    label: 'Citizen',
    icon: Users,
    className: 'bg-sky-100 text-sky-700 border-sky-200 dark:bg-sky-950/50 dark:text-sky-300 dark:border-sky-800',
    title: 'Collected by a community member or chapter',
  },
  'Research Lab': {
    label: 'Research Lab',
    icon: FlaskConical,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800',
    title: 'From a partner research lab',
  },
  'EPA UCMR': {
    label: 'EPA UCMR',
    icon: Landmark,
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/50 dark:text-indigo-300 dark:border-indigo-800',
    title: 'From EPA’s Unregulated Contaminant Monitoring Rule program',
  },
  EWG: {
    label: 'EWG',
    icon: FileText,
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800',
    title: 'From the EWG Tap Water Database',
  },
  'Illustrative data': {
    label: 'Illustrative',
    icon: FlaskConical,
    className: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/50 dark:text-purple-300 dark:border-purple-800',
    title: 'Synthetic benchmark for demonstration only; not a measured sample',
  },
  Unknown: {
    label: 'Unknown',
    icon: FileText,
    className: 'bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800/50 dark:text-zinc-300 dark:border-zinc-700',
    title: 'Source record unverified or unspecified',
  },
}
