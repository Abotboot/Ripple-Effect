'use client'

import { Droplets, Github, BarChart3, Megaphone, Lock, Map, Info, HandHeart, Database, Beaker, HelpCircle, Handshake } from 'lucide-react'
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'
import './site-chrome.css'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import { setScrollLocked } from '@/components/atmosphere/smooth-current'
import { RollText } from '@/components/motion/roll-text'

export type Section =
  | 'home'
  | 'map'
  | 'microplastics'
  | 'reports'
  | 'sources'
  | 'submit'
  | 'about'
  | 'partners'
  | 'faq'
  | 'donate'
  | 'admin'
  | 'privacy'
  | 'terms'

const NAV: Array<{ id: Section; label: string; icon: React.ElementType; blurb: string }> = [
  { id: 'home', label: 'Home', icon: Droplets, blurb: 'Search your water' },
  { id: 'about', label: 'About Us', icon: Info, blurb: 'The initiative' },
  { id: 'partners', label: 'Partnerships', icon: Handshake, blurb: 'Work with us' },
  { id: 'map', label: 'Map', icon: Map, blurb: 'Readings on the water' },
  { id: 'microplastics', label: 'Microplastics', icon: BarChart3, blurb: 'Research & records' },
  { id: 'submit', label: 'Submit Reading', icon: Beaker, blurb: 'Pin your sample' },
  { id: 'sources', label: 'Data Sources', icon: Database, blurb: 'Where data comes from' },
  { id: 'reports', label: 'Community', icon: Megaphone, blurb: 'Field reports' },
  { id: 'faq', label: 'FAQ', icon: HelpCircle, blurb: 'Answers' },
  { id: 'donate', label: 'Donate', icon: HandHeart, blurb: 'Fund the identifier' },
  { id: 'admin', label: 'Admin', icon: Lock, blurb: 'Crew sign-in' },
]

const DESKTOP_NAV = NAV.filter(({ id }) =>
  ['home', 'about', 'partners', 'map', 'microplastics', 'submit'].includes(id)
)

const REPO_URL = 'https://github.com/Abotboot/Ripple-Effect'

const subscribeNever = () => () => {}

export function SiteHeader({
  current,
  onNavigate,
}: {
  current: Section
  onNavigate: (s: Section) => void
}) {
  const [open, setOpen] = useState(false)
  const [hovered, setHovered] = useState<Section | null>(null)
  const [tucked, setTucked] = useState(false)
  const [origin, setOrigin] = useState({ x: 0, y: 0 })
  // True only on the client, so the portal never runs during server rendering.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false)
  const menuButton = useRef<HTMLButtonElement>(null)
  const firstItem = useRef<HTMLButtonElement>(null)

  // Tuck the header away while reading down the page; it returns on any upward
  // scroll. The position is read in the scroll event itself, where it is cheap
  // (inside a later frame callback it can force a layout of the whole page).
  useEffect(() => {
    let last = window.scrollY
    let tuck = false
    const onScroll = () => {
      const y = window.scrollY
      const delta = y - last
      let next = tuck
      if (Math.abs(delta) > 6) { next = delta > 0 && y > 140; last = y }
      if (y < 140) next = false
      if (next !== tuck) { tuck = next; setTucked(next) }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setScrollLocked(open)
    document.documentElement.classList.toggle('site-menu-open', open)
    if (open) requestAnimationFrame(() => firstItem.current?.focus({ preventScroll: true }))
    return () => { setScrollLocked(false); document.documentElement.classList.remove('site-menu-open') }
  }, [open])

  const toggleMenu = () => {
    const rect = menuButton.current?.getBoundingClientRect()
    if (rect) setOrigin({ x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 })
    setOpen(value => !value)
  }

  const go = (s: Section) => {
    setOpen(false)
    onNavigate(s)
  }

  const radius = typeof window === 'undefined' ? 2000 : Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), window.innerHeight)

  return (
    <header
      className="site-header sticky top-0 z-50 w-full"
      data-tucked={tucked && !open ? '' : undefined}
      onKeyDown={event => { if (event.key === 'Escape' && open) { setOpen(false); menuButton.current?.focus() } }}
    >
      {/* Reading progress, driven by the scroll position in CSS (no script). */}
      <div
        aria-hidden="true"
        className="site-read-progress absolute inset-x-0 top-0 h-[3px] origin-left bg-gradient-to-r from-primary via-cyan-400 to-primary motion-reduce:hidden"
      />
      <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 py-2 sm:px-6 lg:px-8">
        {/* Brand, logo zoomed in (bigger) */}
        <button
          onClick={() => go('home')}
          className="site-brand group flex shrink-0 items-center gap-3"
          aria-label="A Ripple Effect Initiative home"
        >
          <div className="site-brand-seal">
            <img
              src="/logo-96.webp"
              alt="A Ripple Effect Initiative logo"
              className="h-full w-full object-cover"
            />
          </div>
          <span className="hidden sm:flex flex-col items-start leading-none">
            <span className="site-brand-word">
              A Ripple<span className="text-primary"> Effect Initiative</span>
            </span>
            <span className="mt-0.5 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
              One act. Endless impact.
            </span>
          </span>
        </button>

        {/* Desktop nav: the highlight glides between items instead of jumping. */}
        <nav aria-label="Primary navigation" className="site-nav-desktop hidden xl:flex items-center gap-0.5" onMouseLeave={() => setHovered(null)}>
          {DESKTOP_NAV.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => go(id)}
              onMouseEnter={() => setHovered(id)}
              onFocus={() => setHovered(id)}
              onBlur={() => setHovered(null)}
              aria-current={current === id ? 'page' : undefined}
              className="site-nav-item"
            >
              {hovered === id && (
                <motion.span layoutId="site-nav-hover" className="site-nav-hover" transition={{ type: 'spring', stiffness: 420, damping: 36 }} aria-hidden="true" />
              )}
              {current === id && (
                <motion.span layoutId="site-nav-active" className="site-nav-active" transition={{ type: 'spring', stiffness: 380, damping: 34 }} aria-hidden="true" />
              )}
              <span className="relative">{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => go('donate')}
            className="site-donate-link"
            aria-current={current === 'donate' ? 'page' : undefined}
            data-testid="header-donate"
            data-magnetic
            data-roll
          >
            <HandHeart className="h-4 w-4" aria-hidden="true" />
            <RollText text="Donate" />
          </button>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="site-github hidden sm:inline-flex"
            aria-label="A Ripple Effect Initiative GitHub repository"
            title="Open source on GitHub"
          >
            <Github className="h-4 w-4" aria-hidden="true" />
          </a>
          <button
            type="button"
            className="site-menu-toggle"
            onClick={toggleMenu}
            ref={menuButton}
            aria-label="Toggle menu"
            aria-controls="site-navigation-menu"
            aria-expanded={open}
            data-open={open ? '' : undefined}
          >
            <span aria-hidden="true" /><span aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Full menu: ripples open from the menu button. Portaled to <body>
          because the header's backdrop-filter would trap a fixed child. */}
      {mounted && createPortal(<AnimatePresence>
        {open && (
          <motion.nav
            id="site-navigation-menu"
            aria-label="All sections"
            data-lenis-prevent
            className="site-nav-menu"
            initial={{ clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` }}
            animate={{ clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)` }}
            exit={{ clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` }}
            transition={{ duration: 0.75, ease: [0.83, 0, 0.17, 1] }}
          >
            <div className="site-nav-menu-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
              <ol className="site-nav-menu-list">
                {NAV.map(({ id, label, blurb }, index) => (
                  <motion.li
                    key={id}
                    initial={{ opacity: 0, y: 28 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 12, transition: { duration: 0.2 } }}
                    transition={{ delay: 0.18 + index * 0.035, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <button
                      ref={index === 0 ? firstItem : undefined}
                      onClick={() => go(id)}
                      aria-current={current === id ? 'page' : undefined}
                      className={cn('site-nav-menu-item', id === 'donate' && 'site-donate-menu')}
                    >
                      <span className="site-nav-menu-index">{String(index + 1).padStart(2, '0')}</span>
                      <span className="site-nav-menu-label">{label}</span>
                      <span className="site-nav-menu-blurb">{blurb}</span>
                    </button>
                  </motion.li>
                ))}
              </ol>
              <motion.div
                className="site-nav-menu-foot"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, transition: { delay: 0.55 } }}
                exit={{ opacity: 0, transition: { duration: 0.15 } }}
              >
                <span>One act. Endless impact.</span>
                <a href={REPO_URL} target="_blank" rel="noopener noreferrer">
                  <Github className="h-4 w-4" aria-hidden="true" />
                  GitHub Repo
                </a>
              </motion.div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>, document.body)}
    </header>
  )
}
