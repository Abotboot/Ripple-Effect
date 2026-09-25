'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import type { Section } from '@/components/site/site-header'
import { glideTo } from '@/components/atmosphere/smooth-current'
import { RollText } from '@/components/motion/roll-text'
import './bottle-story.css'

// A pinned, scroll-driven look inside one bottle of water: the bottle, a lens
// that magnifies it, the study count, and the nanoplastics too small to see.
// Scrolling only updates a handful of CSS variables; every moving layer is a
// transform/opacity/clip-path change the compositor can handle on phones.

const RESEARCH_SOURCE = 'https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water'
const STUDY_AVERAGE = 240_000
const format = new Intl.NumberFormat('en-US')

const CHAPTERS = [
  { label: 'The bottle', start: 0 },
  { label: 'Magnify', start: 0.22 },
  { label: 'Count', start: 0.5 },
  { label: 'Smaller still', start: 0.78 },
] as const

// Photo-derived particle cutouts (see public/media/ripple/photo-cutouts/README.md).
// x/y are stage percentages; s is size in px at desktop scale; m hides on
// phones, and phone-only ones (p) sit where the smaller phone lens opens.
const PARTICLES: Array<{ src: string; x: number; y: number; s: number; r: number; d: number; m?: boolean; p?: boolean }> = [
  { src: 'fiber', x: 64, y: 50, s: 190, r: -18, d: 0 },
  { src: 'fragment', x: 54, y: 62, s: 150, r: 12, d: 1.2 },
  { src: 'turquoise', x: 72, y: 66, s: 96, r: 40, d: 2.1 },
  { src: 'ring', x: 60, y: 76, s: 84, r: 0, d: 3.4 },
  { src: 'clear', x: 76, y: 48, s: 72, r: -30, d: 0.6 },
  { src: 'pellet', x: 50, y: 44, s: 64, r: 22, d: 2.8 },
  { src: 'green', x: 82, y: 58, s: 88, r: -8, d: 1.7 },
  { src: 'foam', x: 44, y: 70, s: 70, r: 16, d: 3.9, m: true },
  { src: 'black', x: 68, y: 36, s: 58, r: 60, d: 0.9 },
  { src: 'grey', x: 86, y: 76, s: 52, r: -40, d: 2.4, m: true },
  { src: 'chip', x: 36, y: 56, s: 60, r: 8, d: 4.4, m: true },
  { src: 'cream', x: 80, y: 26, s: 66, r: 30, d: 1.4, m: true },
  { src: 'turquoise', x: 26, y: 34, s: 54, r: -12, d: 3.1, m: true },
  { src: 'fragment', x: 18, y: 72, s: 80, r: 44, d: 0.3, m: true },
  { src: 'clear', x: 30, y: 84, s: 46, r: 12, d: 2.2, m: true },
  { src: 'fiber', x: 12, y: 46, s: 120, r: 70, d: 1.9, m: true },
  { src: 'fragment', x: 71, y: 55.5, s: 104, r: -10, d: 1.1, m: true },
  { src: 'ring', x: 75, y: 61.5, s: 62, r: 20, d: 3.0, m: true },
  { src: 'fiber', x: 47, y: 32, s: 110, r: -24, d: 0.8, p: true },
  { src: 'turquoise', x: 55, y: 37, s: 76, r: 18, d: 2.6, p: true },
]

// Tappable points on the bottle in the first chapter. x/y are percentages of
// the bottle figure; "below" opens the note under the point on phones.
const HOTSPOTS = [
  { id: 'cap', x: 57, y: 14, below: true, title: 'The cap',
    body: 'Usually polyethylene or polypropylene. In lab tests, repeatedly opening and closing a cap released plastic particles into the water.' },
  { id: 'body', x: 62, y: 46, below: true, title: 'The bottle',
    body: 'Most single-use water bottles are PET, resin code 1. PET particles turned up in the 2024 study too.' },
  { id: 'water', x: 44, y: 78, below: false, title: 'The water',
    body: 'Polyamide, a nylon, was the most common plastic the study found. The researchers suggest it may come from filters used to purify the water.' },
] as const
type HotspotId = (typeof HOTSPOTS)[number]['id']

const clamp = (value: number, min = 0, max = 1) => Math.min(max, Math.max(min, value))
const smooth = (edge0: number, edge1: number, value: number) => {
  const t = clamp((value - edge0) / (edge1 - edge0))
  return t * t * (3 - 2 * t)
}

export function BottleStory({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const root = useRef<HTMLElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const bottle = useRef<HTMLImageElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const [spot, setSpot] = useState<HotspotId | null>(null)
  const closeSpot = useRef(() => setSpot(null))

  // An open note closes on Escape or a tap anywhere but a marker (the note
  // itself included, so on phones it never hides the next marker for long).
  useEffect(() => {
    if (!spot) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSpot(null) }
    const onPointer = (event: PointerEvent) => {
      if (!(event.target as Element | null)?.closest?.('.bs-hotspot > button')) setSpot(null)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('pointerdown', onPointer) }
  }, [spot])

  useEffect(() => {
    const section = root.current, view = stage.current, image = bottle.current, digits = count.current
    if (!section || !view || !image || !digits) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      digits.textContent = `≈${format.format(STUDY_AVERAGE)}`
      return
    }

    const figure = image.parentElement as HTMLElement
    const pick = (selector: string) => view.querySelector(selector) as HTMLElement
    const micro = pick('.bs-micro'), water = pick('.bs-micro-water'), particles = pick('.bs-particles')
    const nanoField = pick('.bs-nano'), ring = pick('.bs-lens-ring'), tag = pick('.bs-lens-tag'), railFill = pick('.bs-rail-fill')

    let frame = 0
    let geometry = { cx: 0, cy: 0, lens: 64, cover: 0 }
    let lastStep = -1
    let lastCount = -1
    // Each frame writes only the properties of the few layers that move, and
    // only when a value changed, so style work stays off the rest of the story.
    const written = new Map<string, string>()
    const write = (element: HTMLElement, key: string, property: string, value: string) => {
      const id = key + property
      if (written.get(id) === value) return
      written.set(id, value)
      element.style.setProperty(property, value)
    }

    const measure = () => {
      // Layout boxes (not transformed rects) give the bottle's resting place.
      const phone = matchMedia('(max-width: 767px)').matches
      const width = figure.offsetWidth, height = figure.offsetHeight
      const left = figure.offsetLeft - (phone ? width / 2 : 0)
      const top = figure.offsetTop - height / 2
      // The lens sits on the bottle's water, a little below the label.
      geometry = {
        cx: left + width * 0.5,
        cy: top + height * 0.64,
        lens: Math.max(64, width * 0.36),
        cover: Math.hypot(view.clientWidth, view.clientHeight),
      }
      const x = `${geometry.cx.toFixed(1)}px`, y = `${geometry.cy.toFixed(1)}px`
      water.style.setProperty('--lens-x', x)
      water.style.setProperty('--lens-y', y)
      particles.style.transformOrigin = `${x} ${y}`
      ring.style.left = tag.style.left = x
      ring.style.top = tag.style.top = y
      ring.style.width = ring.style.height = `${(geometry.lens * 2).toFixed(1)}px`
      written.clear()
    }

    const paint = () => {
      frame = 0
      const rect = section.getBoundingClientRect()
      const travel = Math.max(1, rect.height - window.innerHeight)
      const p = clamp(-rect.top / travel)

      const intro = smooth(0, 0.14, p)
      const open = smooth(0.2, 0.42, p)
      const flood = smooth(0.46, 0.66, p)
      const nano = smooth(0.76, 0.92, p)
      const radius = open * geometry.lens + flood * (geometry.cover - geometry.lens)

      write(figure, 'b', '--intro', intro.toFixed(3))
      write(figure, 'b', '--open', open.toFixed(3))
      write(figure, 'b', '--flood', flood.toFixed(3))
      write(micro, 'm', 'clip-path', `circle(${radius.toFixed(1)}px at ${geometry.cx.toFixed(1)}px ${geometry.cy.toFixed(1)}px)`)
      write(particles, 'p', 'scale', (1.5 - flood * 0.5 - nano * 0.12).toFixed(3))
      write(particles, 'p', 'opacity', (1 - nano * 0.55).toFixed(3))
      write(nanoField, 'n', 'opacity', nano.toFixed(3))
      const ringOpacity = (open * (1 - smooth(0, 0.3, flood))).toFixed(3)
      write(ring, 'r', 'scale', (radius / geometry.lens).toFixed(3))
      write(ring, 'r', 'opacity', ringOpacity)
      // The tag rides the ring's top edge at a constant size.
      write(tag, 't', 'translate', `-50% calc(-50% - ${radius.toFixed(1)}px)`)
      write(tag, 't', 'opacity', ringOpacity)
      write(railFill, 'f', 'scale', `1 ${p.toFixed(3)}`)

      let step = 0
      for (let i = 0; i < CHAPTERS.length; i++) if (p >= CHAPTERS[i].start) step = i
      if (step !== lastStep) {
        view.dataset.step = String(step)
        if (lastStep !== -1) closeSpot.current()
        lastStep = step
      }

      // The count climbs with the scroll through the "Count" chapter.
      const value = Math.round(STUDY_AVERAGE * smooth(0.5, 0.72, p) / 100) * 100
      if (value !== lastCount) { digits.textContent = `≈${format.format(value)}`; lastCount = value }
    }

    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const onResize = () => { measure(); schedule() }

    // Only listen while the story is near the viewport.
    let listening = false
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !listening) {
        listening = true
        measure()
        window.addEventListener('scroll', schedule, { passive: true })
        window.addEventListener('resize', onResize, { passive: true })
        schedule()
      } else if (!entry.isIntersecting && listening) {
        listening = false
        window.removeEventListener('scroll', schedule)
        window.removeEventListener('resize', onResize)
      }
    }, { rootMargin: '50% 0px' })
    observer.observe(section)
    if (!image.complete) image.addEventListener('load', onResize, { once: true })

    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', onResize)
      image.removeEventListener('load', onResize)
    }
  }, [])

  const jumpTo = (start: number) => {
    const section = root.current
    if (!section) return
    const travel = section.offsetHeight - window.innerHeight
    const top = section.getBoundingClientRect().top + window.scrollY + travel * (start + 0.02)
    glideTo(top)
  }

  const searchWater = () => {
    const target = document.getElementById('search')
    if (target) glideTo(target.getBoundingClientRect().top + window.scrollY - 24)
    requestAnimationFrame(() => document.getElementById('tank-search-input')?.focus({ preventScroll: true }))
  }

  return (
    <section ref={root} className="bottle-story" aria-labelledby="bottle-story-title" data-loop>
      <div ref={stage} className="bottle-stage" data-step="0">
        <div className="bs-backdrop" aria-hidden="true" />

        <figure className="bs-bottle">
          <img
            ref={bottle}
            src="/media/ripple/specimen/bottle-glass-960.webp"
            srcSet="/media/ripple/specimen/bottle-glass-640.webp 512w, /media/ripple/specimen/bottle-glass-960.webp 768w"
            sizes="(max-width: 767px) 60vw, 34vw"
            width={768}
            height={960}
            alt="A half-liter plastic bottle of purified drinking water"
            loading="lazy"
            decoding="async"
            draggable={false}
          />
          <span className="bs-sheen" aria-hidden="true" />
          <div className="bs-hotspots">
            {HOTSPOTS.map(point => {
              const open = spot === point.id
              return (
                <div
                  key={point.id}
                  className="bs-hotspot"
                  data-open={open || undefined}
                  data-below={point.below || undefined}
                  style={{ '--hx': `${point.x}%`, '--hy': `${point.y}%` } as CSSProperties}
                >
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={`bs-note-${point.id}`}
                    aria-label={`${point.title}: what it is made of`}
                    onClick={() => setSpot(open ? null : point.id)}
                    data-cursor={open ? 'Close' : 'Look'}
                  >
                    <span aria-hidden="true" />
                  </button>
                  <div id={`bs-note-${point.id}`} className="bs-hotspot-note" role="note" hidden={!open}>
                    <strong>{point.title}</strong>
                    <p>{point.body}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </figure>

        {/* The magnified water: revealed through a circle that grows from the bottle. */}
        <div className="bs-micro" aria-hidden="true">
          <div className="bs-micro-water" />
          <div className="bs-particles">
            {PARTICLES.map((particle, index) => (
              <span
                key={index}
                className={particle.m ? 'bs-particle bs-particle--wide' : particle.p ? 'bs-particle bs-particle--phone' : 'bs-particle'}
                style={{ '--x': `${particle.x}%`, '--y': `${particle.y}%`, '--s': `${particle.s}px`, '--r': `${particle.r}deg`, '--d': `${particle.d}s` } as CSSProperties}
              >
                <img src={`/media/ripple/photo-cutouts/${particle.src}.webp`} alt="" loading="lazy" decoding="async" draggable={false} />
              </span>
            ))}
          </div>
          <div className="bs-nano" />
        </div>
        <div className="bs-lens-ring" aria-hidden="true" />
        <span className="bs-lens-tag" aria-hidden="true">100×</span>

        <div className="bs-copy">
          <p className="bs-kicker">Bottled water, up close</p>
          <article className="bs-chapter" data-i="0">
            <span className="bs-eyebrow">01 — The bottle</span>
            <h2 id="bottle-story-title">It looks clear.</h2>
            <p>Half a liter of purified drinking water. At arm&apos;s length, there is nothing to see.</p>
            <p className="bs-hint"><span aria-hidden="true">+</span> Tap the bottle&apos;s markers to see what it is made of.</p>
          </article>
          <article className="bs-chapter" data-i="1">
            <span className="bs-eyebrow">02 — Magnify</span>
            <h2>Look closer.</h2>
            <p>Under a microscope, fibers, fragments and flakes of plastic turn up in water that looked spotless.</p>
          </article>
          <article className="bs-chapter" data-i="2">
            <span className="bs-eyebrow">03 — Count</span>
            <h2 className="bs-count" aria-label={`Approximately ${format.format(STUDY_AVERAGE)} particles per liter, on average`}>
              <span ref={count} aria-hidden="true">≈0</span>
            </h2>
            <p className="bs-count-unit">particles per liter, on average</p>
            <p>A 2024 study of three bottled-water brands, summarized by the NIH. Counts varied by brand; this is not a measurement of your water.</p>
            <a className="bs-source" href={RESEARCH_SOURCE} target="_blank" rel="noopener noreferrer">NIH research summary ↗</a>
          </article>
          <article className="bs-chapter" data-i="3">
            <span className="bs-eyebrow">04 — Smaller still</span>
            <h2>About 90% were nanoplastics.</h2>
            <p>Smaller than a micrometer: far too small to see, and rarely measured. So we map what is measured, on the water where it was collected.</p>
            <div className="bs-actions">
              <button type="button" className="bs-action bs-action--primary" onClick={searchWater} data-magnetic data-roll><RollText text="Search your water ↗" /></button>
              <button type="button" className="bs-action" onClick={() => onNavigate?.('submit')} data-roll><RollText text="Pin a reading →" /></button>
            </div>
          </article>
          <p className="bs-note">Particles shown are photo-derived illustrations, not to scale.</p>
        </div>

        <nav className="bs-rail" aria-label="Bottle story chapters">
          <span className="bs-rail-fill" aria-hidden="true" />
          {CHAPTERS.map((chapter, index) => (
            <button key={chapter.label} type="button" data-i={index} onClick={() => jumpTo(chapter.start)}>
              <span className="bs-rail-dot" aria-hidden="true" />
              <span className="bs-rail-label">{chapter.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </section>
  )
}
