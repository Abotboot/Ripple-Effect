'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Droplets, Heart, Users, FlaskConical, Github, Mail, Instagram,
  ArrowRight, Calendar, ShieldCheck, BookOpen, Wrench, Megaphone,
  Building2, Code2, Sparkles, Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card, CardContent, CardHeader, CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api'
import type { Stats } from '@/lib/types'
import type { Section } from '@/components/site/site-header'

const REPO_URL = 'https://github.com/Abotboot/Ripple-Effect'
const EMAIL = 'rippleeffectoffice@gmail.com'
const INSTAGRAM = 'https://www.instagram.com/rippleeffectoffice'

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } },
}

const VALUES = [
  {
    icon: ShieldCheck,
    title: 'Open data',
    description:
      'Everything we collect is public and downloadable. No paywalls, no logins, no API keys. The whole dataset is on GitHub and exportable as JSON or CSV.',
    accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  },
  {
    icon: Users,
    title: 'Community-powered',
    description:
      'We are built by chapters, volunteers, and citizen scientists. Anyone can start a chapter, take our identifier, and test the water in their own community.',
    accent: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  },
  {
    icon: BookOpen,
    title: 'Science first',
    description:
      'Our measurement ranges are calibrated to published research from WHO, EPA, EWG, and USGS. When a number is illustrative rather than lab-verified, we say so clearly.',
    accent: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  },
]

const CREW = [
  {
    icon: Wrench,
    role: 'Engineering crew',
    blurb:
      'Builds and maintains the low-cost microplastics identifier hardware and the sampling protocol chapters use in the field.',
  },
  {
    icon: Code2,
    role: 'Coding crew',
    blurb:
      'Builds and maintains this database, the API, the maps, and the open-source code on GitHub.',
  },
  {
    icon: Megaphone,
    role: 'PR & social crew',
    blurb:
      'Runs outreach, onboards new chapters, and turns our data into stories people can act on.',
  },
]

export function AboutSection({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .getStats()
      .then((s) => setStats(s))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statItems: Array<{ label: string; value: string | undefined; icon: React.ElementType }> = [
    { label: 'Utilities', value: stats?.utilitiesCount?.toLocaleString(), icon: Building2 },
    { label: 'Contaminants', value: stats?.contaminantsCount?.toLocaleString(), icon: FlaskConical },
    { label: 'Samples', value: stats?.samplesCount?.toLocaleString(), icon: Droplets },
    { label: 'Chapters', value: stats?.chaptersCount?.toLocaleString(), icon: Users },
  ]

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-water-surface text-primary-foreground">
        <div className="pointer-events-none absolute inset-0 opacity-30">
          <div className="absolute -top-20 right-[5%] h-80 w-80 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute bottom-0 left-[20%] h-60 w-60 rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <Badge className="mb-4 border-white/30 bg-white/15 text-white hover:bg-white/15">
              <Info className="mr-1 h-3 w-3" />
              About us
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              A Ripples Effect
            </h1>
            <p className="mt-4 text-pretty text-lg text-white/90 sm:text-xl">
              One act. Endless impact.
            </p>
          </div>
        </div>
      </section>

      {/* Mission */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-center"
          >
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Our mission
            </h2>
            <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              We are a volunteer crew building a community water database for
              the 2026 Water Project. We make local water data open,
              searchable, and actionable &mdash; and we track microplastics
              that almost no one else does.
            </p>
          </motion.div>
        </div>
      </section>

      {/* The story */}
      <section className="bg-water-hero">
        <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <Badge variant="secondary" className="mb-3 gap-1.5">
              <BookOpen className="h-3.5 w-3.5" />
              The story
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Why we started
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-muted-foreground">
              <p>
                A crew of students and volunteers noticed something strange:
                microplastics &mdash; tiny plastic particles that have been
                found in drinking water around the world &mdash; weren&apos;t
                in any public water database. Not the EPA. Not the EWG. Not
                state portals. There was no federal limit, no routine
                monitoring requirement, and no easy way for a community to
                see what was in their own tap water.
              </p>
              <p>
                So they started building. First, a low-cost microplastics
                identifier that a chapter could build and operate. Then, an
                open database to publish what they measured &mdash; alongside
                the regulated-contaminant data already collected by federal
                and nonprofit databases, so the full picture sits in one
                place.
              </p>
              <p>
                Today, any chapter can take the identifier, test their own
                water, and add their readings to this database. The result
                is a growing, community-powered map of what&apos;s actually in
                our water &mdash; including the things almost no one else is
                tracking.
              </p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* What we believe */}
      <section className="border-y border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              What we believe
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Three values that shape every decision we make.
            </p>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {VALUES.map((v) => {
              const Icon = v.icon
              return (
                <motion.div key={v.title} variants={item}>
                  <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40">
                    <CardHeader>
                      <div
                        className={`mb-2 flex h-11 w-11 items-center justify-center rounded-xl ${v.accent}`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-lg">{v.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {v.description}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b border-border/60 bg-background">
        <div className="mx-auto grid max-w-7xl grid-cols-2 divide-x divide-border/60 sm:grid-cols-4">
          {statItems.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="flex flex-col items-center gap-2 px-4 py-8 text-center"
            >
              <Icon className="h-5 w-5 text-primary" />
              {loading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <span className="text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
                  {value ?? '—'}
                </span>
              )}
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* The crew */}
      <section className="bg-water-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3 gap-1.5">
              <Users className="h-3.5 w-3.5" />
              The crew
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              A volunteer non-profit
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              No paid staff. No corporate sponsors. Just a crew of volunteers
              organized into working groups.
            </p>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {CREW.map((c) => {
              const Icon = c.icon
              return (
                <motion.div key={c.role} variants={item}>
                  <Card className="h-full">
                    <CardHeader>
                      <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <CardTitle className="text-base">{c.role}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {c.blurb}
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>

          <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center sm:flex-row sm:gap-4 sm:text-left">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">We meet virtually every Monday at 6:30 PM.</span>{' '}
              Want to sit in? Email us &mdash; newcomers are always welcome.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-border/60 bg-background">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border bg-card p-6 text-center sm:p-10"
          >
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Help us map what&apos;s in the water
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground sm:text-base">
              Start a chapter in your town, dig into the data we&apos;ve already
              collected, or support the project. Every ripple counts.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => onNavigate?.('chapter')} size="lg">
                <Heart className="mr-2 h-4 w-4" />
                Start a chapter
              </Button>
              <Button
                onClick={() => onNavigate?.('microplastics')}
                size="lg"
                variant="secondary"
              >
                See the data
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                onClick={() => onNavigate?.('donate')}
                size="lg"
                variant="outline"
              >
                Support us
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Links */}
      <section className="bg-water-hero">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-3"
          >
            <motion.div variants={item}>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Github className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">GitHub</p>
                  <p className="truncate text-xs text-muted-foreground">
                    github.com/Abotboot/Ripple-Effect
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            </motion.div>

            <motion.div variants={item}>
              <a
                href={`mailto:${EMAIL}`}
                className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Email</p>
                  <p className="truncate text-xs text-muted-foreground">{EMAIL}</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            </motion.div>

            <motion.div variants={item}>
              <a
                href={INSTAGRAM}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex h-full items-center gap-4 rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:shadow-md hover:border-primary/40"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Instagram className="h-5 w-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">Instagram</p>
                  <p className="truncate text-xs text-muted-foreground">@rippleeffectoffice</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </a>
            </motion.div>
          </motion.div>
        </div>
      </section>
    </div>
  )
}
