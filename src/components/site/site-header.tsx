'use client'

import { Droplets, Menu, X, Github, BarChart3, FlaskConical, Megaphone, Lock, Map, Heart, Info, HandHeart, Database, Recycle, GitCompare, Trophy, Beaker, BookOpen, PieChart, HelpCircle, Filter } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/site/theme-toggle'

export type Section =
  | 'home'
  | 'map'
  | 'explorer'
  | 'microplastics'
  | 'plastics'
  | 'reports'
  | 'sources'
  | 'compare'
  | 'submit'
  | 'chapter'
  | 'leaderboard'
  | 'dashboard'
  | 'about'
  | 'glossary'
  | 'faq'
  | 'treatment'
  | 'donate'
  | 'admin'

const NAV: Array<{ id: Section; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'Home', icon: Droplets },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'explorer', label: 'Contaminants', icon: FlaskConical },
  { id: 'microplastics', label: 'Microplastics', icon: BarChart3 },
  { id: 'plastics', label: 'Plastics', icon: Recycle },
  { id: 'compare', label: 'Compare', icon: GitCompare },
  { id: 'submit', label: 'Submit Reading', icon: Beaker },
  { id: 'sources', label: 'Data Sources', icon: Database },
  { id: 'reports', label: 'Community', icon: Megaphone },
  { id: 'chapter', label: 'Start a Chapter', icon: Heart },
  { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
  { id: 'dashboard', label: 'Dashboard', icon: PieChart },
  { id: 'about', label: 'About', icon: Info },
  { id: 'glossary', label: 'Glossary', icon: BookOpen },
  { id: 'faq', label: 'FAQ', icon: HelpCircle },
  { id: 'treatment', label: 'Treatment', icon: Filter },
  { id: 'donate', label: 'Donate', icon: HandHeart },
  { id: 'admin', label: 'Admin', icon: Lock },
]

const DESKTOP_NAV = NAV.filter(({ id }) =>
  ['home', 'map', 'explorer', 'microplastics', 'compare', 'submit', 'donate'].includes(id)
)

const REPO_URL = 'https://github.com/Abotboot/Ripple-Effect'

export function SiteHeader({
  current,
  onNavigate,
}: {
  current: Section
  onNavigate: (s: Section) => void
}) {
  const [open, setOpen] = useState(false)

  const go = (s: Section) => {
    onNavigate(s)
    setOpen(false)
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        {/* Brand — logo zoomed in (bigger) */}
        <button
          onClick={() => go('home')}
          className="group flex shrink-0 items-center gap-3 transition-transform hover:scale-[1.02]"
          aria-label="A Ripples Effect home"
        >
          <div className="relative h-12 w-12 sm:h-14 sm:w-14 shrink-0 overflow-hidden rounded-full ring-2 ring-primary/30 shadow-lg shadow-primary/20 transition-all group-hover:ring-primary/60 group-hover:shadow-primary/40">
            <img
              src="/logo.png"
              alt="A Ripples Effect logo"
              className="h-full w-full scale-110 object-cover transition-transform duration-300 group-hover:scale-125"
            />
          </div>
          <span className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              A Ripples<span className="text-primary"> Effect</span>
            </span>
            <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              One Act. Endless Impact.
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden xl:flex items-center gap-0.5">
          {DESKTOP_NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-colors',
                current === id
                  ? id === 'donate'
                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                    : 'bg-primary/10 text-primary'
                  : id === 'donate'
                    ? 'text-rose-600 hover:bg-rose-500/10 dark:text-rose-400'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <ThemeToggle />
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex"
            aria-label="A Ripples Effect GitHub repository"
            title="Open source on GitHub"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setOpen((o) => !o)}
            aria-label="Toggle menu"
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile nav */}
      {open && (
        <nav className="border-t border-border/60 bg-background px-4 py-3">
          <div className="mx-auto grid max-w-7xl gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={cn(
                  'inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  current === id
                    ? id === 'donate'
                      ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                      : 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
            <a
              href={REPO_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Github className="h-4 w-4" />
              GitHub Repo
            </a>
          </div>
        </nav>
      )}
    </header>
  )
}
