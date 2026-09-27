'use client'

import type { CSSProperties } from 'react'
import './hero-art.css'

// "One act. Endless impact." A drop falls, a small jet leaps back up, and rings
// spread across the water. The resting rings are Magic UI's Ripple
// (github.com/magicuidesign/magicui, MIT): concentric circles, each wider and
// fainter than the last. Here they lie flat as ellipses on the water, and a
// travelling wave runs out through them after every drop.
// Only transform and opacity animate; it all pauses off screen.

const RESTING = 7
const WAVES = 5

export function RippleRings() {
  return (
    <div className="ripple-rings" data-loop aria-hidden="true">
      <svg className="rr-rest" viewBox="-230 -80 460 160">
        {Array.from({ length: RESTING }, (_, i) => {
          const rx = 38 + i * 30
          return <ellipse key={i} rx={rx} ry={rx * 0.32} style={{ opacity: 0.3 - i * 0.035 } as CSSProperties} />
        })}
      </svg>
      <span className="rr-glow" />
      {Array.from({ length: WAVES }, (_, i) => (
        <span key={i} className="rr-wave" style={{ '--i': i } as CSSProperties} />
      ))}
      {/* The drop falls as a span: browsers only hand animations to the GPU on
          HTML boxes, not on SVG elements. */}
      <span className="rr-drop">
        <svg viewBox="0 0 20 28">
          <path d="M10 0C10 0 0 12.5 0 18.5A10 10 0 0 0 20 18.5C20 12.5 10 0 10 0Z" />
          <path className="rr-drop-shine" d="M5.5 17.5a5 5 0 0 0 3 5" />
        </svg>
      </span>
      <span className="rr-jet" />
    </div>
  )
}
