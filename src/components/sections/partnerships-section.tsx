'use client'

import { motion } from 'framer-motion'
import {
  Handshake, Building2, HeartHandshake, ArrowRight, Sparkles, Users, Globe, BookOpen,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import type { Section } from '@/components/site/site-header'

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

// Partners & sponsors. Add/remove entries here to update the page.
// Each partner can carry an optional url and logo (/public/partners/<file>.png).
type Partner = {
  name: string
  type: 'Sponsor' | 'Nonprofit Partner' | 'Fiscal Sponsor'
  blurb: string
  url?: string
  logo?: string
}

const PARTNERS: Partner[] = [
  {
    name: 'HCB · Hack Club Bank',
    type: 'Fiscal Sponsor',
    blurb:
      'Our fiscal sponsor. HCB lets donations be tax-deductible in the US and handles the financial plumbing so every dollar goes to clean water.',
    url: 'https://hcb.hackclub.com',
  },
  {
    name: 'Your organization here',
    type: 'Nonprofit Partner',
    blurb:
      'We partner with schools, nonprofits, and community groups to put the identifier in more hands and grow the volunteer water network.',
  },
]

const WHY_PARTNER = [
  {
    icon: Globe,
    title: 'Expand the map',
    blurb:
      'Partner with us and together we can monitor far more rivers, lakes, and streams than any one crew could reach alone.',
  },
  {
    icon: BookOpen,
    title: 'Shared science',
    blurb:
      'Nonprofits get free access to our open data, sampling protocols, and the microplastics identifier build guides.',
  },
  {
    icon: Users,
    title: 'Community reach',
    blurb:
      'We help amplify your water-focused programs and recruit volunteers through our chapters and social channels.',
  },
]

export function PartnershipsSection({ onNavigate }: { onNavigate?: (s: Section) => void }) {
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
              <Handshake className="mr-1 h-3 w-3" />
              Partnerships
            </Badge>
            <h1 className="text-balance text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              Partners & sponsors
            </h1>
            <p className="mt-4 text-pretty text-lg text-white/90 sm:text-xl">
              A Ripple Effect Initiative works with sponsors and nonprofits who
              believe clean, open water data belongs to everyone.
            </p>
          </div>
        </div>
      </section>

      {/* Partner grid */}
      <section className="bg-background">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              Who we work with
            </h2>
            <p className="mt-2 text-sm text-muted-foreground sm:text-base">
              Everyone below helps make the community water database possible.
            </p>
          </div>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {PARTNERS.map((p) => (
              <motion.div key={p.name} variants={item}>
                <Card className="flex h-full flex-col overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-lg hover:border-primary/40">
                  <CardContent className="flex flex-1 flex-col p-6">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white">
                        {p.logo ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={p.logo} alt={`${p.name} logo`} className="h-full w-full rounded-xl object-cover" />
                        ) : (
                          <Building2 className="h-5 w-5" />
                        )}
                      </div>
                      <Badge variant="secondary" className="bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300">
                        {p.type}
                      </Badge>
                    </div>
                    <h3 className="text-lg font-bold text-foreground">{p.name}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{p.blurb}</p>
                    {p.url && (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                      >
                        Visit <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}

            {/* Become a partner card */}
            <motion.div variants={item}>
              <Card className="flex h-full flex-col justify-center border-dashed bg-muted/30 text-center">
                <CardContent className="p-6">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <HeartHandshake className="h-5 w-5" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground">Become a partner</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Want to sponsor or collaborate? We&apos;d love to hear from you.
                  </p>
                  <Button
                    onClick={() => onNavigate?.('about')}
                    variant="outline"
                    className="mt-4"
                  >
                    Contact us
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Why partner */}
      <section className="border-t border-border/60 bg-card/50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
          <div className="mx-auto mb-8 max-w-2xl text-center">
            <Badge variant="secondary" className="mb-3 gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Why partner with us
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              One act, endless impact
            </h2>
          </div>
          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {WHY_PARTNER.map((w) => {
              const Icon = w.icon
              return (
                <motion.div key={w.title} variants={item}>
                  <Card className="h-full">
                    <CardContent className="flex items-start gap-4 p-6">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-foreground">{w.title}</h3>
                        <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{w.blurb}</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )
            })}
          </motion.div>
        </div>
      </section>
    </div>
  )
}