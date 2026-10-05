'use client'

import { memo, useId, useLayoutEffect, useRef, useState, type ElementType } from 'react'
import { Database, Globe, HeartPulse, Landmark, MapPin, Users, Waves } from 'lucide-react'
import './hero-art.css'

// Where the numbers come from: public sources and volunteers feed the
// database, and the database feeds the map. After AnimatedBeam in Magic UI
// (github.com/magicuidesign/magicui, MIT): the beams are measured from the
// real positions of the nodes, so the same drawing works as a row on wide
// screens and as a column on phones. Magic UI slides a gradient along each
// beam frame by frame; here a short light rides each beam on CSS keyframes
// that bake in the curve as positions (transform and opacity only, so the GPU
// runs them; a travelling SVG dash repaints on the main thread every frame).
// The drawing is only re-measured when its size changes.

const SOURCES: Array<{ label: string; icon: ElementType; citizen?: boolean }> = [
  { label: 'EPA', icon: Landmark },
  { label: 'USGS', icon: Waves },
  { label: 'WHO', icon: Globe },
  { label: 'CDC', icon: HeartPulse },
  { label: 'EWG', icon: Database },
  { label: 'Volunteers', icon: Users, citizen: true },
]

type P = { x: number; y: number }
type Curve = [P, P, P, P]
type Beam = { d: string; citizen?: boolean }

const fixed = (n: number) => n.toFixed(1)
const pathOf = ([a, c1, c2, b]: Curve) =>
  `M${fixed(a.x)} ${fixed(a.y)} C${fixed(c1.x)} ${fixed(c1.y)} ${fixed(c2.x)} ${fixed(c2.y)} ${fixed(b.x)} ${fixed(b.y)}`
const pointOf = ([a, c1, c2, b]: Curve, t: number): P => {
  const u = 1 - t
  return {
    x: u * u * u * a.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * b.x,
    y: u * u * u * a.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * b.y,
  }
}
const easeInOut = (t: number) => t < 0.5 ? 4 * t * t * t : 1 - (2 - 2 * t) ** 3 / 2

/**
 * Keyframes that carry a light along a curve, facing the way it travels:
 * steady along the length (like a dash on a path), easing in and out, fading
 * at both ends. The easing is baked into the steps, which run linearly.
 */
function ride(name: string, curve: Curve): string {
  const SAMPLES = 64
  const STEPS = 32
  const points = Array.from({ length: SAMPLES + 1 }, (_, i) => pointOf(curve, i / SAMPLES))
  const lengths = [0]
  for (let i = 1; i <= SAMPLES; i++) lengths.push(lengths[i - 1] + Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y))
  const total = lengths[SAMPLES] || 1
  const frames: string[] = []
  let previous: number | null = null
  for (let step = 0; step <= STEPS; step++) {
    const along = easeInOut(step / STEPS)
    let i = 1
    while (i < SAMPLES && lengths[i] < along * total) i++
    const from = points[i - 1], to = points[i]
    const r = Math.min(1, Math.max(0, (along * total - lengths[i - 1]) / ((lengths[i] - lengths[i - 1]) || 1)))
    let angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI
    if (previous !== null) angle += Math.round((previous - angle) / 360) * 360
    previous = angle
    const opacity = Math.min(1, along / 0.08, (1 - along) / 0.08)
    frames.push(`${(step / STEPS * 100).toFixed(2)}%{transform:translate(${fixed(from.x + (to.x - from.x) * r)}px,${fixed(from.y + (to.y - from.y) * r)}px) rotate(${angle.toFixed(1)}deg);opacity:${opacity.toFixed(2)}}`)
  }
  return `@keyframes ${name}{${frames.join('')}}`
}

export const SourceBeams = memo(function SourceBeams() {
  const root = useRef<HTMLDivElement>(null)
  const hub = useRef<HTMLDivElement>(null)
  const out = useRef<HTMLDivElement>(null)
  const nodes = useRef<Array<HTMLLIElement | null>>([])
  const [drawing, setDrawing] = useState<{ w: number; h: number; beams: Beam[]; exit: string; rides: string } | null>(null)
  const prefix = `sb-ride-${useId().replace(/[^a-zA-Z0-9]/g, '')}-`

  useLayoutEffect(() => {
    const box = root.current
    if (!box) return
    const measure = () => {
      const frame = box.getBoundingClientRect()
      const hubRect = hub.current?.getBoundingClientRect()
      const outRect = out.current?.getBoundingClientRect()
      if (!hubRect || !outRect || !frame.width) return
      const at = (r: DOMRect, side: 'left' | 'right' | 'top' | 'bottom') => ({
        x: (side === 'left' ? r.left : side === 'right' ? r.right : r.left + r.width / 2) - frame.left,
        y: (side === 'top' ? r.top : side === 'bottom' ? r.bottom : r.top + r.height / 2) - frame.top,
      })
      // A smooth S-curve that leaves and arrives square to the nodes.
      const curve = (a: P, b: P, vertical: boolean): Curve => {
        const k = vertical ? (b.y - a.y) / 2 : (b.x - a.x) / 2
        return vertical
          ? [a, { x: a.x, y: a.y + k }, { x: b.x, y: b.y - k }, b]
          : [a, { x: a.x + k, y: a.y }, { x: b.x - k, y: b.y }, b]
      }
      // Sources above the hub (phones) flow down; beside it (wide) flow across.
      const list = nodes.current[0]?.parentElement?.getBoundingClientRect()
      const vertical = !!list && list.bottom <= hubRect.top
      const beams: Beam[] = []
      const rides: string[] = []
      nodes.current.forEach((node, index) => {
        if (!node) return
        const r = node.getBoundingClientRect()
        const c = curve(at(r, vertical ? 'bottom' : 'right'), at(hubRect, vertical ? 'top' : 'left'), vertical)
        rides.push(ride(`${prefix}${beams.length}`, c))
        beams.push({ d: pathOf(c), citizen: SOURCES[index].citizen })
      })
      const down = outRect.top >= hubRect.bottom
      const exit = curve(at(hubRect, down ? 'bottom' : 'right'), at(outRect, down ? 'top' : 'left'), down)
      rides.push(ride(`${prefix}exit`, exit))
      setDrawing({ w: frame.width, h: frame.height, beams, exit: pathOf(exit), rides: rides.join('') })
    }
    measure()
    const sizes = new ResizeObserver(measure)
    sizes.observe(box)
    return () => sizes.disconnect()
  }, [prefix])

  return (
    <div
      ref={root}
      className="source-beams"
      data-loop
      role="img"
      aria-label="Data flows from the EPA, USGS, WHO, CDC, EWG and volunteer readings into the Ripple database, and from there onto the map."
    >
      {drawing && (
        <>
          <style>{drawing.rides}</style>
          <svg className="sb-lines" width={drawing.w} height={drawing.h} viewBox={`0 0 ${drawing.w} ${drawing.h}`} aria-hidden="true">
            {drawing.beams.map((beam, i) => <path key={i} className="sb-track" d={beam.d} />)}
            <path className="sb-track" d={drawing.exit} />
          </svg>
          <div className="sb-lights" aria-hidden="true">
            {drawing.beams.map((beam, i) => (
              <span
                key={i}
                className={beam.citizen ? 'sb-light sb-light--citizen' : 'sb-light'}
                style={{ animationName: `${prefix}${i}`, animationDelay: `${(i * 0.47) % 2.8}s` }}
              />
            ))}
            <span className="sb-light sb-light--exit" style={{ animationName: `${prefix}exit` }} />
          </div>
        </>
      )}
      <ul className="sb-sources" aria-hidden="true">
        {SOURCES.map(({ label, icon: Icon, citizen }, i) => (
          <li key={label} ref={el => { nodes.current[i] = el }} className="sb-node" data-citizen={citizen ? '' : undefined}>
            <Icon className="h-4 w-4" />
            <span className="sb-label">{label}</span>
          </li>
        ))}
      </ul>
      <div ref={hub} className="sb-hub" aria-hidden="true">
        <span className="sb-hub-ring" />
        <span className="sb-hub-ring" style={{ animationDelay: '-.7s' }} />
        <img src="/logo-96.webp" alt="" width={48} height={48} />
        <span className="sb-label">Database</span>
      </div>
      <div ref={out} className="sb-node sb-out" aria-hidden="true">
        <MapPin className="h-5 w-5" />
        <span className="sb-label">Map</span>
      </div>
    </div>
  )
})
