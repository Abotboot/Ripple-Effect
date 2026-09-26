'use client'

import { useEffect, useState, type ElementType } from 'react'
import { motion } from 'framer-motion'
import { FlaskConical, Info, ShieldCheck, Users } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { api } from '@/lib/api'
import type { Stats } from '@/lib/types'

// How many records carry each evidence label, and what the labels mean.
// Lives on the data sources page (it was a sidebar on Home).
export function EvidenceLabelCard() {
  const [stats, setStats] = useState<Stats | null>(null)
  useEffect(() => {
    api.getStats().then(setStats).catch(() => {})
  }, [])
  const qualityCounts = stats?.qualityCounts
  const total = stats?.samplesCount ?? 0

  return (
    <Card className="overflow-hidden border-primary/20">
      <CardContent className="p-5">
        <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <h3 className="text-base font-bold text-foreground">Read the evidence label</h3>
        {qualityCounts && (
          <div className="mt-4 space-y-2">
            <QualityRow icon={ShieldCheck} label="Verified" count={qualityCounts.verified} total={total} color="bg-emerald-500" colorLight="bg-emerald-100 dark:bg-emerald-950/40" textColor="text-emerald-700 dark:text-emerald-300" desc="Utility / EPA / certified lab" />
            <QualityRow icon={FlaskConical} label="Provisional" count={qualityCounts.provisional} total={total} color="bg-amber-500" colorLight="bg-amber-100 dark:bg-amber-950/40" textColor="text-amber-700 dark:text-amber-300" desc="Research lab, pending verification" />
            <QualityRow icon={Users} label="Citizen" count={qualityCounts.citizen} total={total} color="bg-sky-500" colorLight="bg-sky-100 dark:bg-sky-950/40" textColor="text-sky-700 dark:text-sky-300" desc="Community submitted" />
            <QualityRow icon={Info} label="Unreviewed" count={qualityCounts.unreviewed ?? 0} total={total} color="bg-slate-500" colorLight="bg-slate-100 dark:bg-slate-900/40" textColor="text-slate-700 dark:text-slate-300" desc="Verification evidence not established" />
            <QualityRow icon={Info} label="Illustrative" count={qualityCounts.illustrative ?? 0} total={total} color="bg-slate-400" colorLight="bg-slate-100 dark:bg-slate-900/40" textColor="text-slate-700 dark:text-slate-300" desc="Synthetic examples, not measured samples" />
          </div>
        )}
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          Source and review status show what evidence supports each record. Missing review or benchmark data remains unassessed; check the method, units, collection date, and source before interpreting a result.
        </p>
      </CardContent>
    </Card>
  )
}

function QualityRow({ icon: Icon, label, count, total, color, colorLight, textColor, desc }: {
  icon: ElementType
  label: string
  count: number
  total: number
  color: string
  colorLight: string
  textColor: string
  desc: string
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className={`rounded-lg border border-border p-2.5 ${colorLight}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Icon className={`h-3.5 w-3.5 ${textColor}`} />
          <span className="text-xs font-semibold text-foreground">{label}</span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${textColor}`}>{count}</span>
      </div>
      <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background/50">
        <motion.div
          className={`h-full ${color}`}
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>
      <p className="mt-1 text-[10px] text-muted-foreground">{desc} · {pct}%</p>
    </div>
  )
}
