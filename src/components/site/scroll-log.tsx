'use client'

import { useEffect, useRef } from 'react'

// A small, playful log of how far the visitor has scrolled this visit,
// measured in CSS reference pixels (96 per inch) and half-liter bottles.
const METERS_PER_PX = 0.0254 / 96
const BOTTLE_METERS = 0.21 // a half-liter bottle stands about 21 cm tall

let traveled = 0
let tracking = false

function startTracking() {
  if (tracking) return
  tracking = true
  let last = window.scrollY
  window.addEventListener('scroll', () => {
    const y = window.scrollY
    const delta = Math.abs(y - last)
    last = y
    // Section changes jump to the top in one step; that is not scrolling.
    if (delta < window.innerHeight * 2) traveled += delta
  }, { passive: true })
}

function comparison(meters: number) {
  if (meters < 3) return 'Barely a ripple so far.'
  if (meters < 25) return 'Not yet one length of a 25 m pool.'
  if (meters < 50) return 'Past one length of a 25 m pool.'
  if (meters < 110) return 'Farther than an Olympic pool is long.'
  return 'Farther than a football field, end zones included.'
}

export function ScrollLog() {
  const distance = useRef<HTMLElement>(null)
  const bottles = useRef<HTMLElement>(null)
  const note = useRef<HTMLParagraphElement>(null)

  useEffect(() => {
    startTracking()
    const root = distance.current?.closest('.scroll-log')
    if (!root) return
    let frame = 0
    const paint = () => {
      frame = 0
      const meters = traveled * METERS_PER_PX
      if (distance.current) distance.current.textContent = meters.toFixed(1)
      if (bottles.current) bottles.current.textContent = String(Math.floor(meters / BOTTLE_METERS))
      if (note.current) note.current.textContent = comparison(meters)
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { paint(); window.addEventListener('scroll', schedule, { passive: true }) }
      else window.removeEventListener('scroll', schedule)
    })
    observer.observe(root)
    return () => { observer.disconnect(); window.removeEventListener('scroll', schedule); cancelAnimationFrame(frame) }
  }, [])

  return (
    <div className="scroll-log">
      <dl>
        <div><dt>Distance scrolled</dt><dd><b ref={distance}>0.0</b> m</dd></div>
        <div><dt>Half-liter bottles, end to end</dt><dd><b ref={bottles}>0</b></dd></div>
      </dl>
      <p ref={note}>Barely a ripple so far.</p>
    </div>
  )
}
