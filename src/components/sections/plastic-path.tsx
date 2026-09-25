'use client'

import { useEffect, useRef, type CSSProperties } from 'react'
import { SplitWords } from '@/components/motion/split-words'
import './plastic-path.css'

// How plastic reaches drinking water, as a river that meanders through five
// stations. Tiny particles and fibers ride the current (SVG animateMotion);
// some are caught at treatment and sink into the filter bed. The river draws
// itself in the first time it is seen, and all motion pauses off screen.

const W = 1200
const H = 340
const STATIONS = [
  { x: 120, y: 150, title: 'Everyday plastic', body: 'Bottles, bags, tires and synthetic clothes wear down into fragments and fibers.' },
  { x: 380, y: 205, title: 'Rain and rivers', body: 'Rain, runoff and treated wastewater carry them into rivers and lakes.' },
  { x: 640, y: 145, title: 'Treatment', body: 'Water treatment removes much of it, but not all.' },
  { x: 900, y: 205, title: 'Tap and bottle', body: 'Some reaches tap water. Bottled water can also pick some up from its own packaging.' },
  { x: 1110, y: 150, title: 'On the map', body: 'So readings go on the map, on the water where they were collected.' },
] as const

// A smooth curve through points (Catmull-Rom converted to cubic Béziers).
function smoothPath(points: ReadonlyArray<{ x: number; y: number }>) {
  let d = `M${points[0].x} ${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i], p1 = points[i], p2 = points[i + 1], p3 = points[i + 2] ?? p2
    const c1 = { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 }
    const c2 = { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 }
    d += ` C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${p2.x} ${p2.y}`
  }
  return d
}

const START = { x: 20, y: 120 }
const END = { x: 1190, y: 175 }
const RIVER = smoothPath([START, ...STATIONS, END])
// Caught particles follow the river to treatment, then sink into the filter bed.
const CAUGHT = `${smoothPath([START, ...STATIONS.slice(0, 3)])} C${STATIONS[2].x + 6} ${STATIONS[2].y + 60} ${STATIONS[2].x - 4} ${STATIONS[2].y + 110} ${STATIONS[2].x} ${H - 40}`

// Riders: dots and short fibers in plastic colours, spread along the loop.
const RIDERS = Array.from({ length: 18 }, (_, i) => ({
  caught: i % 3 === 1,
  fiber: i % 4 === 0,
  colour: ['#1df2b3', '#8fd3ff', '#f1e7c9', '#ff9aa8', '#b7f5dc', '#f6b73c'][i % 6],
  size: 2.4 + (i * 7 % 5) * 0.5,
  duration: 11 + (i * 5 % 7),
  delay: -(i * 1.37) % 11,
  lift: ((i * 11) % 9) - 4,
}))

const ICONS = [
  // Bottle with a shed fiber.
  'M-6 -18h12v5l4 5v22a3 3 0 0 1-3 3h-14a3 3 0 0 1-3-3v-22l4-5z M-10 0h20 M12 14c4-2 6 2 10 0',
  // Cloud and rain.
  'M-13 3a8 8 0 0 1 2-15a11 11 0 0 1 20 3a7 7 0 0 1-1 12z M-8 9l-3 7 M0 9l-3 7 M8 9l-3 7',
  // Filter funnel with mesh.
  'M-16-15h32l-11 14v13l-10 5v-18z M-10-9h20 M-7-4h14',
  // Tap and a falling drop.
  'M-16-9h15a7 7 0 0 1 7 7v4h-7v-2h-15z M-9-9v-5h8v5 M6 9c-3 4-3 7 0 7s3-3 0-7z',
  // Map pin.
  'M0-18a10 10 0 0 1 10 10c0 8-10 19-10 19s-10-11-10-19a10 10 0 0 1 10-10z M0-12a4 4 0 1 1 0 8a4 4 0 1 1 0-8z',
]

export function PlasticPath() {
  const root = useRef<HTMLElement>(null)
  const svg = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const section = root.current, drawing = svg.current
    if (!section || !drawing) return
    // The particles keep flowing with Reduce Motion (they are tiny); the
    // spinning rings and the scroll pan are what the CSS switches off.
    drawing.pauseAnimations()
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { section.dataset.seen = ''; drawing.unpauseAnimations() }
      else drawing.pauseAnimations()
    }, { threshold: 0.2 })
    observer.observe(section)
    return () => observer.disconnect()
  }, [])

  return (
    <section ref={root} className="plastic-path" aria-labelledby="plastic-path-title" data-loop>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="home-heading">
          <span className="home-eyebrow">The path</span>
          <h2 id="plastic-path-title" data-split><SplitWords text="How plastic reaches your water" /></h2>
        </div>

        <div className="plastic-path-scroll" tabIndex={-1}>
          <svg ref={svg} className="plastic-path-drawing" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="A river carrying plastic particles past five stations: everyday plastic, rain and rivers, treatment, where some particles are caught, tap and bottle, and the map.">
            <defs>
              <path id="pp-river" d={RIVER} />
              <path id="pp-caught" d={CAUGHT} />
              <linearGradient id="pp-water" x1="0" x2="1">
                <stop offset="0" stopColor="#0f3431" />
                <stop offset=".55" stopColor="#12403a" />
                <stop offset="1" stopColor="#0f3431" />
              </linearGradient>
            </defs>

            {/* Filter bed under the treatment station. */}
            <g className="pp-bed" transform={`translate(${STATIONS[2].x} ${H - 30})`}>
              <path d="M-70 0h140 M-58 -10h116 M-44 -20h88" />
            </g>

            <path className="pp-banks" d={RIVER} />
            <path className="pp-water" d={RIVER} stroke="url(#pp-water)" />
            <path className="pp-current" d={RIVER} pathLength={1} />
            <path className="pp-flow" d={RIVER} />

            {RIDERS.map((rider, index) => (
              <g key={index} className={rider.caught ? 'pp-rider pp-rider--caught' : 'pp-rider'}>
                {rider.fiber
                  ? <path d={`M${-rider.size * 2.2} ${rider.lift} q${rider.size * 1.1} ${-rider.size} ${rider.size * 2.2} 0 t${rider.size * 2.2} 0`} stroke={rider.colour} />
                  : <circle cy={rider.lift} r={rider.size} fill={rider.colour} />}
                <animateMotion dur={`${rider.duration}s`} begin={`${rider.delay}s`} repeatCount="indefinite" rotate="auto" calcMode="linear">
                  {/* Both spellings: older Safari only follows xlink:href on <mpath>. */}
                  <mpath href={rider.caught ? '#pp-caught' : '#pp-river'} xlinkHref={rider.caught ? '#pp-caught' : '#pp-river'} />
                </animateMotion>
                {/* Fade in at the source and out at the end, so the loop never pops. */}
                <animate attributeName="opacity" values="0;1;1;0" keyTimes="0;0.05;0.92;1" dur={`${rider.duration}s`} begin={`${rider.delay}s`} repeatCount="indefinite" />
              </g>
            ))}

            {STATIONS.map((station, index) => (
              <g key={station.title} className="pp-station" transform={`translate(${station.x} ${station.y})`} style={{ '--i': index } as CSSProperties}>
                <circle className="pp-station-ring" r="44" />
                <circle className="pp-station-disc" r="34" />
                <path className="pp-icon" d={ICONS[index]} />
                <text className="pp-station-number" y={index % 2 ? 70 : -52} textAnchor="middle">{String(index + 1).padStart(2, '0')}</text>
              </g>
            ))}

            {/* Rain over the river, and ripples round the pin. */}
            <g className="pp-rain" transform={`translate(${STATIONS[1].x} ${STATIONS[1].y - 70})`}>
              {[-18, -6, 6, 18].map((x, i) => <path key={x} d={`M${x} 0l-3 8`} style={{ '--d': `${i * 0.3}s` } as CSSProperties} />)}
            </g>
            <g className="pp-ripples" transform={`translate(${STATIONS[4].x} ${STATIONS[4].y})`}>
              <circle r="34" /><circle r="34" />
            </g>
          </svg>
        </div>

        <p className="plastic-path-hint" aria-hidden="true">Swipe to follow the river →</p>

        <ol className="plastic-path-steps">
          {STATIONS.map((station, index) => (
            <li key={station.title} data-reveal style={{ '--reveal-delay': `${index * 90}ms` } as CSSProperties}>
              <span>{String(index + 1).padStart(2, '0')}</span>
              <strong>{station.title}</strong>
              <p>{station.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
