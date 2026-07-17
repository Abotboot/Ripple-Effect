'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Heart, Loader2, Send, Microscope, Droplets, Smartphone, Package,
  CheckCircle2, MapPin, Mail, ArrowRight, Beaker, Waves, ClipboardList,
  Upload, Radio, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { api } from '@/lib/api'

// The chapter journey: 4 steps from sign-up to pushing data.
const STEPS = [
  {
    icon: ClipboardList,
    title: '1 · Sign up your chapter',
    body: 'Fill out the form below. Tell us your city and the water body you want to test — a tap, a stream, a river, a reservoir.',
  },
  {
    icon: Package,
    title: '2 · Get the identifier kit',
    body: 'We ship you the low-cost microplastics identifier (or the build plans if you want to assemble your own). Comes with a testing protocol.',
  },
  {
    icon: Beaker,
    title: '3 · Dip & read',
    body: 'Take the identifier, dip it into your local water stream or tap, and read off the microplastics count. Repeat weekly to build a trend.',
  },
  {
    icon: Upload,
    title: '4 · Push to the database',
    body: 'Log the reading through our companion app (or the web form) and it lands in this public database for everyone to see.',
  },
]

export function ChapterSection() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    chapterName: '',
    city: '',
    state: '',
    zipCode: '',
    waterBody: '',
    organization: '',
    identifier: true,
    message: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim()) {
      toast({
        title: 'Missing fields',
        description: 'Name and email are required.',
        variant: 'destructive',
      })
      return
    }
    setSubmitting(true)
    try {
      await api.submitChapter(form)
      toast({
        title: 'Chapter request received! 🌊',
        description: 'We will email you with kit details and onboarding within a week.',
      })
      setSubmitted(true)
      setForm({
        name: '', email: '', chapterName: '', city: '', state: '', zipCode: '',
        waterBody: '', organization: '', identifier: true, message: '',
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
              <Heart className="mr-1 h-3 w-3" />
              Start a chapter
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Dip the identifier. Map your water.
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Take our low-cost microplastics identifier, dip it into your own
              local water streams and tap, then push the readings straight into
              this public database. No coding required — just curiosity and a
              few minutes a week.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-2 text-sm text-white/85">
              <span className="inline-flex items-center gap-1.5">
                <Microscope className="h-4 w-4" />
                Identifier kit provided
              </span>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Smartphone className="h-4 w-4" />
                Companion app (in progress)
              </span>
              <span className="opacity-50">·</span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-4 w-4" />
                Open to students, clubs, &amp; citizens
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* How it works — 4 steps */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            How a chapter works
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Four steps from sign-up to contributing real microplastics data
            that almost no one else is collecting.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, body }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <Card className="h-full">
                <CardContent className="flex h-full flex-col p-5">
                  <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground">{title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* What you can test + the app */}
      <section className="mx-auto max-w-7xl px-4 pb-6 sm:px-6 lg:px-8">
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2 overflow-hidden border-primary/30">
            <CardContent className="grid gap-6 p-6 sm:p-8 lg:grid-cols-2 lg:items-center">
              <div>
                <Badge variant="secondary" className="mb-2 bg-primary/10 text-primary">
                  Where to dip
                </Badge>
                <h3 className="text-xl font-bold tracking-tight">
                  Test the water around you
                </h3>
                <p className="mt-3 text-sm text-muted-foreground">
                  The identifier works in any water. Chapters typically test:
                </p>
                <ul className="mt-3 space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Droplets className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Kitchen tap</strong> — your own drinking water, before &amp; after any home filter</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Waves className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Local streams &amp; rivers</strong> — surface water before it reaches treatment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Beaker className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Reservoirs &amp; lakes</strong> — source water for your utility</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Radio className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span><strong className="text-foreground">Storm runoff</strong> — after rain, where tire-wear microplastics concentrate</span>
                  </li>
                </ul>
              </div>
              <div className="rounded-xl bg-water-surface p-6 text-primary-foreground">
                <Smartphone className="h-7 w-7 text-white/90" />
                <h4 className="mt-2 text-base font-semibold">Companion app</h4>
                <p className="mt-2 text-sm text-white/85">
                  We&apos;re building a mobile app so chapters can read
                  microplastics counts off the identifier and push readings
                  straight into this database from the field — with GPS,
                  photos, and timestamps.
                </p>
                <p className="mt-3 text-xs text-white/70">
                  Coming soon. For now, chapters log readings through the web
                  community report form.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <Package className="h-6 w-6 text-primary" />
              <h3 className="mt-2 text-base font-semibold">What&apos;s in the kit</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Microplastics identifier unit
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Sample vials &amp; tweezers
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Testing protocol (step-by-step)
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Data-entry quick guide
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                  Access to the chapter Slack
                </li>
              </ul>
              <p className="mt-3 rounded-lg bg-muted/50 p-2.5 text-[11px] text-muted-foreground">
                Kits are free for student &amp; community chapters while supplies
                last, funded by donations.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Signup form */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <Card className="mx-auto max-w-3xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Send className="h-4 w-4 text-primary" />
              Start your chapter
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Tell us about you and the water you want to test. Our chapter
              lead reaches out within a week.
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
                  You&apos;re on the map! 🌊
                </h3>
                <p className="mt-1 max-w-sm text-sm text-emerald-800 dark:text-emerald-300">
                  Your chapter request is in. We&apos;ll email you with kit
                  details, the testing protocol, and an invite to the next
                  Monday meeting.
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-emerald-300 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                  onClick={() => setSubmitted(false)}
                >
                  Start another chapter
                </Button>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cname" className="text-xs">Your name *</Label>
                    <Input
                      id="cname"
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="Jane Doe"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="cemail" className="text-xs">Email *</Label>
                    <Input
                      id="cemail"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder="jane@example.com"
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="cchapter" className="text-xs">Chapter name (optional)</Label>
                  <Input
                    id="cchapter"
                    value={form.chapterName}
                    onChange={(e) => setForm({ ...form, chapterName: e.target.value })}
                    placeholder="e.g. A Ripples Effect — Riverside Chapter"
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label htmlFor="ccity" className="text-xs">City</Label>
                    <Input
                      id="ccity"
                      value={form.city}
                      onChange={(e) => setForm({ ...form, city: e.target.value })}
                      placeholder="Chicago"
                    />
                  </div>
                  <div>
                    <Label htmlFor="cstate" className="text-xs">State</Label>
                    <Input
                      id="cstate"
                      value={form.state}
                      onChange={(e) => setForm({ ...form, state: e.target.value.toUpperCase().slice(0, 2) })}
                      placeholder="IL"
                    />
                  </div>
                  <div>
                    <Label htmlFor="czip" className="text-xs">ZIP</Label>
                    <Input
                      id="czip"
                      value={form.zipCode}
                      onChange={(e) => setForm({ ...form, zipCode: e.target.value })}
                      placeholder="60614"
                    />
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="cwater" className="text-xs">Water body you want to test</Label>
                    <Input
                      id="cwater"
                      value={form.waterBody}
                      onChange={(e) => setForm({ ...form, waterBody: e.target.value })}
                      placeholder="e.g. Chicago River, kitchen tap, Lake Michigan"
                    />
                  </div>
                  <div>
                    <Label htmlFor="corg" className="text-xs">School / club / org (optional)</Label>
                    <Input
                      id="corg"
                      value={form.organization}
                      onChange={(e) => setForm({ ...form, organization: e.target.value })}
                      placeholder="e.g. UIC Environmental Club"
                    />
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/30 p-3">
                  <Checkbox
                    id="cidentifier"
                    checked={form.identifier}
                    onCheckedChange={(v) => setForm({ ...form, identifier: v === true })}
                    className="mt-0.5"
                  />
                  <div className="text-sm">
                    <Label htmlFor="cidentifier" className="cursor-pointer font-medium text-foreground">
                      I need an identifier kit shipped to me
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Uncheck if you already have a microscope / setup and just
                      want the protocol.
                    </p>
                  </div>
                </div>
                <div>
                  <Label htmlFor="cmsg" className="text-xs">Anything else? (optional)</Label>
                  <Textarea
                    id="cmsg"
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="Tell us why you want to start a chapter, who's on your team, or any questions..."
                    rows={3}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</>
                  ) : (
                    <><Send className="h-4 w-4" /> Start my chapter</>
                  )}
                </Button>
                <p className="text-[11px] text-muted-foreground">
                  By signing up, you agree to be contacted by the A Ripples
                  Effect crew. We never share your info.
                </p>
              </form>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Contact strip */}
      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-4 rounded-xl border border-border bg-card p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <div className="font-medium text-foreground">Questions before signing up?</div>
              <div className="text-sm text-muted-foreground">Email us — we reply fast.</div>
            </div>
          </div>
          <a
            href="mailto:rippleeffectoffice@gmail.com?subject=Starting%20a%20chapter"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            <Mail className="h-4 w-4" />
            rippleeffectoffice@gmail.com
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
