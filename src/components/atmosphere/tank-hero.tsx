'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react'
import Image from 'next/image'
import { CinematicIntro, type IntroOutcome } from './cinematic-intro'
import { ArtworkFieldCanvas } from './artwork-field-canvas'
import { artworkJourney, type ArtworkCategory, type ArtworkPhase } from '@/lib/artwork-journey'
import { rippleAssets } from '@/lib/ripple-assets'
import './tank.css'
import './cinematic-intro.css'

export { TankCanvas } from './tank-canvas'

const motionQuery = '(prefers-reduced-motion: reduce)'
const serverFalse = () => false
const clientTrue = () => true
const subscribeHydration = () => () => {}
const readReduced = () => matchMedia(motionQuery).matches
function subscribeReduced(notify: () => void) {
  const media = matchMedia(motionQuery)
  media.addEventListener('change', notify)
  return () => media.removeEventListener('change', notify)
}
function readReturning() {
  if (window.location.hash) return true
  try { return Boolean(sessionStorage.getItem('ripple-entered')) } catch { return false }
}
function subscribeReturning(notify: () => void) {
  window.addEventListener('hashchange', notify); window.addEventListener('storage', notify)
  return () => { window.removeEventListener('hashchange', notify); window.removeEventListener('storage', notify) }
}
function headerOffset() {
  const header = document.querySelector<HTMLElement>('.site-header')
  return header && ['sticky', 'fixed'].includes(getComputedStyle(header).position) ? header.getBoundingClientRect().height : 0
}
const forms: { id: ArtworkCategory; label: string; description: string }[] = [
  { id: 'all', label: 'All forms', description: 'An illustrated field of fibers, fragments and granules. Move across the artwork or tap to stir it.' },
  { id: 'fibers', label: 'Fibers', description: 'Highlighting thread-like forms. Shape alone does not establish a particle’s material.' },
  { id: 'fragments', label: 'Fragments', description: 'Highlighting irregular film-like pieces. These illustrations are not measured samples.' },
  { id: 'granules', label: 'Granules', description: 'Highlighting rounded solid forms. Appearance alone does not confirm that a particle is plastic.' },
]

export function TankHero({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientTrue, serverFalse)
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, serverFalse)
  const returning = useSyncExternalStore(subscribeReturning, readReturning, serverFalse)
  const [phase, setPhase] = useState<ArtworkPhase>('idle')
  const [reveal, setReveal] = useState(true)
  const [entered, setEntered] = useState(false)
  const [category, setCategory] = useState<ArtworkCategory>('all')
  const [paused, setPaused] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [playbackError, setPlaybackError] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const root = useRef<HTMLElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const editorial = useRef<HTMLDivElement>(null)
  const pendingFocus = useRef(false)
  const focusedEntry = useRef(false)
  const active = phase === 'video' || phase === 'entering'
  const remember = useCallback(() => {
    setEntered(true)
    try { sessionStorage.setItem('ripple-entered', '1') } catch { /* Optional storage. */ }
  }, [])
  const focusSearch = useCallback(() => {
    editorial.current?.removeAttribute('inert')
    const input = root.current?.querySelector<HTMLInputElement>('.tank-search input')
    input?.focus({ preventScroll: true })
    if (input) {
      const r = input.getBoundingClientRect(), offset = headerOffset()
      input.style.scrollMarginTop = `${offset + 16}px`
      if (r.top < offset || r.bottom > innerHeight) input.scrollIntoView({ block: 'nearest', behavior: 'instant' })
    }
  }, [])
  const finish = useCallback((outcome: IntroOutcome) => {
    if (outcome === 'complete' && status === 'ready' && !matchMedia(motionQuery).matches) {
      // The exact video exit is already painted underneath. There is no second
      // encoded particle clip and no swap to a different scene at the endpoint.
      setPhase('entering')
      return
    }
    pendingFocus.current = true
    setPhase('live'); setReveal(true); setPaused(false)
    setPlaybackError(outcome === 'error')
    remember()
  }, [remember, status])
  const settled = useCallback(() => {
    pendingFocus.current = Boolean(root.current?.querySelector('.ripple-player-controls')?.contains(document.activeElement))
    setPhase('live'); setReveal(true)
    remember()
  }, [remember])
  const ready = useCallback(() => setStatus('ready'), [])
  const failed = useCallback(() => {
    setStatus('error'); setPhase('live'); setReveal(true)
    pendingFocus.current = Boolean(root.current?.querySelector('.ripple-player-controls')?.contains(document.activeElement))
  }, [])
  const revealCopy = useCallback(() => setReveal(true), [])
  useEffect(() => {
    const preference = matchMedia(motionQuery)
    const change = () => { if (preference.matches) {
      pendingFocus.current = Boolean(root.current?.querySelector('.ripple-player-controls')?.contains(document.activeElement))
      setPhase('live'); setReveal(true); setPaused(true)
    } }
    preference.addEventListener('change', change)
    return () => preference.removeEventListener('change', change)
  }, [])
  useEffect(() => {
    if (phase !== 'entering') return
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); finish('skip') } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [phase, finish])
  useLayoutEffect(() => {
    if (active && !reveal) editorial.current?.setAttribute('inert', '')
    else {
      editorial.current?.removeAttribute('inert')
      if (pendingFocus.current) { pendingFocus.current = false; focusSearch() }
    }
    if (phase === 'entering' && !focusedEntry.current) {
      focusedEntry.current = true
      root.current?.querySelector<HTMLButtonElement>('[data-testid="journey-skip"]')?.focus({ preventScroll: true })
    } else if (phase !== 'entering') focusedEntry.current = false
  }, [active, reveal, phase, focusSearch])
  const watch = () => {
    if (matchMedia(motionQuery).matches) { remember(); focusSearch(); return }
    if (media.current) { media.current.style.scrollMarginTop = `${headerOffset()}px`; media.current.scrollIntoView({ block: 'start', behavior: 'instant' }) }
    setPlaybackError(false); setCategory('all'); setPaused(false); setReveal(false); setPhase('video')
  }
  const description = forms.find(form => form.id === category)!.description
  const staticOnly = status === 'error' || reduced

  return <section ref={root} className="tank-hero ripple-hero" aria-labelledby="tank-title" data-testid="ripple-hero" data-state={phase}>
    <div ref={media} className="ripple-media" data-testid="ripple-media">
      <div className={`ripple-particle-stage${status === 'ready' ? ' is-field-ready' : ''}`} role="img" aria-label={rippleAssets.master.alt} data-testid="particle-stage" data-renderer={status === 'ready' ? 'interactive-artwork' : 'master-static'}>
        {!imageFailed ? <Image src={phase === 'video' || phase === 'entering' ? artworkJourney.terminalPoster : rippleAssets.master.src} alt={rippleAssets.master.alt} width={1920} height={1080} sizes="100vw" unoptimized loading="eager" className="ripple-stage-image" data-testid="hero-artwork" onError={() => setImageFailed(true)} /> : <p className="ripple-artwork-fallback">Artwork unavailable. Water search is still available.</p>}
        <ArtworkFieldCanvas phase={phase} paused={paused} reduced={reduced} category={category} onReady={ready} onError={failed} onReveal={revealCopy} onSettled={settled} />
      </div>
      {phase === 'video' && <CinematicIntro onComplete={finish} onReveal={revealCopy} />}
      {phase === 'entering' && <div className="ripple-player-controls" role="group" aria-label="Journey controls">
        <button type="button" className="ripple-motion-button" data-testid="journey-skip" onClick={() => finish('skip')}>Skip intro</button>
        <button type="button" className="ripple-motion-button" data-testid="journey-pause" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume journey' : 'Pause journey'}</button>
        <span className="ripple-player-status" role="status">{paused ? 'Journey paused' : 'Entering the illustrated particle field'}</span>
      </div>}
      {!active && <span className="ripple-media-caption">{status === 'ready' ? 'Interactive artwork' : 'Illustrative artwork'} <span aria-hidden="true">/</span> not to scale</span>}
    </div>
    <div ref={editorial} className={`tank-editorial ripple-editorial${active && !reveal ? ' is-awaiting-cue' : ''}`} aria-hidden={active && !reveal || undefined}>
      <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
      <h1 id="tank-title">Clear water.<br /><em>Look closer.</em></h1>
      <div className="tank-copy"><p>Find reported water measurements, check their sources, and see where evidence is missing.</p></div>
      <div className="tank-search">{children}</div>
      <p className="ripple-search-note">Reported data, not a complete safety assessment.</p>
    </div>
    <div className="ripple-workbench" aria-label="Illustration controls">
      {!active && <>
        <div className="ripple-form-selector"><span className="ripple-control-label">Highlight a form</span>
          <div className="ripple-category-buttons" role="group" aria-label="Highlight particle category">{forms.map(form => <button type="button" key={form.id} data-testid={`field-${form.id}`} disabled={!hydrated || status !== 'ready'} aria-pressed={category === form.id} onClick={() => setCategory(form.id)}>{form.label}</button>)}</div>
        </div>
        <div className="ripple-workbench-actions">
          <button type="button" className="ripple-motion-button" data-testid="field-pause" disabled={!hydrated || status !== 'ready' || reduced} aria-pressed={paused || reduced} onClick={() => setPaused(value => !value)}>{reduced ? 'Reduced motion' : paused ? 'Resume artwork' : 'Pause artwork'}</button>
          <button type="button" className="ripple-motion-button" disabled={!hydrated} onClick={watch} data-testid="journey-watch">{reduced ? 'Explore without motion' : entered ? 'Replay journey' : 'Watch the microscope journey'}<span aria-hidden="true">↗</span></button>
          {!entered && !returning && !reduced && <button type="button" className="ripple-skip-link" disabled={!hydrated} data-testid="journey-skip-idle" onClick={() => { remember(); focusSearch() }}>Skip intro</button>}
        </div>
      </>}
      <p className="ripple-field-description" data-testid="field-description" aria-live="polite">{description}</p>
    </div>
    <p className="ripple-proof-status" data-testid="journey-proof-status" role="status">{phase === 'video' ? 'Approved microscope shot.' : phase === 'entering' ? 'Live artwork continuation.' : `${playbackError ? 'Video unavailable. ' : ''}${staticOnly ? reduced ? 'Reduced motion · static artwork.' : 'Motion unavailable · static artwork.' : status === 'ready' ? 'Interactive artwork · not a laboratory measurement.' : 'Loading artwork controls…'}`}</p>
  </section>
}
