'use client'

import type { CSSProperties, ElementType } from 'react'
import { Building2, FlaskConical, GraduationCap, HandHeart, Landmark, Users, Waves } from 'lucide-react'
import './hero-art.css'

// Who the initiative works with, circling the crew. After OrbitingCircles in
// Magic UI (github.com/magicuidesign/magicui, MIT): each partner rides a
// rotate / translate / counter-rotate transform, so it circles the centre
// while staying upright, on the compositor, pausing off screen.

type Orbiter = { label: string; icon: ElementType }

const INNER: Orbiter[] = [
  { label: 'Schools', icon: GraduationCap },
  { label: 'Labs', icon: FlaskConical },
  { label: 'Utilities', icon: Building2 },
]
const OUTER: Orbiter[] = [
  { label: 'Community', icon: Users },
  { label: 'Sponsors', icon: HandHeart },
  { label: 'Nonprofits', icon: Landmark },
  { label: 'Watersheds', icon: Waves },
]

function Ring({ items, ring }: { items: Orbiter[]; ring: 'inner' | 'outer' }) {
  return items.map(({ label, icon: Icon }, i) => (
    <div key={label} className={`po-item po-item--${ring}`} style={{ '--angle': (360 / items.length) * i + (ring === 'outer' ? 45 : 0) } as CSSProperties}>
      <div className="po-body">
        <span className="po-tile"><Icon className="h-4 w-4" /></span>
        <span className="po-label">{label}</span>
      </div>
    </div>
  ))
}

export function PartnerOrbits() {
  return (
    <div
      className="partner-orbits"
      data-loop
      role="img"
      aria-label="Schools, labs, utilities, community groups, sponsors, nonprofits and watershed groups around A Ripple Effect Initiative."
    >
      <svg className="po-paths" viewBox="-200 -200 400 400" aria-hidden="true">
        <circle className="po-path" r={96} />
        <circle className="po-path" r={170} />
      </svg>
      <div className="po-center" aria-hidden="true">
        <span className="po-center-ring" />
        <img src="/logo-96.webp" alt="" width={60} height={60} />
      </div>
      <div aria-hidden="true">
        <Ring items={INNER} ring="inner" />
        <Ring items={OUTER} ring="outer" />
      </div>
    </div>
  )
}
