import type { CSSProperties } from 'react'
import './tide-line.css'

// Layered, drifting waves drawn as SVG: a waterline between two parts of the
// page. Each layer is twice the width of the view and slides by exactly half,
// so the loop is seamless; only transforms animate, and [data-loop] pauses the
// drift while the line is off screen.

const WIDTH = 2400
const HEIGHT = 120

function wave(periods: number, amplitude: number, baseline: number, phase: number, closed: boolean) {
  const steps = periods * 24
  const y = (i: number) => {
    const t = (i / steps) * periods * Math.PI * 2
    return baseline + amplitude * Math.sin(t + phase) + (amplitude / 3) * Math.sin(2 * t + phase * 1.7)
  }
  let d = closed ? `M0 ${HEIGHT} L0 ${y(0).toFixed(1)}` : `M0 ${y(0).toFixed(1)}`
  for (let i = 1; i <= steps; i++) d += ` L${((WIDTH * i) / steps).toFixed(1)} ${y(i).toFixed(1)}`
  return closed ? `${d} L${WIDTH} ${HEIGHT} Z` : d
}

// Periods are even so a shift of half the width lands on the same phase.
const BACK = wave(4, 16, 46, 0.6, true)
const MID = wave(6, 12, 60, 2.1, true)
const FRONT = wave(4, 13, 76, 4.2, true)
const CREST = wave(4, 13, 76, 4.2, false)

export function TideLine({ fill, className, style }: { fill: string; className?: string; style?: CSSProperties }) {
  return (
    <div className={className ? `tide-line ${className}` : 'tide-line'} style={{ '--tide-fill': fill, ...style } as CSSProperties} aria-hidden="true" data-loop>
      <svg className="tide-back" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none"><path d={BACK} /></svg>
      <svg className="tide-mid" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none"><path d={MID} /></svg>
      <svg className="tide-front" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none">
        <path d={FRONT} />
        <path className="tide-crest" d={CREST} vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  )
}
