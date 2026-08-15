'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Beaker, Send, Loader2, CheckCircle2, FlaskConical, Droplets, MapPin,
  Calendar, User, Mail, ClipboardList, Microscope, Info, ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'
import type { Contaminant, Utility } from '@/lib/types'
import { QualityBadge } from '@/components/quality-badge'

export function SubmitReadingSection() {
  const [contaminants, setContaminants] = useState<Contaminant[] | null>(null)
  const [utilities, setUtilities] = useState<Utility[] | null>(null)
  const [form, setForm] = useState({
    contaminantId: '',
    utilityId: '',
    level: '',
    unit: '',
    treatmentStatus: 'Treated',
    location: '',
    sampleDate: new Date().toISOString().slice(0, 10),
    reporterName: '',
    reporterEmail: '',
    notes: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    api.listContaminants().then(setContaminants).catch(() => setContaminants([]))
    api.listUtilities().then(setUtilities).catch(() => setUtilities([]))
  }, [])

  // When contaminant changes, auto-fill the unit
  useEffect(() => {
    if (form.contaminantId && contaminants) {
      const c = contaminants.find((x) => x.id === form.contaminantId)
      if (c) {
        setForm((f) => ({ ...f, unit: c.legalLimitUnit || c.healthGuidelineUnit || 'ppb' }))
      }
    }
  }, [form.contaminantId, contaminants])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.contaminantId || !form.level || !form.reporterName || !form.reporterEmail) {
      toast({
        title: 'Missing fields',
        description: 'Contaminant, level, your name, and email are required.',
        variant: 'destructive',
      })
      return
    }
    if (!form.utilityId) {
      toast({
        title: 'Select a utility',
        description: 'Please select the water utility this reading is from.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await api.submitReading({
        contaminantId: form.contaminantId,
        utilityId: form.utilityId,
        level: Number(form.level),
        unit: form.unit,
        treatmentStatus: form.treatmentStatus,
        location: form.location,
        sampleDate: form.sampleDate,
        reporterName: form.reporterName,
        reporterEmail: form.reporterEmail,
        notes: form.notes,
      })
      toast({
        title: 'Reading submitted! 🧪',
        description: 'Your citizen reading has been recorded and will appear in the database.',
      })
      setSubmitted(true)
      setForm({
        contaminantId: '', utilityId: '', level: '', unit: '',
        treatmentStatus: 'Treated', location: '',
        sampleDate: new Date().toISOString().slice(0, 10),
        reporterName: '', reporterEmail: '', notes: '',
      })
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

  const selectedContaminant = contaminants?.find((c) => c.id === form.contaminantId)

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
              <Beaker className="mr-1 h-3 w-3" />
              Citizen science
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Submit a reading
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Took a microplastics identifier reading from a stream, river, or
              lake near you? Submit it here. Your reading joins the public
              database and helps your community see what&apos;s in the water.
            </p>
          </div>
        </div>
      </section>

      {/* Quality notice */}
      <section className="border-b border-sky-300/40 bg-gradient-to-r from-sky-50 to-cyan-50 dark:border-sky-700/30 dark:from-sky-950/30 dark:to-cyan-950/20">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500 text-white">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div className="flex-1 text-sm">
              <span className="font-medium text-foreground">Citizen readings are clearly labeled.</span>{' '}
              <span className="text-muted-foreground">
                Every submission you make is tagged{' '}
                <QualityBadge quality="citizen" size="xs" /> in the database.
                We never present unverified data as official — your reading
                helps identify areas that need lab follow-up.
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Form */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <ClipboardList className="h-4 w-4 text-primary" />
                  Reading details
                </CardTitle>
                <p className="text-sm text-muted-foreground">
                  Fill in what you measured. Fields marked * are required.
                </p>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center dark:border-emerald-800 dark:bg-emerald-950/30"
                  >
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900">
                      <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-emerald-900 dark:text-emerald-200">
                      Reading recorded! 🧪
                    </h3>
                    <p className="mt-1 max-w-sm text-sm text-emerald-800 dark:text-emerald-300">
                      Thank you for contributing to the database. Your citizen
                      reading is now visible with the{' '}
                      <QualityBadge quality="citizen" size="xs" /> tag.
                    </p>
                    <Button
                      variant="outline"
                      className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                      onClick={() => setSubmitted(false)}
                    >
                      Submit another reading
                    </Button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Contaminant + utility */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="rcontam" className="text-xs">
                          <FlaskConical className="mr-1 inline h-3 w-3" />
                          Contaminant *
                        </Label>
                        <Select value={form.contaminantId} onValueChange={(v) => setForm({ ...form, contaminantId: v })}>
                          <SelectTrigger id="rcontam"><SelectValue placeholder="Select contaminant" /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {contaminants?.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="rutil" className="text-xs">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          Utility / water system *
                        </Label>
                        <Select value={form.utilityId} onValueChange={(v) => setForm({ ...form, utilityId: v })}>
                          <SelectTrigger id="rutil"><SelectValue placeholder="Select utility" /></SelectTrigger>
                          <SelectContent className="max-h-72">
                            {utilities?.map((u) => (
                              <SelectItem key={u.id} value={u.id}>
                                {u.name} ({u.city}, {u.state})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Level + unit + treatment */}
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div>
                        <Label htmlFor="rlevel" className="text-xs">
                          <Beaker className="mr-1 inline h-3 w-3" />
                          Level measured *
                        </Label>
                        <Input
                          id="rlevel"
                          type="number"
                          step="any"
                          min="0"
                          value={form.level}
                          onChange={(e) => setForm({ ...form, level: e.target.value })}
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="runit" className="text-xs">Unit</Label>
                        <Input
                          id="runit"
                          value={form.unit}
                          onChange={(e) => setForm({ ...form, unit: e.target.value })}
                          placeholder="particles/L"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rtreat" className="text-xs">Treatment status</Label>
                        <Select value={form.treatmentStatus} onValueChange={(v) => setForm({ ...form, treatmentStatus: v })}>
                          <SelectTrigger id="rtreat"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Treated">Treated (tap)</SelectItem>
                            <SelectItem value="Untreated">Untreated (source)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Location + date */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="rloc" className="text-xs">
                          <MapPin className="mr-1 inline h-3 w-3" />
                          Sampling location
                        </Label>
                        <Input
                          id="rloc"
                          value={form.location}
                          onChange={(e) => setForm({ ...form, location: e.target.value })}
                          placeholder="e.g. Kitchen tap, Chicago River at Goose Island"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rdate" className="text-xs">
                          <Calendar className="mr-1 inline h-3 w-3" />
                          Sample date
                        </Label>
                        <Input
                          id="rdate"
                          type="date"
                          value={form.sampleDate}
                          onChange={(e) => setForm({ ...form, sampleDate: e.target.value })}
                        />
                      </div>
                    </div>

                    {/* Reporter */}
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <Label htmlFor="rname" className="text-xs">
                          <User className="mr-1 inline h-3 w-3" />
                          Your name *
                        </Label>
                        <Input
                          id="rname"
                          value={form.reporterName}
                          onChange={(e) => setForm({ ...form, reporterName: e.target.value })}
                          placeholder="Jane Doe"
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="remail" className="text-xs">
                          <Mail className="mr-1 inline h-3 w-3" />
                          Your email *
                        </Label>
                        <Input
                          id="remail"
                          type="email"
                          value={form.reporterEmail}
                          onChange={(e) => setForm({ ...form, reporterEmail: e.target.value })}
                          placeholder="jane@example.com"
                          required
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <Label htmlFor="rnotes" className="text-xs">Notes (optional)</Label>
                      <Textarea
                        id="rnotes"
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="Describe how you took the reading, what identifier you used, weather conditions, etc."
                        rows={3}
                      />
                    </div>

                    {/* Guideline context */}
                    {selectedContaminant && (
                      <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs">
                        <div className="flex items-center gap-1.5 font-medium text-foreground">
                          <Info className="h-3.5 w-3.5 text-primary" />
                          {selectedContaminant.name} reference values
                        </div>
                        <div className="mt-1.5 grid grid-cols-2 gap-2 text-muted-foreground">
                          <div>
                            Health guideline:{' '}
                            <span className="font-medium text-amber-700 dark:text-amber-400">
                              {selectedContaminant.healthGuideline != null && selectedContaminant.healthGuideline > 0
                                ? `${selectedContaminant.healthGuideline} ${selectedContaminant.healthGuidelineUnit ?? ''}`
                                : 'None set'}
                            </span>
                          </div>
                          <div>
                            Legal limit:{' '}
                            <span className="font-medium text-rose-700 dark:text-rose-400">
                              {selectedContaminant.legalLimit != null
                                ? `${selectedContaminant.legalLimit} ${selectedContaminant.legalLimitUnit ?? ''}`
                                : 'None (unregulated)'}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <Button type="submit" className="w-full" disabled={submitting}>
                      {submitting ? (
                        <><Loader2 className="h-4 w-4 animate-spin" /> Submitting...</>
                      ) : (
                        <><Send className="h-4 w-4" /> Submit reading</>
                      )}
                    </Button>
                    <p className="text-[11px] text-muted-foreground">
                      By submitting, you agree to be contacted for verification.
                      Your email is never displayed publicly. Rate limit: 10
                      readings per email per 24 hours.
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Side info */}
          <div className="space-y-4">
            <Card className="bg-water-surface text-primary-foreground">
              <CardContent className="p-5">
                <Microscope className="h-6 w-6 text-white/90" />
                <h3 className="mt-2 text-base font-semibold">How to take a reading</h3>
                <ol className="mt-3 space-y-2 text-sm text-white/90">
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">1</span>
                    <span>Get a microplastics identifier (from a chapter kit or your own setup).</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">2</span>
                    <span>Collect a water sample in a clean, rinsed container.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">3</span>
                    <span>Run the identifier per the protocol and record the particle count.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/20 text-[10px] font-bold">4</span>
                    <span>Submit the reading here with the date and location.</span>
                  </li>
                </ol>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <Droplets className="h-6 w-6 text-primary" />
                <h3 className="mt-2 text-base font-semibold">Why citizen readings matter</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Official monitoring is sparse and slow. Citizen readings
                  fill geographic gaps, catch problems early, and build a
                  richer picture of water quality than any single lab could.
                </p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Every reading is tagged{' '}
                  <QualityBadge quality="citizen" size="xs" /> so viewers
                  always know the source.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
