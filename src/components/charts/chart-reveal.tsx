'use client'

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { reducedMotion } from '@/lib/motion-choice'
import './chart-reveal.css'

// Charts draw in where they can be seen, without costing the scroll.
//  - Each chart is built ahead of time while the page is idle, one per idle
//    moment. Building a Recharts chart is a long task (about 200 ms on a slow
//    phone); built as it scrolled into view, it froze the scroll.
//  - Recharts' own draw-in re-renders the whole chart on every frame, so the
//    charts are drawn still (isAnimationActive={false}). A curtain in the
//    card's colour then slides off the finished chart as it comes into view,
//    in the direction the data grows. Only its transform moves, on the GPU.
// With reduced motion, or no solid card colour to match, the chart is simply there.

const builds: Array<() => void> = []
let pumping = false

function pump() {
  const next = builds.shift()
  if (!next) {
    pumping = false
    return
  }
  pumping = true
  const run = () => { next(); pump() }
  if (typeof requestIdleCallback === 'function') requestIdleCallback(run, { timeout: 2500 })
  else window.setTimeout(run, 200)
}

function alphaOf(color: string): number {
  if (color === 'transparent') return 0
  const slash = color.match(/\/\s*([\d.]+)(%?)\s*\)$/)
  if (slash) return Number(slash[1]) / (slash[2] ? 100 : 1)
  const rgba = color.match(/^rgba\([^)]*,\s*([\d.]+)\s*\)$/)
  return rgba ? Number(rgba[1]) : 1
}

/** The solid colour the chart sits on (its card's), or null when it cannot be matched. */
function backdrop(el: HTMLElement): string | null {
  for (let node = el.parentElement; node; node = node.parentElement) {
    const style = getComputedStyle(node)
    if (style.backgroundImage !== 'none') return null
    const alpha = alphaOf(style.backgroundColor)
    if (alpha === 0) continue
    return alpha >= 1 ? style.backgroundColor : null
  }
  return null
}

type Phase = 'waiting' | 'covered' | 'drawing' | 'shown'

export function ChartReveal({ className, axis = 'x', children }: { className?: string; axis?: 'x' | 'y'; children: ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const seen = useRef(false)
  const [phase, setPhase] = useState<Phase>('waiting')
  const [curtain, setCurtain] = useState<string | null>(null)

  useEffect(() => {
    const el = box.current
    if (!el) return
    const build = () => {
      const color = reducedMotion() ? null : backdrop(el)
      setCurtain(color)
      setPhase(!color ? 'shown' : seen.current ? 'drawing' : 'covered')
    }
    builds.push(build)
    if (!pumping) pump()

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      seen.current = true
      // Seen before its turn came: build it now.
      const queued = builds.indexOf(build)
      if (queued >= 0) {
        builds.splice(queued, 1)
        build()
      } else {
        setPhase(current => current === 'covered' ? 'drawing' : current)
      }
    }, { threshold: 0.35 })
    observer.observe(el)
    return () => {
      observer.disconnect()
      const queued = builds.indexOf(build)
      if (queued >= 0) builds.splice(queued, 1)
    }
  }, [])

  return (
    <div ref={box} className={className ? `chart-reveal ${className}` : 'chart-reveal'}>
      {phase !== 'waiting' && children}
      {(phase === 'covered' || phase === 'drawing') && (
        <span
          className="chart-curtain"
          data-axis={axis}
          data-drawing={phase === 'drawing' ? '' : undefined}
          style={{ '--curtain': curtain } as CSSProperties}
          onAnimationEnd={() => setPhase('shown')}
          aria-hidden="true"
        />
      )}
    </div>
  )
}
