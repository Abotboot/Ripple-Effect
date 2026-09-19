'use client'

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import { CinematicIntro, type IntroOutcome } from './cinematic-intro'
import { HeroParticleStage } from './hero-particle-stage'
import './tank.css'
import './cinematic-intro.css'

export { TankCanvas } from './tank-canvas'

const reducedMotionQuery = '(prefers-reduced-motion: reduce)'
const serverBypass = () => false
const clientHydrated = () => true
const subscribeHydration = () => () => {}
const readReducedMotion = () => matchMedia(reducedMotionQuery).matches
function subscribeReducedMotion(notify: () => void) {
  const preference = matchMedia(reducedMotionQuery)
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}
function readReturningSession() {
  if (window.location.hash) return true
  try { return Boolean(sessionStorage.getItem('ripple-entered')) } catch { return false }
}
function subscribeReturningSession(notify: () => void) {
  window.addEventListener('hashchange', notify)
  window.addEventListener('storage', notify)
  return () => { window.removeEventListener('hashchange', notify); window.removeEventListener('storage', notify) }
}
function headerOffset() {
  const header = document.querySelector<HTMLElement>('.site-header')
  if (!header) return 0
  const position = getComputedStyle(header).position
  return position === 'sticky' || position === 'fixed' ? header.getBoundingClientRect().height : 0
}

export function TankHero({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverBypass)
  const [active, setActive] = useState(false)
  const [reveal, setReveal] = useState(true)
  const [terminal, setTerminal] = useState(false)
  const [entered, setEntered] = useState(false)
  const reduced = useSyncExternalStore(subscribeReducedMotion, readReducedMotion, serverBypass)
  const returning = useSyncExternalStore(subscribeReturningSession, readReturningSession, serverBypass)
  const visited = entered || returning || reduced
  const [outcome, setOutcome] = useState<IntroOutcome | null>(null)
  const [unavailableArtwork, setUnavailableArtwork] = useState<'master' | 'terminal' | null>(null)
  const root = useRef<HTMLElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const editorial = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(false)

  const remember = useCallback(() => {
    setEntered(true)
    try { sessionStorage.setItem('ripple-entered', '1') } catch { /* Optional storage. */ }
  }, [])
  const focusSearch = useCallback(() => {
    editorial.current?.removeAttribute('inert')
    const input = root.current?.querySelector<HTMLInputElement>('.tank-search input')
    input?.focus({ preventScroll: true })
    const bounds = input?.getBoundingClientRect()
    const offset = headerOffset()
    if (input) input.style.scrollMarginTop = `${offset}px`
    if (bounds && (bounds.top < offset || bounds.bottom > window.innerHeight)) {
      input?.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }
  }, [])
  const finish = useCallback((reason: IntroOutcome) => {
    // Restore focus when the focused player disappears, without interrupting
    // someone already using the revealed HTML form or another page control.
    pendingFocus.current = reason === 'skip' || Boolean(root.current?.querySelector('.ripple-intro')?.contains(document.activeElement))
    setActive(false)
    setReveal(true)
    setTerminal(true)
    setOutcome(reason)
    remember()
  }, [remember])
  useLayoutEffect(() => {
    if (active && !reveal) editorial.current?.setAttribute('inert', '')
    else {
      editorial.current?.removeAttribute('inert')
      if (pendingFocus.current) { pendingFocus.current = false; focusSearch() }
    }
  }, [active, reveal, focusSearch])
  const watch = () => {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { remember(); focusSearch(); return }
    // Watch can be below the stage on small screens or after scrolling back.
    // Move the viewport in the real interaction before the observer starts.
    if (media.current) {
      media.current.style.scrollMarginTop = `${headerOffset()}px`
      media.current.scrollIntoView({ block: 'start', behavior: 'instant' })
    }
    setOutcome(null)
    setReveal(false)
    setActive(true)
  }
  return (
    <section ref={root} className="tank-hero ripple-hero" aria-labelledby="tank-title" data-testid="ripple-hero" data-state={active ? 'intro' : terminal ? 'home' : 'poster'}>
      <div ref={media} className="ripple-media" data-testid="ripple-media">
        <HeroParticleStage terminal={terminal || active} onUnavailable={setUnavailableArtwork} />
        {active && <CinematicIntro onComplete={finish} onReveal={() => setReveal(true)} />}
      </div>
      <div ref={editorial} className={`tank-editorial ripple-editorial${active && !reveal ? ' is-awaiting-cue' : ''}`} aria-hidden={active && !reveal || undefined}>
        <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
        <h1 id="tank-title">Clear water.<br /><em>Look closer.</em></h1>
        <div className="tank-copy"><p>Explore local water data and the evidence behind it.</p></div>
        <div className="tank-search">{children}</div>
      </div>
      <div className="ripple-journey-actions">
        {!active && <>
          <button type="button" className="ripple-motion-button" disabled={!hydrated} onClick={watch} data-testid="journey-watch">{reduced ? 'Explore without motion' : terminal ? 'Replay journey' : 'Watch the microscope journey'}</button>
          {!visited && <button type="button" className="ripple-motion-button ripple-secondary" disabled={!hydrated} data-testid="journey-skip-idle" onClick={() => { remember(); focusSearch() }}>Skip intro</button>}
        </>}
        <span className="ripple-illustration-label">Illustrative visualization · not to scale</span>
      </div>
      <p className="ripple-proof-status" data-testid="journey-proof-status" role="status">{active ? 'Timing proof · provisional continuation.' : terminal ? `${outcome === 'error' ? 'Playback unavailable. ' : ''}${unavailableArtwork === 'terminal' ? 'Final frame unavailable. Search and the studies remain available.' : 'Static prototype fallback · exact final video frame. Live particle match pending.'}` : unavailableArtwork === 'master' ? 'Artwork unavailable. Search and the studies remain available.' : 'Supplied particle master · static artwork.'}</p>
    </section>
  )
}
