'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Megaphone, MapPin, Loader2, Send, AlertTriangle, Info, CheckCircle2,
  Clock, Eye, MessageSquare, Droplets, Filter,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Report } from '@/lib/types'
import { cn } from '@/lib/utils'

type ReportWithUtility = Report & {
  utility?: { name: string; city: string; state: string } | null
}

const APPEARANCES = [
  { value: 'normal', label: 'Normal / clear' },
  { value: 'cloudy', label: 'Cloudy / milky' },
  { value: 'discolored', label: 'Discolored (brown/yellow)' },
  { value: 'odor', label: 'Strong odor / chlorine smell' },
  { value: 'taste', label: 'Bad taste (metallic, salty)' },
]

const SEVERITIES = [
  { value: 'info', label: 'Just sharing info', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { value: 'warning', label: 'Concerned — please review', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  { value: 'critical', label: 'Urgent — potential hazard', color: 'bg-rose-100 text-rose-700 border-rose-200' },
]

const STATUS_META: Record<string, { label: string; icon: React.ElementType; cls: string }> = {
  pending: { label: 'Pending review', icon: Clock, cls: 'bg-slate-100 text-slate-600' },
  reviewed: { label: 'Reviewed', icon: Eye, cls: 'bg-sky-100 text-sky-700' },
  resolved: { label: 'Resolved', icon: CheckCircle2, cls: 'bg-emerald-100 text-emerald-700' },
}

export function CommunityReportsSection() {
  const [reports, setReports] = useState<ReportWithUtility[] | null>(null)
  const [filter, setFilter] = useState<'all' | 'pending' | 'reviewed' | 'resolved'>('all')
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  // Form state
  const [form, setForm] = useState({
    zipCode: '',
    city: '',
    state: '',
    title: '',
    description: '',
    contaminant: '',
    appearance: 'normal',
    severity: 'info',
    reporterName: '',
    reporterEmail: '',
  })

  const load = () => {
    api.listReports().then((r) => setReports(r as ReportWithUtility[])).catch(() => setReports([]))
  }
  useEffect(() => { load() }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.zipCode.trim() || !form.title.trim() || !form.description.trim()) {
      toast({
        title: 'Missing fields',
        description: 'ZIP code, title, and description are required.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await api.submitReport(form)
      toast({
        title: 'Report submitted',
        description: 'Thank you! Your report is now pending review by the crew.',
      })
      setForm({
        zipCode: '', city: '', state: '', title: '', description: '',
        contaminant: '', appearance: 'normal', severity: 'info',
        reporterName: '', reporterEmail: '',
      })
      load()
    } catch (e) {
      toast({
        title: 'Submission failed',
        description: e instanceof Error ? e.message : 'Unknown error',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const filtered = (reports ?? []).filter((r) => filter === 'all' || r.status === filter)

  return (
    <div className="bg-water-hero">
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mb-8 text-center">
          <Badge variant="secondary" className="mb-3 border-primary/20 bg-primary/10 text-primary">
            <Megaphone className="mr-1 h-3 w-3" />
            Community reports
          </Badge>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Report what you see in your water
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Noticed cloudy water, a strange taste, or a contamination event?
            Share it with your community. Reports are public and reviewed by our crew.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Submission form */}
          <div className="lg:col-span-2">
            <Card className="sticky top-20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Send className="h-4 w-4 text-primary" />
                  Submit a report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="zip" className="text-xs">ZIP code *</Label>
                      <Input
                        id="zip"
                        value={form.zipCode}
                        onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                        placeholder="60614"
                        maxLength={10}
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="state" className="text-xs">State</Label>
                      <Input
                        id="state"
                        value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                        placeholder="IL"
                        maxLength={2}
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="city" className="text-xs">City</Label>
                    <Input
                      id="city"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Chicago"
                    />
                  </div>
                  <div>
                    <Label htmlFor="title" className="text-xs">Title *</Label>
                    <Input
                      id="title"
                      value={form.title}
                      onChange={(e) => setForm({ ...form, title: e.target.value })}
                      placeholder="Cloudy water this morning"
                      maxLength={120}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="desc" className="text-xs">Description *</Label>
                    <Textarea
                      id="desc"
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="What did you observe? When did it start? Any other details..."
                      rows={4}
                      maxLength={2000}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="appearance" className="text-xs">Appearance</Label>
                      <Select
                        value={form.appearance}
                        onValueChange={(v) => setForm({ ...form, appearance: v })}
                      >
                        <SelectTrigger id="appearance">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {APPEARANCES.map((a) => (
                            <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="severity" className="text-xs">Severity</Label>
                      <Select
                        value={form.severity}
                        onValueChange={(v) => setForm({ ...form, severity: v })}
                      >
                        <SelectTrigger id="severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SEVERITIES.map((s) => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="contaminant" className="text-xs">Suspected contaminant (optional)</Label>
                    <Input
                      id="contaminant"
                      value={form.contaminant}
                      onChange={(e) => setForm({ ...form, contaminant: e.target.value })}
                      placeholder="e.g. Lead, Chlorine, Microplastics"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="name" className="text-xs">Your name (optional)</Label>
                      <Input
                        id="name"
                        value={form.reporterName}
                        onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                        placeholder="Anonymous"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email" className="text-xs">Email (optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={form.reporterEmail}
                        onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })}
                        placeholder="for crew follow-up"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={submitting}>
                    {submitting ? (
                      <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                    ) : (
                      <><Send className="h-4 w-4" /> Submit report</>
                    )}
                  </Button>
                  <p className="text-[11px] text-muted-foreground">
                    By submitting, you agree your report may be displayed publicly.
                    Your email is never shown.
                  </p>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Reports feed */}
          <div className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">
                Recent reports
                {reports && (
                  <span className="ml-1 text-sm text-muted-foreground">({filtered.length})</span>
                )}
              </h2>
              <div className="flex items-center gap-1.5">
                <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="flex gap-1 rounded-lg border border-border bg-card p-1">
                  {(['all', 'pending', 'reviewed', 'resolved'] as const).map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-xs font-medium capitalize transition-colors',
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
            </div>

            {!reports ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="h-5 w-2/3" />
                      <Skeleton className="mt-2 h-4 w-1/3" />
                      <Skeleton className="mt-3 h-12 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  <MessageSquare className="mx-auto mb-2 h-8 w-8 text-muted-foreground/50" />
                  No reports match this filter yet.
                </CardContent>
              </Card>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              >
                {filtered.map((r) => (
                  <motion.div
                    key={r.id}
                    variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
                  >
                    <ReportCard report={r} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

function ReportCard({ report: r }: { report: ReportWithUtility }) {
  const sev = SEVERITIES.find((s) => s.value === r.severity) ?? SEVERITIES[0]
  const status = STATUS_META[r.status] ?? STATUS_META.pending
  const StatusIcon = status.icon
  return (
    <Card className="overflow-hidden transition-shadow hover:shadow-md">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span>{r.zipCode}</span>
              {r.city && <span>· {r.city}, {r.state}</span>}
              {r.utility && (
                <span className="truncate">· {r.utility.name}</span>
              )}
            </div>
            <h3 className="mt-1 text-sm font-semibold text-foreground">{r.title}</h3>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', sev.color)}>
              {r.severity === 'critical' && <AlertTriangle className="h-3 w-3" />}
              {r.severity === 'info' && <Info className="h-3 w-3" />}
              {r.severity}
            </span>
            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium', status.cls)}>
              <StatusIcon className="h-3 w-3" />
              {status.label}
            </span>
          </div>
        </div>

        <p className="mt-2 text-sm text-muted-foreground">{r.description}</p>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
          {r.appearance && r.appearance !== 'normal' && (
            <Badge variant="outline" className="text-[10px]">
              <Droplets className="mr-1 h-3 w-3" />
              {r.appearance}
            </Badge>
          )}
          {r.contaminant && (
            <Badge variant="outline" className="text-[10px]">
              {r.contaminant}
            </Badge>
          )}
          <span className="ml-auto">
            {r.reporterName ? `by ${r.reporterName} · ` : ''}
            {new Date(r.createdAt).toLocaleDateString('en-US', {
              year: 'numeric', month: 'short', day: 'numeric',
            })}
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
