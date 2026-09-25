'use client'

import { useEffect, useRef, useState } from 'react'
import { SplitWords } from '@/components/motion/split-words'
import './scale-zoom.css'

// "How small is small?" A single SVG world drawn to true relative scale in
// micrometres (a plastic fragment, a hair lying beside it, a red blood cell,
// a nanoplastic), with a camera that zooms logarithmically between them.
// Only the camera transform and two labels change while it zooms, and the
// autoplay runs only while the graphic is on screen.

const VIEW = 400 // SVG view is 400 x 400 units, centred on the camera
const FOCUS = 220 // each subject fills this many units when in focus

// Hair runs at 70 degrees beside the fragment; the smaller subjects sit off
// its right edge so each zoom still shows the one before as a curved wall.
const HAIR = { x: 3200, y: 400, angle: (70 * Math.PI) / 180, width: 70 }
const along = { x: Math.cos(HAIR.angle), y: Math.sin(HAIR.angle) }
const across = { x: along.y, y: -along.x }
const CELL = { x: HAIR.x + across.x * 41, y: HAIR.y + across.y * 41, r: 3.5 }
const NANO = { x: CELL.x + across.x * 4.2, y: CELL.y + across.y * 4.2, r: 0.5 }

const LEVELS = [
  { size: 5000, label: '5 mm', title: 'The upper limit of a microplastic', body: 'Plastic pieces smaller than five millimetres count as microplastics. Most of what turns up in water is far smaller.', centre: { x: 600, y: 0 } },
  { size: 70, label: '70 µm', title: 'About the width of a human hair', body: 'Zoom in 70 times and a single hair becomes a wide, scaly band. Many microplastics in drinking water are smaller than this.', centre: { x: HAIR.x + across.x * 20, y: HAIR.y + across.y * 20 } },
  { size: 7, label: '7 µm', title: 'About the size of a red blood cell', body: 'Ten times smaller again. Particles this small are hard to detect, so many studies cannot count them.', centre: { x: CELL.x, y: CELL.y } },
  { size: 1, label: '1 µm', title: 'Below this, it is a nanoplastic', body: 'Smaller than a micrometre. In the 2024 bottled-water study, about nine in ten particles found were this small.', centre: { x: NANO.x, y: NANO.y } },
] as const

// A plastic fragment about five millimetres across, centred on the origin.
const FRAGMENT = [[-2300, -900], [-1200, -2400], [400, -2100], [1900, -2500], [2500, -600], [1900, 1300], [2300, 2000], [300, 2500], [-1400, 1900], [-2500, 700]]
  .map(([x, y]) => `${x},${y}`).join(' ')

// Hair: a long band, with cuticle scales drawn only near where the camera looks.
const hairEdge = (side: number, t: number) => ({ x: HAIR.x + along.x * t + across.x * side * (HAIR.width / 2), y: HAIR.y + along.y * t + across.y * side * (HAIR.width / 2) })
const HAIR_BAND = [hairEdge(-1, -20000), hairEdge(-1, 20000), hairEdge(1, 20000), hairEdge(1, -20000)].map(p => `${p.x},${p.y}`).join(' ')
const CUTICLE = Array.from({ length: 34 }, (_, i) => {
  const t = (i - 17) * 9
  const a = hairEdge(-1, t), mid = { x: HAIR.x + along.x * (t + 5), y: HAIR.y + along.y * (t + 5) }, b = hairEdge(1, t)
  return `M${a.x} ${a.y} Q${mid.x} ${mid.y} ${b.x} ${b.y}`
}).join(' ')

// A nanoplastic: a small jagged grain with a few even smaller specks.
const NANO_SHAPE = Array.from({ length: 11 }, (_, i) => {
  const angle = (i / 11) * Math.PI * 2, r = NANO.r * (0.78 + ((i * 37) % 10) / 34)
  return `${(NANO.x + Math.cos(angle) * r).toFixed(3)},${(NANO.y + Math.sin(angle) * r).toFixed(3)}`
}).join(' ')
const SPECKS = [[0.62, -0.38, 0.07], [0.5, 0.52, 0.05], [0.15, 0.74, 0.04], [0.74, 0.12, 0.06]]

const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const scaleFor = (level: number) => FOCUS / LEVELS[level].size

function formatLength(micrometres: number) {
  if (micrometres >= 1000) return `${(micrometres / 1000).toFixed(micrometres >= 10000 ? 0 : 1)} mm`
  if (micrometres >= 1) return `${micrometres >= 10 ? Math.round(micrometres) : micrometres.toFixed(1)} µm`
  return `${Math.round(micrometres * 1000)} nm`
}

export function ScaleZoom() {
  const [level, setLevel] = useState(0)
  const camera = useRef<SVGGElement>(null)
  const scaleText = useRef<SVGTextElement>(null)
  const root = useRef<HTMLElement>(null)
  const state = useRef({ scale: scaleFor(0), x: LEVELS[0].centre.x as number, y: LEVELS[0].centre.y as number, frame: 0 })
  const touched = useRef(false)
  const shown = useRef(0)

  // Zoom the camera to the chosen level: log-linear in scale, and the centre
  // moves in step with the scale so the target stays put as it grows.
  useEffect(() => {
    shown.current = level
    const paint = () => {
      const { scale, x, y } = state.current
      camera.current?.setAttribute('transform', `translate(${VIEW / 2} ${VIEW / 2}) scale(${scale}) translate(${-x} ${-y})`)
      if (scaleText.current) scaleText.current.textContent = formatLength(96 / scale)
    }
    const target = { scale: scaleFor(level), x: LEVELS[level].centre.x, y: LEVELS[level].centre.y }
    const from = { ...state.current }
    cancelAnimationFrame(from.frame)
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      Object.assign(state.current, target)
      paint()
      return
    }
    const duration = 1500, start = performance.now()
    const logFrom = Math.log(from.scale), logTo = Math.log(target.scale)
    const step = (now: number) => {
      const t = ease(Math.min(1, (now - start) / duration))
      const scale = Math.exp(logFrom + (logTo - logFrom) * t)
      const w = target.scale === from.scale ? t : (scale - from.scale) / (target.scale - from.scale)
      state.current.scale = scale
      state.current.x = from.x + (target.x - from.x) * w
      state.current.y = from.y + (target.y - from.y) * w
      paint()
      state.current.frame = t < 1 ? requestAnimationFrame(step) : 0
    }
    state.current.frame = requestAnimationFrame(step)
    const current = state.current
    return () => cancelAnimationFrame(current.frame)
  }, [level])

  // Plays through the levels once, the first time it is seen, until touched.
  useEffect(() => {
    const section = root.current
    if (!section || matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let timer = 0
    const advance = () => {
      timer = window.setTimeout(() => {
        timer = 0
        const next = shown.current + 1
        if (touched.current || next >= LEVELS.length) return
        setLevel(next)
        if (next < LEVELS.length - 1) advance()
      }, 2600)
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !timer && !touched.current) advance()
      if (!entry.isIntersecting) { clearTimeout(timer); timer = 0 }
    }, { threshold: 0.55 })
    observer.observe(section)
    return () => { observer.disconnect(); clearTimeout(timer) }
  }, [])

  const choose = (next: number) => {
    touched.current = true
    setLevel(Math.max(0, Math.min(LEVELS.length - 1, next)))
  }
  const current = LEVELS[level]

  return (
    <section ref={root} className="scale-zoom" aria-labelledby="scale-zoom-title">
      <div className="scale-zoom-inner mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="scale-zoom-copy">
          <div className="home-heading">
            <span className="home-eyebrow">Scale</span>
            <h2 id="scale-zoom-title" data-split><SplitWords text="How small is small?" /></h2>
          </div>
          <div className="scale-zoom-caption" aria-live="polite">
            <strong key={current.label} className="scale-zoom-size">{current.label}</strong>
            <p key={current.title} className="scale-zoom-title">{current.title}</p>
            <p className="scale-zoom-body">{current.body}</p>
          </div>
          <div className="scale-zoom-controls">
            <button type="button" onClick={() => choose(level - 1)} disabled={level === 0} aria-label="Zoom out">−</button>
            <ol aria-label="Zoom level">
              {LEVELS.map((item, index) => (
                <li key={item.label}>
                  <button type="button" aria-current={index === level ? 'step' : undefined} onClick={() => choose(index)}>{item.label}</button>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => choose(level + 1)} disabled={level === LEVELS.length - 1} aria-label="Zoom in">+</button>
          </div>
        </div>

        <button type="button" className="scale-zoom-stage" onClick={() => choose(level === LEVELS.length - 1 ? 0 : level + 1)} aria-label={level === LEVELS.length - 1 ? 'Zoom back out to 5 millimetres' : `Zoom in to ${LEVELS[level + 1].label}`}>
          <svg viewBox={`0 0 ${VIEW} ${VIEW}`} role="img" aria-label={`Scale illustration at ${current.label}: ${current.title}`}>
            <defs>
              <radialGradient id="scale-zoom-glow" cx="50%" cy="45%" r="70%">
                <stop offset="0" stopColor="#0f3431" />
                <stop offset="1" stopColor="#05090b" />
              </radialGradient>
            </defs>
            <rect width={VIEW} height={VIEW} fill="url(#scale-zoom-glow)" />
            <g ref={camera} transform={`translate(${VIEW / 2} ${VIEW / 2}) scale(${scaleFor(0)}) translate(${-LEVELS[0].centre.x} ${-LEVELS[0].centre.y})`}>
              <polygon className="sz-fragment" points={FRAGMENT} vectorEffect="non-scaling-stroke" />
              <polygon className="sz-hair" points={HAIR_BAND} vectorEffect="non-scaling-stroke" />
              <path className="sz-cuticle" d={CUTICLE} vectorEffect="non-scaling-stroke" />
              <circle className="sz-cell" cx={CELL.x} cy={CELL.y} r={CELL.r} vectorEffect="non-scaling-stroke" />
              <circle className="sz-cell-dimple" cx={CELL.x} cy={CELL.y} r={CELL.r * 0.45} />
              <polygon className="sz-nano" points={NANO_SHAPE} vectorEffect="non-scaling-stroke" />
              {SPECKS.map(([dx, dy, r], index) => <circle key={index} className="sz-speck" cx={NANO.x + dx} cy={NANO.y + dy} r={r} />)}
            </g>
            <g className="sz-reticle" aria-hidden="true">
              <path d="M200 176v-14M200 224v14M176 200h-14M224 200h14" />
              <circle cx="200" cy="200" r="120" />
            </g>
            <g className="sz-scalebar" transform="translate(152 352)" aria-hidden="true">
              <path d="M0 -5v5h96v-5" />
              <text ref={scaleText} x="48" y="-11" textAnchor="middle">{formatLength(96 / scaleFor(0))}</text>
            </g>
            <text className="sz-hint" x="200" y="46" textAnchor="middle" aria-hidden="true">{level === LEVELS.length - 1 ? 'Tap to zoom out' : 'Tap to zoom in'}</text>
          </svg>
        </button>
      </div>
    </section>
  )
}
