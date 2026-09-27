'use client'

import { memo, useLayoutEffect, useRef, useState, type CSSProperties, type ElementType } from 'react'
import { Database, Globe, HeartPulse, Landmark, MapPin, Users, Waves } from 'lucide-react'
import './hero-art.css'

// Where the numbers come from: public sources and volunteers feed the
// database, and the database feeds the map. After AnimatedBeam in Magic UI
// (github.com/magicuidesign/magicui, MIT): the beams are measured from the
// real positions of the nodes, so the same drawing works as a row on wide
// screens and as a column on phones. Magic UI slides a gradient along each
// beam frame by frame; here a short dash travels along it in CSS, and the
// drawing is only re-measured when its size changes.

const SOURCES: Array<{ label: string; icon: ElementType; citizen?: boolean }> = [
  { label: 'EPA', icon: Landmark },
  { label: 'USGS', icon: Waves },
  { label: 'WHO', icon: Globe },
  { label: 'CDC', icon: HeartPulse },
  { label: 'EWG', icon: Database },
  { label: 'Volunteers', icon: Users, citizen: true },
]

type Beam = { d: string; citizen?: boolean }

export const SourceBeams = memo(function SourceBeams() {
  const root = useRef<HTMLDivElement>(null)
  const hub = useRef<HTMLDivElement>(null)
  const out = useRef<HTMLDivElement>(null)
  const nodes = useRef<Array<HTMLLIElement | null>>([])
  const [drawing, setDrawing] = useState<{ w: number; h: number; beams: Beam[]; exit: string } | null>(null)

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
      const curve = (a: { x: number; y: number }, b: { x: number; y: number }, vertical: boolean) => {
        const k = vertical ? (b.y - a.y) / 2 : (b.x - a.x) / 2
        return vertical
          ? `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${a.x.toFixed(1)} ${(a.y + k).toFixed(1)} ${b.x.toFixed(1)} ${(b.y - k).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
          : `M${a.x.toFixed(1)} ${a.y.toFixed(1)} C${(a.x + k).toFixed(1)} ${a.y.toFixed(1)} ${(b.x - k).toFixed(1)} ${b.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`
      }
      // Sources above the hub (phones) flow down; beside it (wide) flow across.
      const list = nodes.current[0]?.parentElement?.getBoundingClientRect()
      const vertical = !!list && list.bottom <= hubRect.top
      const beams: Beam[] = []
      nodes.current.forEach((node, index) => {
        if (!node) return
        const r = node.getBoundingClientRect()
        beams.push({
          d: curve(at(r, vertical ? 'bottom' : 'right'), at(hubRect, vertical ? 'top' : 'left'), vertical),
          citizen: SOURCES[index].citizen,
        })
      })
      const down = outRect.top >= hubRect.bottom
      const exit = curve(at(hubRect, down ? 'bottom' : 'right'), at(outRect, down ? 'top' : 'left'), down)
      setDrawing({ w: frame.width, h: frame.height, beams, exit })
    }
    measure()
    const sizes = new ResizeObserver(measure)
    sizes.observe(box)
    return () => sizes.disconnect()
  }, [])

  return (
    <div
      ref={root}
      className="source-beams"
      data-loop
      role="img"
      aria-label="Data flows from the EPA, USGS, WHO, CDC, EWG and volunteer readings into the Ripple database, and from there onto the map."
    >
      {drawing && (
        <svg className="sb-lines" width={drawing.w} height={drawing.h} viewBox={`0 0 ${drawing.w} ${drawing.h}`} aria-hidden="true">
          {drawing.beams.map((beam, i) => <path key={`b${i}`} className="sb-track" d={beam.d} />)}
          <path className="sb-track" d={drawing.exit} />
          {drawing.beams.map((beam, i) => (
            <path
              key={`p${i}`}
              className={beam.citizen ? 'sb-pulse sb-pulse--citizen' : 'sb-pulse'}
              d={beam.d}
              pathLength={1}
              style={{ '--d': `${(i * 0.47) % 2.8}s` } as CSSProperties}
            />
          ))}
          <path className="sb-pulse sb-pulse--exit" d={drawing.exit} pathLength={1} />
        </svg>
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
