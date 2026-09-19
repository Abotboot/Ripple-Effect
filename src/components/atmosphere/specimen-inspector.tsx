'use client'

import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type PointerEvent } from 'react'
import type { BottleScene, SpecimenForm } from './bottle-scene'
import { createSpecimenFallback } from './specimen-fallback'
import './specimen-inspector.css'

const motionQuery = '(prefers-reduced-motion: reduce)'
const readReduced = () => matchMedia(motionQuery).matches
const serverReduced = () => false
function subscribeReduced(notify: () => void) {
  const preference = matchMedia(motionQuery)
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}

export function SpecimenInspector() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [uv, setUv] = useState(false)
  const [angle, setAngle] = useState(0)
  const [form, setForm] = useState<SpecimenForm>('all')
  const [paused, setPaused] = useState(false)
  const [fallback, setFallback] = useState(false)
  const [ready, setReady] = useState(false)
  const reducedMotion = useSyncExternalStore(subscribeReduced, readReduced, serverReduced)
  const scene = useRef<BottleScene | null>(null)
  const view = useRef({ uv, angle, paused, reducedMotion, form })
  const drag = useRef<{ x: number; angle: number } | null>(null)

  useLayoutEffect(() => {
    view.current = { uv, angle, paused, reducedMotion, form }
    scene.current?.update(uv, angle, { paused, reducedMotion, form })
  }, [uv, angle, paused, reducedMotion, form])

  useEffect(() => {
    const element = canvas.current
    if (!element) return
    let cancelled = false, visible = false, starting = false
    let current: BottleScene | null = null
    const fail = () => { if (!cancelled) { setReady(false); setAngle(0); setFallback(true) } }
    const activate = () => current?.setVisible(visible && !document.hidden)
    const initialize = async () => {
      if (starting || cancelled) return
      starting = true
      try {
        const create = fallback ? createSpecimenFallback : (await import('./bottle-scene')).createBottleScene
        if (cancelled) return
        current = create(element, fail)
        scene.current = current
        const latest = view.current
        current.update(latest.uv, latest.angle, latest)
        activate()
        setReady(true)
      } catch { fail() }
    }
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting && entry.intersectionRatio > 0
      if (visible) void initialize()
      activate()
    }, { threshold: [0, .01] })
    const lost = (event: Event) => { event.preventDefault(); fail() }
    observer.observe(element)
    document.addEventListener('visibilitychange', activate)
    element.addEventListener('webglcontextlost', lost)
    return () => {
      cancelled = true; observer.disconnect()
      document.removeEventListener('visibilitychange', activate)
      element.removeEventListener('webglcontextlost', lost)
      current?.dispose()
      if (scene.current === current) scene.current = null
    }
  }, [fallback])

  const beginDrag = (event: PointerEvent<HTMLCanvasElement>) => {
    if (fallback || !ready || event.button !== 0) return
    drag.current = { x: event.clientX, angle }
    event.currentTarget.setPointerCapture(event.pointerId)
  }
  const rotate = (event: PointerEvent<HTMLCanvasElement>) => {
    if (!drag.current) return
    setAngle(Math.max(-180, Math.min(180, Math.round((drag.current.angle + (event.clientX - drag.current.x) * .65) / 5) * 5)))
  }
  const endDrag = () => { drag.current = null }

  return <section className="specimen-stage" aria-labelledby="specimen-title" data-mode={uv ? 'uv' : 'macro'} data-testid="specimen-inspector">
    <div className="specimen-heading">
      <div><p className="specimen-kicker">Interactive specimen</p><h2 id="specimen-title">Inspect a water bottle</h2></div>
      <p>Rotate the bottle, then switch the view to explore illustrated particle forms. The same vessel stays in view.</p>
    </div>
    <div className="specimen-workbench">
      <div className="specimen-chamber">
        <div className="specimen-toolbar">
          <div className="specimen-modes" role="group" aria-label="Specimen view">
            <button type="button" aria-pressed={!uv} onClick={() => setUv(false)}>Macro view</button>
            <button type="button" aria-pressed={uv} onClick={() => setUv(true)}>UV view</button>
          </div>
          <button className="specimen-pause" type="button" aria-pressed={paused} disabled={fallback || reducedMotion} onClick={() => setPaused(value => !value)}>{reducedMotion ? 'Motion reduced' : paused ? 'Resume motion' : 'Pause motion'}</button>
        </div>
        <div className="specimen-form-controls">
          <div role="group" aria-label="Show illustrated forms">
            {(['all', 'fibers', 'fragments'] as const).map(value => <button key={value} type="button" disabled={!uv} aria-pressed={form === value} onClick={() => setForm(value)}>{value === 'all' ? 'All forms' : value === 'fibers' ? 'Fibers' : 'Fragments'}</button>)}
          </div>
          <button className="specimen-scan" type="button" disabled={!uv || paused || reducedMotion || fallback} onClick={() => scene.current?.scan()}>Scan again <span aria-hidden="true">↻</span></button>
        </div>
        <div className="specimen-image">
          <div className="specimen-chamber-label"><span>{fallback ? '2D illustration' : 'PET bottle · 3D illustration'}</span><span>{uv ? 'UV concept' : 'Exterior'}</span></div>
          <canvas key={fallback ? 'fallback' : 'webgl'} ref={canvas} role="img" aria-label={fallback ? 'Static 2D illustration of a water bottle; rotation unavailable' : uv ? 'Rotatable illustrated water bottle with sparse fibers and fragments, not measurement data' : 'Rotatable clear PET water bottle with an ivory cap and narrow paper label'} onPointerDown={beginDrag} onPointerMove={rotate} onPointerUp={endDrag} onPointerCancel={endDrag} onLostPointerCapture={endDrag}>Illustrated water bottle. The view descriptions and controls are available beside it.</canvas>
          {!ready && <p className="specimen-loading" role="status">Preparing the specimen…</p>}
          <span className="specimen-drag-hint">{fallback ? '3D view unavailable' : 'Drag the bottle or use the rotation control'}</span>
        </div>
        <div className="specimen-rotation">
          <label htmlFor="specimen-rotation">Rotate specimen <output>{angle}°</output></label>
          <input id="specimen-rotation" type="range" min="-180" max="180" step="5" value={angle} disabled={fallback} aria-label="Rotate specimen" aria-valuetext={`${angle} degrees`} onChange={event => setAngle(Number(event.target.value))} />
          <button type="button" disabled={fallback} onClick={() => setAngle(0)}>Reset angle</button>
        </div>
      </div>
      <div className="specimen-copy">
        <div className="specimen-readout" aria-live="polite" aria-atomic="true">
          <p className="specimen-kicker">{uv ? 'Inspection overlay' : 'Exterior view'}</p>
          <h3>{uv ? 'Follow the forms inside' : 'The bottle’s shape and surface'}</h3>
          <p>{uv ? fallback ? 'The static illustration shows enlarged fibers and fragments. Select a form to isolate it; motion and rotation are unavailable in this view.' : 'A soft scan reveals a few enlarged fibers and fragments. Their slow movement helps separate overlapping forms; it does not model particle behavior in real water.' : 'The molded ribs, narrow neck and cap describe a familiar drinking-water bottle. Its appearance does not tell you what is in the water.'}</p>
        </div>
        <dl className="specimen-facts"><div><dt>Particle concentration</dt><dd>Not measured</dd></div><div><dt>Material identity</dt><dd>Not determined</dd></div></dl>
        <p className="specimen-caveat">UV is an illustration, not spectrometry or a material test. Particle size, number and distribution are artistic choices. This bottle has no measured particle count.</p>
        {fallback && <p className="specimen-fallback-note" role="status">The 3D view is unavailable. The static 2D illustration still supports both views and form selection; rotation and animation are disabled.</p>}
        <a href="https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water" target="_blank" rel="noopener noreferrer">Research context · NIH <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  </section>
}
