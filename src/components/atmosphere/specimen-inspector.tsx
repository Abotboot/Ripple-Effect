'use client'

import { useEffect, useRef, useState } from 'react'
import './specimen-inspector.css'

const BOTTLE = 'M -37 -193 L 37 -193 L 37 -157 C 37 -132 93 -127 93 -85 L 93 180 Q 93 207 65 207 L -65 207 Q -93 207 -93 180 L -93 -85 C -93 -127 -37 -132 -37 -157 Z'

export function SpecimenInspector() {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [uv, setUv] = useState(false)
  const [angle, setAngle] = useState(0)

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const draw = () => {
      const { width, height } = element.getBoundingClientRect()
      if (!width || !height) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.round(width * dpr)
      element.height = Math.round(height * dpr)
      const c = context
      c.setTransform(dpr, 0, 0, dpr, 0, 0)
      c.clearRect(0, 0, width, height)
      const scale = Math.min(width / 360, height / 550)
      const radians = angle * Math.PI / 180
      c.translate(width / 2, height / 2 + 12)
      c.scale(scale, scale)

      // Axially symmetric bottle: rotating meridians and inclusions supply depth.
      c.strokeStyle = uv ? '#8b467d' : '#244e4a'
      c.lineWidth = 1
      c.beginPath(); c.ellipse(0, 229, 127, 16, 0, 0, Math.PI * 2); c.stroke()
      c.setLineDash([2, 9])
      c.beginPath(); c.moveTo(-149, -237); c.lineTo(-149, 215); c.moveTo(149, -237); c.lineTo(149, 215); c.stroke()
      c.setLineDash([])
      const bottle = new Path2D(BOTTLE)
      const glass = c.createLinearGradient(-93, 0, 93, 0)
      glass.addColorStop(0, uv ? '#271126' : '#133e40')
      glass.addColorStop(.2, uv ? '#100d20' : '#629b9a')
      glass.addColorStop(.42, uv ? '#090e19' : '#143d41')
      glass.addColorStop(.8, uv ? '#130d23' : '#315d61')
      glass.addColorStop(1, uv ? '#422049' : '#87b5ac')
      c.fillStyle = glass; c.fill(bottle)
      c.strokeStyle = uv ? '#ff71ba' : '#acd5cc'; c.lineWidth = 1.5; c.stroke(bottle)
      c.save(); c.clip(bottle)
      for (let i = 0; i < 12; i++) {
        const phase = radians + i * Math.PI / 6
        c.strokeStyle = uv ? `rgba(247,102,193,${.15 + (Math.cos(phase) + 1) * .15})` : 'rgba(202,244,235,.12)'
        c.beginPath(); c.ellipse(Math.sin(phase) * 70, 27, 16, 186, 0, 0, Math.PI * 2); c.stroke()
      }
      for (let y = -79; y < 200; y += 29) {
        c.strokeStyle = uv ? '#864477' : '#89b8b270'
        c.beginPath(); c.ellipse(0, y, 96, 9, 0, 0, Math.PI * 2); c.stroke()
      }
      if (uv) {
        for (let i = 0; i < 105; i++) {
          const phase = i * 2.39996 + radians
          const depth = Math.cos(phase)
          const x = Math.sin(phase) * (20 + i % 67)
          const y = -126 + ((i * 71) % 311)
          c.globalAlpha = .35 + (depth + 1) * .325
          c.fillStyle = i % 3 ? '#ff6ca8' : '#37f6cb'
          c.strokeStyle = c.fillStyle
          if (i % 4 === 0) {
            c.beginPath(); c.moveTo(x, y); c.quadraticCurveTo(x + 9, y - 6, x + 4, y + 10); c.stroke()
          } else { c.beginPath(); c.arc(x, y, depth > 0 ? 2.5 : 1.4, 0, Math.PI * 2); c.fill() }
        }
        c.globalAlpha = 1
      } else {
        c.save(); c.translate(Math.sin(radians) * 65, 15); c.scale(Math.cos(radians), 1)
        c.fillStyle = '#d4e9df'; c.fillRect(-84, -40, 168, 99)
        c.fillStyle = '#153d36'; c.textAlign = 'center'; c.font = '12px monospace'; c.fillText('SPECIMEN / 001', 0, -9)
        c.font = '34px Georgia'; c.fillText('CLEAR', 0, 29)
        c.restore()
      }
      c.restore()
      c.fillStyle = uv ? '#392441' : '#cadbd2'; c.fillRect(-41, -221, 82, 27)
      c.strokeStyle = uv ? '#ef8bda' : '#577b71'
      for (let x = -35; x < 41; x += 7) { c.beginPath(); c.moveTo(x, -218); c.lineTo(x, -197); c.stroke() }
      element.dataset.rendered = uv ? 'uv' : 'macro'
      element.dataset.angle = String(angle)
    }
    const observer = new ResizeObserver(draw)
    observer.observe(element); draw()
    return () => observer.disconnect()
  }, [uv, angle])

  return <section className="specimen-stage" aria-labelledby="specimen-title" data-mode={uv ? 'uv' : 'macro'}>
    <div className="specimen-copy">
      <p className="specimen-kicker">SPECIMEN 001 / OPTICAL INTERROGATION</p>
      <h2 id="specimen-title">Change the lens.<br /><em>Not the water.</em></h2>
      <p>A familiar silhouette. A less familiar scale. Switch the view to explore an illustrated world beneath the surface.</p>
      <div className="specimen-modes" role="group" aria-label="Specimen view">
        <button type="button" aria-pressed={!uv} onClick={() => setUv(false)}>Macro view</button>
        <button type="button" aria-pressed={uv} onClick={() => setUv(true)}>UV view</button>
      </div>
      <div className="specimen-readout" aria-live="polite" aria-atomic="true">
        <h3>{uv ? 'Below the visible threshold.' : 'Clarity is an appearance.'}</h3>
        <p>{uv ? 'The colored fragments and fibers are an illustration. Their size, number and distribution do not represent measurements of this bottle.' : 'A clear bottle cannot tell you how many micro- or nanoplastic particles its water contains.'}</p>
        <dl><div><dt>{uv ? 'Study average / per liter' : 'Instrument'}</dt><dd>{uv ? '~240,000 particles' : 'Unaided eye'}</dd></div>
          <div><dt>{uv ? 'Nanoplastic share / study' : 'Particle concentration'}</dt><dd>{uv ? '~90%' : 'Not measured'}</dd></div></dl>
      </div>
      <p className="specimen-caveat">Illustrative visualization, not spectrometry or a UV test. The 2024 study examined three bottled-water brands; it does not establish this specimen’s contents or a shedding rate.</p>
      <a href="https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water" target="_blank" rel="noopener noreferrer">Study context / NIH <span aria-hidden="true">↗</span></a>
    </div>
    <div className="specimen-chamber">
      <div className="specimen-chamber-label"><span>VESSEL / PET ILLUSTRATION</span><span>{uv ? 'UV / CONCEPT' : 'MACRO / EXTERIOR'}</span></div>
      <canvas ref={canvas} role="img" aria-label={uv ? 'Illustrated bottle with colored particle and fiber markers, not measurement data' : 'Illustrated clear ribbed water bottle with a pale label'}>Illustrated water bottle. Use the view buttons for accompanying text descriptions.</canvas>
      <label className="specimen-rotation">Rotate specimen <output>{angle}°</output>
        <input type="range" min="-180" max="180" step="5" value={angle} aria-label="Rotate specimen" aria-valuetext={`${angle} degrees`} onChange={event => setAngle(Number(event.target.value))} />
      </label>
      <p className="specimen-scale">NOT TO SCALE / PARTICLES ENLARGED FOR VISIBILITY</p>
    </div>
  </section>
}
