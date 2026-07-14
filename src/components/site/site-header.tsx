'use client'

import { Droplets, Menu, X, Github, BarChart3, FlaskConical, Megaphone, Lock, Map, Heart } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/site/theme-toggle'

export type Section =
  | 'home'
  | 'explorer'
  | 'microplastics'
  | 'reports'
  | 'map'
  | 'volunteer'
  | 'admin'

const NAV: Array<{ id: Section; label: string; icon: React.ElementType }> = [
  { id: 'home', label: 'Home', icon: Droplets },
  { id: 'map', label: 'Map', icon: Map },
  { id: 'explorer', label: 'Contaminants', icon: FlaskConical },
  { id: 'microplastics', label: 'Microplastics', icon: BarChart3 },
  { id: 'reports', label: 'Community', icon: Megaphone },
  { id: 'volunteer', label: 'Get Involved', icon: Heart },
  { id: 'admin', label: 'Admin', icon: Lock },
]

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
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <button
          onClick={() => go('home')}
          className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]"
          aria-label="AquaGuard home"
        >
          <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-water-surface shadow-md shadow-primary/30">
            <Droplets className="h-5 w-5 text-primary-foreground" />
          </span>
          <span className="hidden sm:flex flex-col items-start leading-none">
            <span className="text-lg font-extrabold tracking-tight text-foreground">
              Aqua<span className="text-primary">Guard</span>
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              Water Database
            </span>
          </span>
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => go(id)}
              className={cn(
                'group inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                current === id
                  ? 'bg-primary/10 text-primary'
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
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex"
            aria-label="GitHub"
          >
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
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
        <nav className="lg:hidden border-t border-border/60 bg-background px-4 py-3">
          <div className="grid gap-1">
            {NAV.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => go(id)}
                className={cn(
                  'inline-flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                  current === id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </header>
  )
}
