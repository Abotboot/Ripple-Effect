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
const enteredEvent = 'ripple-entered'
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
  window.addEventListener('hashchange', notify); window.addEventListener('storage', notify); window.addEventListener(enteredEvent, notify)
  return () => { window.removeEventListener('hashchange', notify); window.removeEventListener('storage', notify); window.removeEventListener(enteredEvent, notify) }
}
function persistReturning() {
  try {
    sessionStorage.setItem('ripple-entered', '1')
    window.dispatchEvent(new Event(enteredEvent))
  } catch { /* Optional storage. */ }
}
function headerOffset() {
  const header = document.querySelector<HTMLElement>('.site-header')
  return header && ['sticky', 'fixed'].includes(getComputedStyle(header).position) ? header.getBoundingClientRect().height : 0
}
const forms: { id: ArtworkCategory; label: string; description: string }[] = [
  { id: 'all', label: 'All forms', description: 'An illustrated field of fibers, fragments and granules. Move across the artwork or tap to stir it.' },
  { id: 'fibers', label: 'Fibers', description: 'Thread-like forms with long, narrow profiles.' },
  { id: 'fragments', label: 'Fragments', description: 'Irregular, angular or film-like pieces.' },
  { id: 'granules', label: 'Granules', description: 'Rounded or bead-like solid forms.' },
]

export function TankHero({ children }: { children: ReactNode }) {
  const hydrated = useSyncExternalStore(subscribeHydration, clientTrue, serverFalse)
  const reduced = useSyncExternalStore(subscribeReduced, readReduced, serverFalse)
  const returning = useSyncExternalStore(subscribeReturning, readReturning, serverFalse)
  const [phase, setPhase] = useState<ArtworkPhase>('idle')
  const [reveal, setReveal] = useState(true)
  const [entered, setEntered] = useState(false)
  const [replayCover, setReplayCover] = useState(false)
  const [holdTerminal, setHoldTerminal] = useState(false)
  const [category, setCategory] = useState<ArtworkCategory>('all')
  const [paused, setPaused] = useState(false)
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [playbackError, setPlaybackError] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const root = useRef<HTMLElement>(null)
  const media = useRef<HTMLDivElement>(null)
  const editorial = useRef<HTMLDivElement>(null)
  const entryEnter = useRef<HTMLButtonElement>(null)
  const pendingFocus = useRef(false)
  const currentPhase = useRef(phase)
  useLayoutEffect(() => { currentPhase.current = phase }, [phase])
  const active = phase === 'video' || phase === 'entering'
  const showEntryCover = hydrated && (replayCover || !entered && !returning) && !reduced && !active
  const remember = useCallback(() => {
    setEntered(true)
    setReplayCover(false)
    persistReturning()
  }, [])
  const focusSearch = useCallback(() => {
    editorial.current?.removeAttribute('inert')
    const input = root.current?.querySelector<HTMLInputElement>('.tank-search input')
    input?.focus({ preventScroll: true })
    if (input) {
      input.style.scrollMarginTop = `${headerOffset() + 16}px`
    }
  }, [])
  const finish = useCallback((outcome: IntroOutcome) => {
    // Keep the actual final frame. Do not run the old second camera move.
    setHoldTerminal(outcome === 'complete')
    pendingFocus.current = true
    setPhase('live'); setReveal(true); setPaused(false)
    setPlaybackError(outcome === 'error')
    remember()
  }, [remember])
  const settled = useCallback(() => {
    setPhase('live'); setReveal(true)
    remember()
  }, [remember])
  const ready = useCallback(() => setStatus('ready'), [])
  const failed = useCallback(() => {
    setStatus('error')
    // An artwork download/Canvas2D failure must not cut short a playable video.
    // Its natural end will return to usable HTML and the static artwork instead.
    if (currentPhase.current === 'video') return
    setPhase('live'); setReveal(true)
  }, [])
  const revealCopy = useCallback(() => setReveal(true), [])
  useEffect(() => {
    const preference = matchMedia(motionQuery)
    const change = () => { if (preference.matches) {
      pendingFocus.current = true
      setPhase('live'); setReveal(true); setPaused(false)
      remember()
    } }
    preference.addEventListener('change', change)
    return () => preference.removeEventListener('change', change)
  }, [remember])
  useEffect(() => {
    if (hydrated && reduced && !returning) persistReturning()
  }, [hydrated, reduced, returning])
  useEffect(() => {
    if (phase !== 'entering') return
    const key = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); finish('skip') } }
    document.addEventListener('keydown', key)
    return () => document.removeEventListener('keydown', key)
  }, [phase, finish])
  useLayoutEffect(() => {
    if (active) editorial.current?.setAttribute('inert', '')
    else {
      editorial.current?.removeAttribute('inert')
      if (!active && pendingFocus.current) { pendingFocus.current = false; focusSearch() }
    }
  }, [active, reveal, phase, focusSearch])
  useLayoutEffect(() => {
    const allowed = showEntryCover
      ? root.current?.querySelector<HTMLElement>('.ripple-entry-cover')
      : active ? media.current : null
    if (!allowed) return
    const inerted: Array<{ element: HTMLElement; hadInert: boolean }> = []
    const isolate = (element: Element) => {
      if (!(element instanceof HTMLElement)) return
      const hadInert = element.hasAttribute('inert')
      inerted.push({ element, hadInert })
      if (!hadInert) element.setAttribute('inert', '')
    }
    for (const child of root.current?.children ?? []) if (child !== allowed) isolate(child)
    let branch: HTMLElement | null = root.current
    while (branch?.parentElement && branch.parentElement !== document.body) {
      for (const sibling of branch.parentElement.children) if (sibling !== branch) isolate(sibling)
      branch = branch.parentElement
    }
    for (const sibling of document.body.children) if (sibling !== branch) isolate(sibling)
    if (showEntryCover) entryEnter.current?.focus({ preventScroll: true })
    return () => {
      for (const { element, hadInert } of inerted) if (!hadInert) element.removeAttribute('inert')
    }
  }, [showEntryCover, active])
  useLayoutEffect(() => {
    if (!showEntryCover && !active) return
    const x = 0
    const y = 0
    window.dispatchEvent(new Event('ripple-cinematic-start'))
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    const previous = {
      cinematicClass: document.body.classList.contains('ripple-cinematic-active'),
      rootOverflow: document.documentElement.style.overflow,
      bodyOverflow: document.body.style.overflow,
      bodyPosition: document.body.style.position,
      bodyTop: document.body.style.top,
      bodyLeft: document.body.style.left,
      bodyRight: document.body.style.right,
      bodyWidth: document.body.style.width,
    }
    document.body.classList.add('ripple-cinematic-active')
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.body.style.position = 'fixed'
    document.body.style.top = `-${y}px`
    document.body.style.left = `-${x}px`
    document.body.style.right = '0'
    document.body.style.width = '100%'
    return () => {
      if (!previous.cinematicClass) document.body.classList.remove('ripple-cinematic-active')
      document.documentElement.style.overflow = previous.rootOverflow
      document.body.style.overflow = previous.bodyOverflow
      document.body.style.position = previous.bodyPosition
      document.body.style.top = previous.bodyTop
      document.body.style.left = previous.bodyLeft
      document.body.style.right = previous.bodyRight
      document.body.style.width = previous.bodyWidth
      window.scrollTo({ top: y, left: x, behavior: 'instant' })
      window.dispatchEvent(new Event('ripple-cinematic-end'))
    }
  }, [showEntryCover, active])
  useLayoutEffect(() => {
    const updateOffset = () => root.current?.style.setProperty('--ripple-header-offset', `${headerOffset()}px`)
    updateOffset()
    // Scroll only after the fitted player layout is committed. No harness scroll is needed.
    window.addEventListener('resize', updateOffset)
    return () => window.removeEventListener('resize', updateOffset)
  }, [active, phase])
  const watch = useCallback(() => {
    if (matchMedia(motionQuery).matches) { remember(); focusSearch(); return }
    remember()
    setHoldTerminal(false)
    pendingFocus.current = true
    setPlaybackError(false); setCategory('all'); setPaused(false); setReveal(false); setPhase('video')
  }, [remember, focusSearch])
  const replay = useCallback(() => {
    if (matchMedia(motionQuery).matches) { focusSearch(); return }
    window.dispatchEvent(new Event('ripple-cinematic-start'))
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
    setPlaybackError(false); setPhase('idle'); setReplayCover(true)
  }, [focusSearch])
  const skipEntry = useCallback(() => {
    remember()
    pendingFocus.current = true
    setPlaybackError(false); setPaused(false); setReveal(true); setPhase('live')
  }, [remember])
  const description = forms.find(form => form.id === category)!.description

  return <section ref={root} className="tank-hero ripple-hero" aria-labelledby="tank-title" data-testid="ripple-hero" data-state={phase} data-terminal={holdTerminal}>
    {showEntryCover && <div
      className="ripple-entry-cover"
      data-testid="journey-entry-cover"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ripple-entry-title"
      aria-describedby="ripple-entry-description"
      onKeyDown={event => {
        if (event.key === 'Escape') {
          event.preventDefault()
          skipEntry()
          return
        }
        if (event.key !== 'Tab') return
        const controls = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')]
        if (!controls.length) return
        const index = controls.indexOf(document.activeElement as HTMLButtonElement)
        const next = event.shiftKey ? (index <= 0 ? controls.length - 1 : index - 1) : (index + 1) % controls.length
        event.preventDefault()
        controls[next]?.focus()
      }}
    >
      <div className="ripple-ambient ripple-ambient-opening" aria-hidden="true" />
      <Image
        src={artworkJourney.poster}
        alt=""
        fill
        sizes="100vw"
        unoptimized
        preload
        className="ripple-entry-image"
        data-testid="journey-entry-image"
      />
      <button type="button" className="ripple-entry-skip" data-testid="journey-cover-skip" onClick={skipEntry}>Skip intro</button>
      <div className="ripple-entry-copy">
        <p className="ripple-entry-eyebrow">A Ripple Effect initiative</p>
        <h2 id="ripple-entry-title">Clear water.<br /><em>Look closer.</em></h2>
        <p id="ripple-entry-description">A closer look at water. Start here.</p>
        <button ref={entryEnter} type="button" className="ripple-entry-enter" data-testid="journey-enter" onClick={watch}>
          Enter <span aria-hidden="true">→</span>
        </button>
      </div>
    </div>}
    <div ref={media} className="ripple-media" data-testid="ripple-media">
      {(active || holdTerminal) && <div className="ripple-ambient ripple-ambient-terminal" aria-hidden="true" />}
      <div className={`ripple-particle-stage${status === 'ready' ? ' is-field-ready' : ''}`} role="img" aria-label={rippleAssets.master.alt} data-testid="particle-stage" data-renderer={status === 'ready' ? 'interactive-artwork' : 'master-static'}>
        {!imageFailed ? <Image src={active || holdTerminal ? artworkJourney.terminalPoster : rippleAssets.master.src} alt={holdTerminal ? 'View through the microscope eyepiece' : rippleAssets.master.alt} width={1920} height={1080} sizes="100vw" unoptimized loading="eager" className="ripple-stage-image" data-testid="hero-artwork" onError={() => setImageFailed(true)} /> : <p className="ripple-artwork-fallback">Artwork unavailable. Water search is still available.</p>}
        <ArtworkFieldCanvas phase={phase} paused={paused || showEntryCover || holdTerminal} reduced={reduced} category={category} onReady={ready} onError={failed} onReveal={revealCopy} onSettled={settled} />
      </div>
      {phase === 'video' && <CinematicIntro onComplete={finish} />}
    </div>
    <div ref={editorial} className={`tank-editorial ripple-editorial${active && !reveal ? ' is-awaiting-cue' : ''}`} aria-hidden={showEntryCover || active && !reveal || undefined}>
      <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
      <h1 id="tank-title">Clear water.<br /><em>Look closer.</em></h1>
      <div className="tank-copy"><p>Explore water measurements and their sources.</p></div>
      <div className="tank-search">{children}</div>
    </div>
    <div className="ripple-workbench" aria-label="Illustration controls">
      {!active && <>
        <div className="ripple-form-selector"><span className="ripple-control-label">Highlight a form</span>
          <div className="ripple-category-buttons" role="group" aria-label="Highlight particle category">{forms.map(form => <button type="button" key={form.id} data-testid={`field-${form.id}`} disabled={!hydrated || status !== 'ready'} aria-pressed={!holdTerminal && category === form.id} onClick={() => { setHoldTerminal(false); setCategory(form.id) }}>{form.label}</button>)}</div>
        </div>
        <div className="ripple-workbench-actions">
          <button type="button" className="ripple-motion-button" data-testid="field-pause" disabled={!hydrated || status !== 'ready' || reduced} aria-pressed={paused || reduced} onClick={() => setPaused(value => !value)}>{reduced ? 'Reduced motion' : paused ? 'Resume artwork' : 'Pause artwork'}</button>
          <button type="button" className="ripple-motion-button" disabled={!hydrated} onClick={replay} data-testid="journey-watch">{reduced ? 'Explore without motion' : playbackError ? 'Retry intro' : 'Replay intro'}<span aria-hidden="true">↗</span></button>
        </div>
      </>}
      <p className="ripple-field-description" data-testid="field-description" aria-live="polite">{description}</p>
    </div>
    {playbackError && !active && <p className="ripple-playback-error" data-testid="journey-playback-error" role="status">The microscope video could not be played. Retry the video above, or continue with the water search.</p>}
  </section>
}
