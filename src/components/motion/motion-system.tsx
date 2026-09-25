'use client'

import { useEffect } from 'react'
import './motion.css'

// One place for page-wide motion so every section feels like the same water:
//  - scroll reveals for [data-reveal] / [data-split] (and common content that
//    is tagged automatically), driven by a single IntersectionObserver
//  - a ripple that spreads from every tap or click on a control, and wider
//    rings when the water itself ([data-ripple-surface]) is touched
//  - looping decoration ([data-loop]) that pauses while off screen
//  - a pointer spotlight on cards and a magnetic pull on primary actions
//  - a trailing lens cursor on precise pointers
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

const INTERACTIVE = 'a[href], button:not(:disabled), [role=button], [role=tab], summary, label[for], select, [data-cursor]'
const TEXTUAL = 'input:not([type=button]):not([type=submit]):not([type=checkbox]):not([type=radio]), textarea, [contenteditable=true]'

let lastPointer = { x: 0, y: 0, at: 0 }
/**
 * Where the latest tap or click happened, for transitions that grow from it.
 * Keyboard activation falls back to the focused control's centre.
 */
export function lastPointerPosition(): { x: number; y: number } {
  if (performance.now() - lastPointer.at < 1500) return lastPointer
  const focused = document.activeElement
  if (focused instanceof HTMLElement && focused !== document.body) {
    const rect = focused.getBoundingClientRect()
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  }
  return { x: window.innerWidth / 2, y: window.innerHeight / 3 }
}

export function MotionSystem() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const finePointer = matchMedia('(hover: hover) and (pointer: fine)')
    const root = document.documentElement
    const cleanups: Array<() => void> = []

    const onPointerDown = (event: PointerEvent) => { lastPointer = { x: event.clientX, y: event.clientY, at: performance.now() } }
    window.addEventListener('pointerdown', onPointerDown, { capture: true, passive: true })
    cleanups.push(() => window.removeEventListener('pointerdown', onPointerDown, { capture: true }))

    if (reduced.matches) {
      root.classList.remove('motion-ready')
      return () => cleanups.forEach(fn => fn())
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

    // -- Tap ripples ------------------------------------------------------
    const layer = document.createElement('div')
    layer.className = 'tap-ripple-layer'
    layer.setAttribute('aria-hidden', 'true')
    document.body.append(layer)
    cleanups.push(() => layer.remove())
    const onTap = (event: PointerEvent) => {
      if (event.button !== 0) return
      const target = event.target instanceof Element ? event.target : null
      if (!target || target.closest('.leaflet-container, [data-no-ripple]')) return
      const control = target.closest(INTERACTIVE)
      const surface = !control && target.closest('[data-ripple-surface]')
      if (!control && !surface) return
      if (layer.childElementCount > 6) layer.firstElementChild?.remove()
      const ripple = document.createElement('span')
      ripple.className = surface ? 'tap-ripple tap-ripple--surface' : 'tap-ripple'
      ripple.style.left = `${event.clientX}px`
      ripple.style.top = `${event.clientY}px`
      ripple.append(document.createElement('i'), document.createElement('i'))
      if (surface) ripple.append(document.createElement('i'))
      ripple.addEventListener('animationend', () => ripple.remove(), { once: true })
      layer.append(ripple)
    }
    window.addEventListener('pointerdown', onTap, { passive: true })
    cleanups.push(() => window.removeEventListener('pointerdown', onTap))

    if (!finePointer.matches) return () => cleanups.forEach(fn => fn())

    // -- Spotlight, magnetic pull and lens (precise pointers only) ---------
    const lens = document.createElement('div')
    lens.className = 'cursor-lens'
    lens.dataset.state = 'hidden'
    lens.setAttribute('aria-hidden', 'true')
    const label = document.createElement('span')
    lens.append(label)
    document.body.append(lens)
    cleanups.push(() => lens.remove())

    const pointer = { x: -100, y: -100 }
    const eased = { x: -100, y: -100 }
    let lensFrame = 0
    let magnet: HTMLElement | null = null
    let spot: HTMLElement | null = null

    const tickLens = () => {
      eased.x += (pointer.x - eased.x) * 0.2
      eased.y += (pointer.y - eased.y) * 0.2
      lens.style.transform = `translate3d(${eased.x}px, ${eased.y}px, 0)`
      // Stop the loop once settled, so an idle page does no per-frame work.
      lensFrame = Math.abs(pointer.x - eased.x) + Math.abs(pointer.y - eased.y) > 0.3 ? requestAnimationFrame(tickLens) : 0
    }

    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      pointer.x = event.clientX
      pointer.y = event.clientY
      if (!lensFrame) lensFrame = requestAnimationFrame(tickLens)
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

    const onOver = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      const target = event.target instanceof Element ? event.target : null
      if (!target) return
      if (target.closest('.leaflet-container') || target.closest(TEXTUAL)) { lens.dataset.state = 'hidden'; return }
      const interactive = target.closest<HTMLElement>(INTERACTIVE)
      const text = interactive?.closest<HTMLElement>('[data-cursor]')?.dataset.cursor ?? ''
      label.textContent = text
      lens.dataset.state = interactive ? (text ? 'label' : 'hover') : 'idle'
    }
    const onLeave = () => { lens.dataset.state = 'hidden' }
    const onPress = () => lens.setAttribute('data-pressed', '')
    const onRelease = () => lens.removeAttribute('data-pressed')

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerover', onOver, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    window.addEventListener('pointerdown', onPress, { passive: true })
    window.addEventListener('pointerup', onRelease, { passive: true })
    cleanups.push(() => {
      cancelAnimationFrame(lensFrame)
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerover', onOver)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      window.removeEventListener('pointerdown', onPress)
      window.removeEventListener('pointerup', onRelease)
    })

    return () => cleanups.forEach(fn => fn())
  }, [])

  return null
}
