'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Trophy, Medal, Award, Users, MapPin, FlaskConical, Megaphone,
  TrendingUp, Crown, Loader2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'

type LeaderEntry = {
  id: string
  name: string
  chapterName: string | null
  city: string | null
  state: string | null
  waterBody: string | null
  status: string
  createdAt: string
  reportCount: number
  sampleCount: number
  score: number
  rank: number
}

const RANK_ICONS: Array<{ icon: React.ElementType; color: string; bg: string }> = [
  { icon: Crown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/50' },
  { icon: Medal, color: 'text-slate-500 dark:text-slate-400', bg: 'bg-slate-100 dark:bg-slate-800/50' },
  { icon: Award, color: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-100 dark:bg-orange-950/50' },
]

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  onboarded: 'bg-teal-100 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300',
  contacted: 'bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300',
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300',
  declined: 'bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300',
}

export function LeaderboardSection() {
  const [data, setData] = useState<{ leaderboard: LeaderEntry[]; totalChapters: number; activeChapters: number } | null>(null)

  useEffect(() => {
    api.getLeaderboard().then(setData).catch(() => setData({ leaderboard: [], totalChapters: 0, activeChapters: 0 }))
  }, [])

  const top3 = data?.leaderboard.slice(0, 3) ?? []
  const rest = data?.leaderboard.slice(3) ?? []

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
              <Trophy className="mr-1 h-3 w-3" />
              Chapter leaderboard
            </Badge>
            <h1 className="text-balance text-3xl font-extrabold tracking-tight sm:text-4xl lg:text-5xl">
              Top chapters making waves
            </h1>
            <p className="mt-4 text-pretty text-base text-white/90 sm:text-lg">
              Chapters are ranked by community impact: reports filed from their
              region, sample data coverage, and onboarding status. Climb the
              ranks by testing more water and sharing more reports.
            </p>
            {data && (
              <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-white/85">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {data.totalChapters} total chapters
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4" />
                  {data.activeChapters} active
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {!data ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : data.leaderboard.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <Trophy className="mx-auto h-12 w-12 text-muted-foreground/40" />
              <h3 className="mt-4 text-lg font-semibold">No chapters ranked yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first to start a chapter and claim the #1 spot.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Podium - top 3 */}
            {top3.length > 0 && (
              <div className="mb-8 grid gap-4 sm:grid-cols-3">
                {top3.map((entry, i) => {
                  const rankInfo = RANK_ICONS[i] ?? RANK_ICONS[2]
                  const RankIcon = rankInfo.icon
                  const isFirst = i === 0
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.1 }}
                      className={cn(
                        'relative',
                        isFirst && 'sm:-mt-4 sm:mb-4'
                      )}
                    >
                      <Card className={cn(
                        'h-full overflow-hidden',
                        isFirst && 'border-amber-300/60 dark:border-amber-600/40'
                      )}>
                        <div className={cn('flex items-center justify-between px-5 py-3', rankInfo.bg)}>
                          <div className="flex items-center gap-2">
                            <RankIcon className={cn('h-6 w-6', rankInfo.color)} />
                            <span className="text-sm font-bold text-foreground">#{entry.rank}</span>
                          </div>
                          <span className="text-2xl font-extrabold tabular-nums text-foreground">
                            {entry.score}
                          </span>
                        </div>
                        <CardContent className="p-5">
                          <h3 className="text-base font-bold text-foreground">
                            {entry.chapterName || entry.name}
                          </h3>
                          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3" />
                            {[entry.city, entry.state].filter(Boolean).join(', ') || 'Location TBD'}
                          </div>
                          {entry.waterBody && (
                            <p className="mt-1 truncate text-[11px] text-muted-foreground">
                              Testing: {entry.waterBody}
                            </p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[entry.status] ?? STATUS_COLORS.pending)}>
                              {entry.status}
                            </span>
                          </div>
                          <div className="mt-3 grid grid-cols-2 gap-2 text-center">
                            <div className="rounded-md bg-muted/40 p-2">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Reports</div>
                              <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{entry.reportCount}</div>
                            </div>
                            <div className="rounded-md bg-muted/40 p-2">
                              <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Samples</div>
                              <div className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{entry.sampleCount}</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Rest of the leaderboard */}
            {rest.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Trophy className="h-4 w-4 text-primary" />
                    Full standings
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border bg-muted/30 text-left">
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Rank</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Chapter</th>
                          <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <FlaskConical className="mr-1 inline h-3 w-3" />
                            Samples
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            <Megaphone className="mr-1 inline h-3 w-3" />
                            Reports
                          </th>
                          <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rest.map((entry, i) => (
                          <motion.tr
                            key={entry.id}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            viewport={{ once: true }}
                            transition={{ delay: Math.min(i * 0.04, 0.3) }}
                            className="border-b border-border/40 transition-colors hover:bg-muted/30"
                          >
                            <td className="px-4 py-3">
                              <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-muted text-xs font-bold text-muted-foreground">
                                {entry.rank}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-foreground">{entry.chapterName || entry.name}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {[entry.city, entry.state].filter(Boolean).join(', ') || 'Location TBD'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={cn('rounded-md px-1.5 py-0.5 text-[10px] font-medium', STATUS_COLORS[entry.status] ?? STATUS_COLORS.pending)}>
                                {entry.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">{entry.sampleCount}</td>
                            <td className="px-4 py-3 text-right tabular-nums text-foreground">{entry.reportCount}</td>
                            <td className="px-4 py-3 text-right">
                              <span className="font-bold tabular-nums text-primary">{entry.score}</span>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* How scoring works */}
            <Card className="mt-6 border-primary/20 bg-primary/5">
              <CardContent className="p-5">
                <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  How the score is calculated
                </h3>
                <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                  <li>• <strong className="text-foreground">+3 points</strong> per community report filed from your state</li>
                  <li>• <strong className="text-foreground">+1 point</strong> per sample measurement covering your state</li>
                  <li>• <strong className="text-foreground">+5 bonus</strong> for active chapters, +3 for onboarded</li>
                </ul>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  As chapters start submitting their own identifier readings directly, the scoring will weight those first-party measurements more heavily.
                </p>
              </CardContent>
            </Card>
          </>
        )}
      </section>
    </div>
  )
}
