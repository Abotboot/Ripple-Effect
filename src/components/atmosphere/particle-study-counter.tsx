'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import './particle-study-counter.css'

const TOTAL = 240_000
const DURATION = 2400
const format = new Intl.NumberFormat('en-US')

/** An animated presentation of a published study average, never a live sensor. */
export function ParticleStudyCounter() {
  const root = useRef<HTMLDivElement>(null)
  const number = useRef<HTMLSpanElement>(null)
  const replay = useRef<() => void>(() => {})
  const togglePause = useRef<() => void>(() => {})
  const [phase, setPhase] = useState<'ready' | 'counting' | 'paused' | 'complete'>('ready')
  const [reduced, setReduced] = useState(false)
  const [breakdown, setBreakdown] = useState(false)

  useEffect(() => {
    const element = root.current, digits = number.current
    if (!element || !digits) return
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let disposed = false, visible = false, started = false, manuallyPaused = false
    let elapsed = 0, previous = 0, raf: number | null = null
    const paint = (fraction: number) => {
      const eased = 1 - Math.pow(1 - fraction, 3)
      const value = fraction >= 1 ? TOTAL : Math.floor(TOTAL * eased / 100) * 100
      digits.textContent = `≈${format.format(value)}`
      element.style.setProperty('--study-progress', String(eased))
      element.dataset.value = String(value)
    }
    const stop = () => {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null; previous = 0
      element.dataset.running = 'false'
    }
    const complete = () => { stop(); started = true; elapsed = DURATION; paint(1); setPhase('complete') }
    const canRun = () => !disposed && visible && !document.hidden && !manuallyPaused && !preference.matches && elapsed < DURATION
    const tick = (now: number) => {
      raf = null
      if (!canRun()) { stop(); return }
      if (previous) elapsed = Math.min(DURATION, elapsed + Math.min(60, Math.max(0, now - previous)))
      previous = now
      paint(elapsed / DURATION)
      if (elapsed >= DURATION) complete()
      else raf = requestAnimationFrame(tick)
    }
    const sync = () => {
      if (disposed) return
      if (preference.matches) { setReduced(true); complete(); return }
      setReduced(false)
      if (!canRun()) { stop(); return }
      if (!started) { started = true; paint(0) }
      if (raf === null) { setPhase('counting'); element.dataset.running = 'true'; raf = requestAnimationFrame(tick) }
    }
    replay.current = () => {
      if (preference.matches) { complete(); return }
      stop(); elapsed = 0; started = true; manuallyPaused = false; paint(0); sync()
    }
    togglePause.current = () => {
      if (elapsed >= DURATION || preference.matches) return
      manuallyPaused = !manuallyPaused
      if (manuallyPaused) { stop(); setPhase('paused') } else sync()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: 0.25 })
    observer.observe(element)
    preference.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    if (preference.matches) sync()
    return () => {
      disposed = true; stop(); observer.disconnect()
      preference.removeEventListener('change', sync); document.removeEventListener('visibilitychange', sync)
      replay.current = () => {}; togglePause.current = () => {}
    }
  }, [])

  return <div ref={root} className="study-counter" data-testid="study-counter" data-state={phase} style={{ '--study-progress': 1 } as CSSProperties}>
    <div className="particle-number" role="img" aria-label="Approximately 240,000 microplastic and nanoplastic particles per liter, on average, in the 2024 bottled-water study.">
      <span ref={number} aria-hidden="true" data-testid="study-count">≈240,000</span>
      <span className="particle-unit" aria-hidden="true">particles per liter, on average</span>
    </div>
    <div className="study-progress" aria-hidden="true"><span /></div>
    <p className="study-counter-context">One liter. Three bottled-water brands. A closer look at what that study found.</p>
    <div className="study-counter-actions">
      <button type="button" onClick={() => replay.current()} disabled={reduced} data-testid="study-replay">{reduced ? 'Motion reduced' : 'Replay count'}<span aria-hidden="true">↻</span></button>
      {(phase === 'counting' || phase === 'paused') && <button type="button" onClick={() => togglePause.current()} aria-pressed={phase === 'paused'} data-testid="study-pause">{phase === 'paused' ? 'Resume count' : 'Pause count'}</button>}
      <button type="button" aria-expanded={breakdown} aria-controls="study-size-breakdown" onClick={() => setBreakdown(value => !value)} data-testid="study-breakdown-toggle">{breakdown ? 'Hide the breakdown' : 'What made up the total?'}<span aria-hidden="true">{breakdown ? '−' : '+'}</span></button>
    </div>
    <div id="study-size-breakdown" className="study-breakdown" hidden={!breakdown}>
      <div className="study-dot-grid" aria-hidden="true">{Array.from({ length: 100 }, (_, i) => <span key={i} data-nano={i < 90} />)}</div>
      <div><p><strong>About 90% were nanoplastics.</strong></p><p>The remaining share were larger microplastics. Each mark represents about 1% of the study total, not an individual particle.</p></div>
    </div>
    <p className="study-counter-boundary">Published research, not a live reading or a measurement of your water.</p>
  </div>
}
