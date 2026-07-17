'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  Search, Droplets, Map, FlaskConical, BarChart3, Recycle, GitCompare,
  Beaker, Database, Megaphone, Heart, Trophy, Info, HandHeart, Lock,
  Building2, MapPin, ArrowRight, Command as CommandIcon, BookOpen, PieChart, HelpCircle, Filter,
} from 'lucide-react'
import {
  CommandDialog, CommandEmpty, CommandGroup, CommandInput,
  CommandItem, CommandList, CommandSeparator, CommandShortcut,
} from '@/components/ui/command'
import { api } from '@/lib/api'
import type { Utility, Section } from '@/lib/types'

type NavItem = { id: Section; label: string; icon: React.ElementType; keywords?: string[] }

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', icon: Droplets, keywords: ['search', 'water', 'zip'] },
  { id: 'map', label: 'Map view', icon: Map, keywords: ['us', 'utilities', 'geography'] },
  { id: 'explorer', label: 'Contaminant catalog', icon: FlaskConical, keywords: ['lead', 'pfas', 'arsenic', 'microplastics'] },
  { id: 'microplastics', label: 'Microplastics spotlight', icon: BarChart3, keywords: ['plastic', 'particles', 'unregulated'] },
  { id: 'plastics', label: 'Plastics & emerging contaminants', icon: Recycle, keywords: ['nanoplastic', 'tire', 'pfas', 'forever chemicals'] },
  { id: 'compare', label: 'Compare utilities', icon: GitCompare, keywords: ['side by side', 'versus'] },
  { id: 'submit', label: 'Submit a reading', icon: Beaker, keywords: ['citizen', 'report', 'identifier'] },
  { id: 'sources', label: 'Data sources', icon: Database, keywords: ['ewg', 'epa', 'usgs', 'who'] },
  { id: 'reports', label: 'Community reports', icon: Megaphone, keywords: ['file', 'observation'] },
  { id: 'chapter', label: 'Start a chapter', icon: Heart, keywords: ['volunteer', 'kit', 'identifier'] },
  { id: 'leaderboard', label: 'Chapter leaderboard', icon: Trophy, keywords: ['rank', 'score', 'top'] },
  { id: 'dashboard', label: 'National dashboard', icon: PieChart, keywords: ['stats', 'charts', 'rankings', 'distribution'] },
  { id: 'about', label: 'About us', icon: Info, keywords: ['mission', 'story', 'crew'] },
  { id: 'glossary', label: 'Glossary', icon: BookOpen, keywords: ['terms', 'definitions', 'mcl', 'ppb', 'pfas', 'jargon'] },
  { id: 'faq', label: 'FAQ & Help', icon: HelpCircle, keywords: ['questions', 'help', 'support', 'how', 'why', 'what'] },
  { id: 'treatment', label: 'Water treatment guide', icon: Filter, keywords: ['filter', 'filtration', 'nsf', 'reverse osmosis', 'carbon', 'pitcher', 'distillation'] },
  { id: 'donate', label: 'Donate', icon: HandHeart, keywords: ['support', 'fund', 'goFundMe', 'crowdfund'] },
  { id: 'admin', label: 'Admin', icon: Lock, keywords: ['login', 'dashboard'] },
]

export function CommandPalette({
  onNavigate,
}: {
  onNavigate: (s: Section) => void
}) {
  const [open, setOpen] = useState(false)
  const [utilities, setUtilities] = useState<Utility[]>([])
  const [utilityQuery, setUtilityQuery] = useState('')

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [])

  // Load utilities when palette opens and query changes
  useEffect(() => {
    if (!open) return
    const q = utilityQuery.trim()
    // Debounce utility search
    const t = setTimeout(() => {
      api.searchUtilities(q || 'a').then(setUtilities).catch(() => setUtilities([]))
    }, 200)
    return () => clearTimeout(t)
  }, [open, utilityQuery])

  const handleNavigate = useCallback(
    (s: Section) => {
      setOpen(false)
      onNavigate(s)
      if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' })
    },
    [onNavigate]
  )

  const goHomeAndSearch = useCallback(
    (q: string) => {
      setOpen(false)
      onNavigate('home')
      // Store the query so the home page can pick it up
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('pendingSearch', q)
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100)
      }
    },
    [onNavigate]
  )

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Search utilities, navigate sections, or type a ZIP code..."
          value={utilityQuery}
          onValueChange={setUtilityQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>

          {/* Utility search results (if query looks like a search) */}
          {utilityQuery.trim().length > 0 && utilities.length > 0 && (
            <CommandGroup heading="Water utilities">
              {utilities.slice(0, 5).map((u) => (
                <CommandItem
                  key={u.id}
                  value={`utility ${u.name} ${u.city} ${u.state} ${u.pwsid} ${u.zipCodes}`}
                  onSelect={() => goHomeAndSearch(u.zipCodes.split(',')[0] || u.city)}
                >
                  <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate">{u.name}</span>
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" />
                      {u.city}, {u.state}
                    </span>
                  </div>
                  <ArrowRight className="h-3 w-3 opacity-50" />
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {/* Quick search by ZIP */}
          {/^\d{5}$/.test(utilityQuery.trim()) && (
            <CommandGroup heading="Search">
              <CommandItem
                value={`search-zip ${utilityQuery}`}
                onSelect={() => goHomeAndSearch(utilityQuery.trim())}
              >
                <Search className="mr-2 h-4 w-4 text-primary" />
                Search water for ZIP {utilityQuery.trim()}
                <ArrowRight className="ml-auto h-3 w-3 opacity-50" />
              </CommandItem>
            </CommandGroup>
          )}

          <CommandSeparator />

          {/* Navigation */}
          <CommandGroup heading="Navigate">
            {NAV_ITEMS.map(({ id, label, icon: Icon, keywords }) => (
              <CommandItem
                key={id}
                value={`nav ${label} ${keywords?.join(' ') ?? ''}`}
                onSelect={() => handleNavigate(id)}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                {label}
              </CommandItem>
            ))}
          </CommandGroup>

          <CommandSeparator />

          {/* External links */}
          <CommandGroup heading="Links">
            <CommandItem
              value="github repository source code"
              onSelect={() => {
                setOpen(false)
                window.open('https://github.com/Abotboot/Ripple-Effect', '_blank', 'noopener')
              }}
            >
              <CommandIcon className="mr-2 h-4 w-4 text-muted-foreground" />
              Open source on GitHub
              <CommandShortcut>↗</CommandShortcut>
            </CommandItem>
            <CommandItem
              value="email contact"
              onSelect={() => {
                setOpen(false)
                window.location.href = 'mailto:rippleeffectoffice@gmail.com'
              }}
            >
              <Megaphone className="mr-2 h-4 w-4 text-muted-foreground" />
              Email the crew
              <CommandShortcut>↗</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      {/* Floating trigger button (subtle, bottom-right) */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full border border-border bg-card/90 px-3 py-2 text-xs font-medium text-muted-foreground shadow-lg backdrop-blur-md transition-all hover:border-primary hover:text-primary sm:bottom-8 sm:right-8"
        aria-label="Open search (Cmd+K)"
      >
        <Search className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Search</span>
        <kbd className="pointer-events-none inline-flex h-4 select-none items-center gap-0.5 rounded border border-border bg-muted px-1 font-mono text-[9px] font-medium text-muted-foreground">
          <span className="text-[10px]">⌘</span>K
        </kbd>
      </button>
    </>
  )
}
