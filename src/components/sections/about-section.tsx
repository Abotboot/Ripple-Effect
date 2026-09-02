'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Droplets, Beaker, Users, FlaskConical, Github, Mail, Instagram,
  ArrowRight, Calendar, ShieldCheck, BookOpen,
  Building2, Sparkles, Info,
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
      'We are built by volunteers and citizen scientists. Anyone can take our identifier and test the freshwater in their own community.',
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

// Team organized by working group. Photos live in /public/team/<slug>.jpg
// (e.g. /team/siddhant-khatiwada.jpg). If a photo file is missing, the card
// falls back to an initials avatar so the layout never breaks.
type TeamMember = {
  name: string
  title: string
  photo?: string
}

type TeamGroup = {
  id: string
  group: string
  accent: string
  members: TeamMember[]
}

const TEAM_GROUPS: TeamGroup[] = [
  {
    id: 'leadership',
    group: 'Leadership',
    accent: 'border-primary/40 bg-primary/5',
    members: [
      { name: 'Siddhant Khatiwada', title: 'Founder & President', photo: '/team/siddhant-khatiwada.jpg' },
    ],
  },
  {
    id: 'engineering',
    group: 'Engineering / Programming',
    accent: 'border-cyan-400/40 bg-cyan-500/5',
    members: [
      { name: 'Abod', title: 'Engineering', photo: '/team/abod.jpg' },
      { name: 'Diwash', title: 'Engineering', photo: '/team/diwash.jpg' },
      { name: 'Aryan', title: 'Programming', photo: '/team/aryan.jpg' },
      { name: 'Akshat', title: 'Programming', photo: '/team/akshat.jpg' },
    ],
  },
  {
    id: 'pr',
    group: 'Public Relations / Social Media',
    accent: 'border-rose-400/40 bg-rose-500/5',
    members: [
      { name: 'Abby', title: 'PR / Social Media', photo: '/team/abby.jpg' },
      { name: 'Zahra', title: 'PR / Social Media', photo: '/team/zahra.jpg' },
      { name: 'Giamy', title: 'PR / Social Media', photo: '/team/giamy.jpg' },
    ],
  },
  {
    id: 'finance',
    group: 'Finance Team',
    accent: 'border-amber-400/40 bg-amber-500/5',
    members: [
      { name: 'Sujhav', title: 'Finance', photo: '/team/sujhav.jpg' },
      { name: 'Aryash', title: 'Finance', photo: '/team/aryash.jpg' },
    ],
  },
]

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase() ?? '')
    .join('')
}

function initialsColor(index: number): string {
  const colors = [
    'bg-primary/15 text-primary',
    'bg-cyan-500/15 text-cyan-600 dark:text-cyan-300',
    'bg-rose-500/15 text-rose-600 dark:text-rose-300',
    'bg-amber-500/15 text-amber-600 dark:text-amber-300',
    'bg-emerald-500/15 text-emerald-600 dark:text-emerald-300',
  ]
  return colors[index % colors.length]
}

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
              A Ripple Effect Initiative
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
                          We are a volunteer crew building a community water database. We make
                          local water data open, searchable, and actionable &mdash; and we track
                          microplastics that almost no one else does.
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
                found in freshwater around the world &mdash; weren&apos;t
                in any public water database. Not the EPA. Not the EWG. Not
                state portals. There was no federal limit, no routine
                monitoring requirement, and no easy way for a community to
                see what was in their local rivers and lakes.
              </p>
              <p>
                So they started building. First, a low-cost microplastics
                identifier that anyone could build and operate. Then, an
                open database to publish what they measured &mdash; alongside
                the regulated-contaminant data already collected by federal
                and nonprofit databases, so the full picture sits in one
                place.
              </p>
              <p>
                Today, any volunteer can take the identifier, test their own
                local freshwater, and add their readings to this database. The
                result is a growing, community-powered map of what&apos;s
                actually in our water &mdash; including the things almost no
                one else is tracking.
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

      {/* Meet the team */}
            <section className="bg-water-hero">
              <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
                <div className="mx-auto mb-10 max-w-2xl text-center">
                  <Badge variant="secondary" className="mb-3 gap-1.5">
                    <Users className="h-3.5 w-3.5" />
                    Meet the team
                  </Badge>
                  <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    A volunteer crew
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                    No paid staff. Just a crew of volunteers organized into working
                    groups, led by our founder and president.
                  </p>
                </div>

                <div className="space-y-10">
                  {TEAM_GROUPS.map((g) => (
                    <motion.div
                      key={g.id}
                      variants={container}
                      initial="hidden"
                      whileInView="show"
                      viewport={{ once: true }}
                    >
                      <div className={`mb-4 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${g.accent}`}>
                        <span className="text-foreground">{g.group}</span>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                        {g.members.map((m, i) => (
                          <motion.div key={m.name} variants={item}>
                            <Card className="h-full overflow-hidden shadow-sm">
                              <CardContent className="flex flex-col items-center p-6 text-center">
                                <div className={`mb-3 flex h-20 w-20 items-center justify-center overflow-hidden rounded-full text-2xl font-extrabold ${initialsColor(i)}`}>
                                  {m.photo ? (
                                    /* eslint-disable-next-line @next/next/no-img-element */
                                    <img
                                      src={m.photo}
                                      alt={m.name}
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                                        e.currentTarget.nextElementSibling?.classList.remove('hidden')
                                      }}
                                    />
                                  ) : null}
                                  <span className={m.photo ? 'hidden' : ''}>
                                    {initials(m.name)}
                                  </span>
                                </div>
                                <h3 className="text-base font-bold text-foreground">{m.name}</h3>
                                <p className="mt-0.5 text-xs font-medium text-primary">{m.title}</p>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mx-auto mt-10 flex max-w-2xl flex-col items-center gap-2 rounded-xl border border-border bg-card p-5 text-center sm:flex-row sm:gap-4 sm:text-left">
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
              Test your local freshwater, dig into the data we&apos;ve already
              collected, or support the project. Every ripple counts.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Button onClick={() => onNavigate?.('submit')} size="lg">
                <Beaker className="mr-2 h-4 w-4" />
                Submit a reading
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
