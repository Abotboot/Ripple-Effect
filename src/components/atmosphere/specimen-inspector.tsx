'use client'

import Image from 'next/image'
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type MouseEvent } from 'react'
import { createBottleScene, specimenCrop, type BottleScene, type SpecimenForm, type SpecimenPosition } from './bottle-scene'
import './specimen-inspector.css'

const photoSource = '/media/ripple/specimen/retail-pet-clean.webp'
const motionQuery = '(prefers-reduced-motion: reduce)'
const readReduced = () => matchMedia(motionQuery).matches
const serverReduced = () => false
function subscribeReduced(notify: () => void) {
  const preference = matchMedia(motionQuery)
  preference.addEventListener('change', notify)
  return () => preference.removeEventListener('change', notify)
}
const regions = [
  { name: 'Shoulder', y: .26, title: 'Fill line and shoulder', note: 'Follow the water line and the change in shape below the cap. Reflections and molded edges belong to the bottle image; they are not evidence of particles.' },
  { name: 'Label', y: .52, title: 'Label and container', note: 'The printed label describes the illustrated product. It supplies no particle measurement. Its claims are not a laboratory result for the water shown.' },
  { name: 'Ribs', y: .78, title: 'Ribbing and folds', note: 'The lower wall has molded ridges, small folds and bright reflections. Those visible structures are the container, not a count of material suspended in water.' },
] as const

export function SpecimenInspector() {
  const photo = useRef<HTMLImageElement>(null)
  const canvas = useRef<HTMLCanvasElement>(null)
  const positionControl = useRef<HTMLInputElement>(null)
  const [uv, setUv] = useState(false)
  const [position, setPosition] = useState<SpecimenPosition>({ x: .5, y: .26 })
  const [zoom, setZoom] = useState(3)
  const [form, setForm] = useState<SpecimenForm>('all')
  const [paused, setPaused] = useState(false)
  const [imageReady, setImageReady] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)
  const [canvasUnavailable, setCanvasUnavailable] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const reducedMotion = useSyncExternalStore(subscribeReduced, readReduced, serverReduced)
  const scene = useRef<BottleScene | null>(null)
  const view = useRef({ uv, position, zoom, form, paused, reducedMotion })
  const crop = specimenCrop(position, zoom)
  const region = regions.reduce((nearest, candidate) => Math.abs(candidate.y - position.y) < Math.abs(nearest.y - position.y) ? candidate : nearest)

  useLayoutEffect(() => {
    view.current = { uv, position, zoom, form, paused, reducedMotion }
    scene.current?.update(view.current)
  }, [uv, position, zoom, form, paused, reducedMotion])

  useEffect(() => {
    const element = canvas.current, source = photo.current
    if (!imageReady || canvasUnavailable || !element || !source) return
    let disposed = false, visible = false
    let current: BottleScene | null = null
    const fail = () => { if (!disposed) setCanvasUnavailable(true) }
    const activate = () => current?.setVisible(visible && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => {
      if (disposed) return
      visible = entry.isIntersecting && entry.intersectionRatio > 0
      if (visible && !current) {
        try {
          current = createBottleScene(element, source, fail)
          scene.current = current; current.update(view.current)
        } catch { fail() }
      }
      activate()
    }, { threshold: [0, .01] })
    observer.observe(element)
    document.addEventListener('visibilitychange', activate)
    return () => {
      disposed = true; observer.disconnect(); document.removeEventListener('visibilitychange', activate)
      current?.dispose(); if (scene.current === current) scene.current = null
    }
  }, [imageReady, canvasUnavailable, attempt])

  const choosePoint = (event: MouseEvent<HTMLButtonElement>) => {
    if (!event.detail) { positionControl.current?.focus(); return }
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition({ x: Math.max(.27, Math.min(.73, (event.clientX - bounds.x) / bounds.width)), y: Math.max(.16, Math.min(.86, (event.clientY - bounds.y) / bounds.height)) })
  }
  const retryDetail = () => setCanvasUnavailable(false)
  const unavailable = imageFailed || canvasUnavailable

  return <section className="specimen-stage" aria-labelledby="specimen-title" data-mode={uv ? 'uv' : 'macro'} data-testid="specimen-inspector">
    <div className="specimen-heading">
      <div><p className="specimen-kicker">Bottle inspection</p><h2 id="specimen-title">Inspect the bottle</h2></div>
      <p>Explore the bottle’s surface, then compare it with a separately illustrated particle view. Appearance alone does not tell us what the water contains.</p>
    </div>
    <div className="specimen-workbench">
      <figure className="specimen-overview">
        <div className="specimen-overview-label"><span>The whole bottle</span><span>Illustrative image</span></div>
        {imageFailed ? <div className="specimen-image-error" role="status"><p>Bottle image unavailable.</p><button type="button" onClick={() => { setImageFailed(false); setImageReady(false); setCanvasUnavailable(false); setAttempt(value => value + 1) }}>Retry image</button></div> :
          <button type="button" className="specimen-photo-target" onClick={choosePoint} aria-label="Choose a detail area on the bottle. Keyboard users can use the Detail position control." disabled={!imageReady}>
            <Image key={attempt} ref={photo} src={attempt ? `${photoSource}?retry=${attempt}` : photoSource} width={1122} height={1402} unoptimized loading="lazy" alt="Illustrative clear retail-style PET water bottle with a white cap, blue-and-white generic label, a fill line and molded ribs" onLoad={() => { setImageReady(true); setImageFailed(false) }} onError={() => { setImageReady(false); setImageFailed(true) }} />
            {imageReady && <span className="specimen-locator" data-testid="specimen-locator" aria-hidden="true" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }}><span>Detail area</span></span>}
          </button>}
        <figcaption>Illustrative retail-style PET bottle. The whole-bottle image has no particle overlay. Select the shoulder, label or ribs to examine its surface.</figcaption>
        <div className="specimen-region-controls" role="group" aria-label="Bottle detail area">
          {regions.map(item => <button type="button" key={item.name} aria-pressed={position.y === item.y && position.x === .5} onClick={() => setPosition({ x: .5, y: item.y })} disabled={imageFailed}>{item.name}</button>)}
        </div>
      </figure>

      <div className="specimen-detail-column">
        <div className="specimen-chamber">
          <div className="specimen-toolbar">
            <div className="specimen-modes" role="group" aria-label="Specimen view" aria-describedby="specimen-caveat">
              <button type="button" aria-pressed={!uv} data-testid="specimen-macro" onClick={() => setUv(false)}>Bottle detail</button>
              <button type="button" aria-pressed={uv} data-testid="specimen-uv" onClick={() => setUv(true)}>Illustrative UV</button>
            </div>
            {uv && <button type="button" className="specimen-pause" data-testid="specimen-pause" aria-pressed={paused} disabled={reducedMotion || unavailable} onClick={() => setPaused(value => !value)}>{reducedMotion ? 'Motion reduced' : paused ? 'Resume motion' : 'Pause motion'}</button>}
          </div>
          <div className="specimen-detail-label"><span>{uv ? 'Particle illustration' : `${region.title} · image detail`}</span><span>{uv ? 'Not a scan result' : `${zoom}× image enlargement`}</span></div>
          <div className="specimen-detail-surface">
            <canvas id="specimen-detail-canvas" ref={canvas} data-testid="specimen-detail-canvas" role="img" aria-describedby="specimen-detail-explanation specimen-caveat" aria-label={uv ? 'Separately illustrated small fibers and fragments, not particles detected in the bottle' : `Enlarged image crop: ${region.title}`} hidden={unavailable}>The image detail is described below.</canvas>
            {!imageReady && !imageFailed && <p className="specimen-detail-message" role="status">Loading the bottle image…</p>}
            {imageFailed && <p className="specimen-detail-message" role="status">The source image could not be loaded. Retry it on the left.</p>}
            {canvasUnavailable && <div className="specimen-detail-message"><p role="status">Interactive detail is unavailable. The full bottle image and descriptions remain available.</p><button type="button" onClick={retryDetail}>Retry detail</button></div>}
          </div>
          <div className="specimen-detail-controls">
            <label className="specimen-position">Detail position <output>{Math.round(position.y * 100)}%</output><input ref={positionControl} type="range" min="16" max="86" step="1" value={Math.round(position.y * 100)} disabled={unavailable} aria-label="Detail position" aria-valuetext={`${Math.round(position.y * 100)} percent down the image, near ${region.name.toLowerCase()}`} onChange={event => setPosition(value => ({ ...value, y: Number(event.target.value) / 100 }))} /></label>
            <div className="specimen-zoom" role="group" aria-label="Image enlargement">{[2, 3, 4].map(value => <button key={value} type="button" disabled={unavailable} aria-pressed={zoom === value} onClick={() => setZoom(value)}>{value}×</button>)}</div>
          </div>
          {uv && <div className="specimen-form-controls">
            <div role="group" aria-label="Show illustrated forms">{(['all', 'fibers', 'fragments'] as const).map(value => <button key={value} type="button" disabled={unavailable} aria-pressed={form === value} onClick={() => setForm(value)}>{value === 'all' ? 'All forms' : value === 'fibers' ? 'Fibers' : 'Fragments'}</button>)}</div>
            <button className="specimen-scan" type="button" data-testid="specimen-scan" disabled={paused || reducedMotion || unavailable} onClick={() => scene.current?.scan()}>Replay reveal</button>
          </div>}
        </div>
        <div className="specimen-readout" aria-live="polite" aria-atomic="true">
          <h3>{uv ? 'Examples of shape, not a bottle reading' : region.title}</h3>
          <p id="specimen-detail-explanation">{uv ? 'These fibers and fragments are added illustrations. Their positions, size and movement are illustrative; they were not detected in this bottle image. The detail window is not a calibrated microscope view.' : region.note}</p>
        </div>
        <dl className="specimen-facts"><div><dt>Particle concentration</dt><dd>Not measured</dd></div><div><dt>Material identity</dt><dd>Not determined</dd></div></dl>
        <p id="specimen-caveat" className="specimen-caveat">UV is an illustration, not spectrometry or a material test. Illustrated forms are not to scale. This bottle has no measured particle count.</p>
        <a className="specimen-source" href="https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water" target="_blank" rel="noopener noreferrer" aria-label="Read NIH research context in a new tab">Research context · NIH <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  </section>
}
