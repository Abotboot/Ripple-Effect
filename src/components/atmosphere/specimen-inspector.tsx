'use client'

import Image from 'next/image'
import { useRef, useState, type MouseEvent } from 'react'
import './specimen-inspector.css'

const photoSource = '/media/ripple/specimen/retail-pet-clean.webp'
const regions = [
  { name: 'Shoulder', y: .26, title: 'Fill line and shoulder', note: 'Trace the water line and the curve beneath the cap.' },
  { name: 'Label', y: .52, title: 'Label and container', note: 'Explore the printed label and the surface beneath it.' },
  { name: 'Ribs', y: .78, title: 'Ribbing and folds', note: 'Follow the molded ridges, folds and reflected light.' },
] as const
const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

export function SpecimenInspector() {
  const positionControl = useRef<HTMLInputElement>(null)
  const [position, setPosition] = useState({ x: .5, y: .26 })
  const [zoom, setZoom] = useState(3)
  const [imageFailed, setImageFailed] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const width = 1 / zoom
  const height = width * 1122 / 1402
  const crop = { x: clamp(position.x - width / 2, 0, 1 - width), y: clamp(position.y - height / 2, 0, 1 - height), width, height }
  const region = regions.reduce((nearest, candidate) => Math.abs(candidate.y - position.y) < Math.abs(nearest.y - position.y) ? candidate : nearest)
  const source = attempt ? `${photoSource}?retry=${attempt}` : photoSource
  const choosePoint = (event: MouseEvent<HTMLButtonElement>) => {
    if (!event.detail) { positionControl.current?.focus(); return }
    const bounds = event.currentTarget.getBoundingClientRect()
    setPosition({ x: clamp((event.clientX - bounds.x) / bounds.width, .27, .73), y: clamp((event.clientY - bounds.y) / bounds.height, .16, .86) })
  }

  return <section className="specimen-stage" aria-labelledby="specimen-title" data-testid="specimen-inspector">
    <div className="specimen-heading">
      <div><p className="specimen-kicker">Up close</p><h2 id="specimen-title">Inspect the bottle</h2></div>
      <p>Select an area. Explore its shape, texture and reflections.</p>
    </div>
    <div className="specimen-workbench">
      <figure className="specimen-overview">
        {imageFailed ? <div className="specimen-image-error" role="status"><p>Bottle image unavailable.</p><button type="button" onClick={() => { setImageFailed(false); setAttempt(value => value + 1) }}>Retry image</button></div> :
          <button type="button" className="specimen-photo-target" onClick={choosePoint} aria-label="Choose a detail area on the bottle. Keyboard users can use the Detail position control.">
            <Image key={attempt} src={source} width={1122} height={1402} unoptimized loading="lazy" alt="Illustrated clear PET water bottle with a white cap, blue label and molded ribs" onError={() => setImageFailed(true)} />
            <span className="specimen-locator" data-testid="specimen-locator" aria-hidden="true" style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${width * 100}%`, height: `${height * 100}%` }}><span>Detail area</span></span>
          </button>}
        <figcaption>Illustrated bottle · select a detail to magnify.</figcaption>
        <div className="specimen-region-controls" role="group" aria-label="Bottle detail area">
          {regions.map(item => <button type="button" key={item.name} aria-pressed={position.y === item.y && position.x === .5} onClick={() => setPosition({ x: .5, y: item.y })} disabled={imageFailed}>{item.name}</button>)}
        </div>
      </figure>
      <div className="specimen-detail-column">
        <div className="specimen-chamber">
          <div className="specimen-detail-label"><span>{region.title}</span><span>{zoom}× enlargement</span></div>
          <div className="specimen-detail-surface" data-testid="specimen-detail">
            {!imageFailed && <Image src={source} width={1122} height={1402} unoptimized loading="lazy" alt={`Enlarged image detail: ${region.title}`} style={{ position: 'absolute', width: `${100 / width}%`, height: 'auto', maxWidth: 'none', transform: `translate(${-crop.x * 100}%, ${-crop.y * 100}%)` }} />}
          </div>
          <div className="specimen-detail-controls">
            <label className="specimen-position">Detail position <output>{Math.round(position.y * 100)}%</output><input ref={positionControl} type="range" min="16" max="86" step="1" value={Math.round(position.y * 100)} disabled={imageFailed} aria-label="Detail position" onChange={event => setPosition(value => ({ ...value, y: Number(event.target.value) / 100 }))} /></label>
            <div className="specimen-zoom" role="group" aria-label="Image enlargement">{[2, 3, 4].map(value => <button key={value} type="button" disabled={imageFailed} aria-pressed={zoom === value} onClick={() => setZoom(value)}>{value}×</button>)}</div>
          </div>
        </div>
        <div className="specimen-readout" aria-live="polite"><h3>{region.title}</h3><p>{region.note}</p></div>
      </div>
    </div>
  </section>
}
