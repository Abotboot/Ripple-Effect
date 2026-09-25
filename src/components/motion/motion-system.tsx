'use client'

import { useEffect } from 'react'
import './motion.css'

// One place for page-wide motion so every section feels like the same water:
//  - scroll reveals for [data-reveal] / [data-split] (and common content that
//    is tagged automatically), driven by a single IntersectionObserver
//  - looping decoration ([data-loop]) that pauses while off screen
//  - a pointer spotlight on cards and a magnetic pull on primary actions
// Everything is transform/opacity only, pauses when idle, and switches off
// entirely for prefers-reduced-motion.

// Content tagged automatically, so new sections get motion without extra markup.
const AUTO_REVEAL = [
  'main h1:not([data-split])',
  'main h2:not([data-split])',
  'main [data-slot=card]',
  '.home-data > section > div > .grid > *',
  '.editorial-page section > div > .grid > *',
  '.legal-page > div > section',
].join(',')

// Never animate these in: they are interactive surfaces or already choreographed.
const AUTO_SKIP = '[data-no-reveal], .tank-hero, .ripple-hero, [role=dialog], .leaflet-container, .particle-atlas, .water-narrative, .bottle-story, [data-slot=dialog-content]'

export function MotionSystem() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    const root = document.documentElement
    const cleanups: Array<() => void> = []

    if (reduced.matches) {
      root.classList.remove('motion-ready')
      return
    }
    root.classList.add('motion-ready')
    cleanups.push(() => root.classList.remove('motion-ready'))

    // -- Reveals ----------------------------------------------------------
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        el.setAttribute('data-revealed', '')
        observer.unobserve(el)
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.08 })

    // Infinite loops only run while their element can be seen.
    const loops = new IntersectionObserver(entries => {
      for (const entry of entries) entry.target.toggleAttribute('data-inview', entry.isIntersecting)
    })
    cleanups.push(() => loops.disconnect())

    const bound = new WeakSet<Element>()
    const scan = () => {
      for (const el of document.querySelectorAll<HTMLElement>(AUTO_REVEAL)) {
        if (el.hasAttribute('data-reveal') || el.closest(AUTO_SKIP)) continue
        // Already choreographed by framer-motion (it drives inline opacity).
        if (el.closest('[style*="opacity"]')) continue
        el.setAttribute('data-reveal', el.matches('main h1') ? 'mask' : '')
        // Stagger siblings that arrive together (grids of cards).
        const parent = el.parentElement
        if (parent && !el.style.getPropertyValue('--reveal-delay')) {
          const index = Array.prototype.indexOf.call(parent.children, el)
          if (index > 0) el.style.setProperty('--reveal-delay', `${Math.min(index, 7) * 70}ms`)
        }
      }
      for (const el of document.querySelectorAll('[data-reveal]:not([data-revealed]), [data-split]:not([data-revealed])')) {
        if (bound.has(el)) continue
        bound.add(el)
        observer.observe(el)
      }
      for (const el of document.querySelectorAll('[data-loop]')) {
        if (bound.has(el)) continue
        bound.add(el)
        loops.observe(el)
      }
    }
    let scanTimer = 0
    const scheduleScan = () => {
      if (scanTimer) return
      scanTimer = window.setTimeout(() => { scanTimer = 0; requestAnimationFrame(scan) }, 120)
    }
    scan()
    const mutations = new MutationObserver(scheduleScan)
    mutations.observe(document.body, { childList: true, subtree: true })
    cleanups.push(() => { observer.disconnect(); mutations.disconnect(); clearTimeout(scanTimer) })

    if (!finePointer.matches) return () => cleanups.forEach(fn => fn())

    // -- Spotlight and magnetic pull (precise pointers only) --------------
    let magnet: HTMLElement | null = null
    let spot: HTMLElement | null = null

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const target = event.target instanceof Element ? event.target : null

      const nextSpot = target?.closest<HTMLElement>('[data-spotlight], main [data-slot=card], .water-index-card') ?? null
      if (nextSpot) {
        const rect = nextSpot.getBoundingClientRect()
        nextSpot.style.setProperty('--mx', `${event.clientX - rect.left}px`)
        nextSpot.style.setProperty('--my', `${event.clientY - rect.top}px`)
      }
      if (spot && spot !== nextSpot) spot.removeAttribute('data-spot-on')
      if (nextSpot && nextSpot !== spot) nextSpot.setAttribute('data-spot-on', '')
      spot = nextSpot

      const nextMagnet = target?.closest<HTMLElement>('[data-magnetic]') ?? null
      if (magnet && magnet !== nextMagnet) {
        magnet.style.setProperty('--mag-x', '0px')
        magnet.style.setProperty('--mag-y', '0px')
      }
      magnet = nextMagnet
      if (magnet) {
        const rect = magnet.getBoundingClientRect()
        const dx = event.clientX - (rect.left + rect.width / 2)
        const dy = event.clientY - (rect.top + rect.height / 2)
        magnet.style.setProperty('--mag-x', `${Math.max(-10, Math.min(10, dx * 0.22))}px`)
        magnet.style.setProperty('--mag-y', `${Math.max(-8, Math.min(8, dy * 0.3))}px`)
      }
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    cleanups.push(() => window.removeEventListener('pointermove', onMove))

    return () => cleanups.forEach(fn => fn())
  }, [])

  return null
}
