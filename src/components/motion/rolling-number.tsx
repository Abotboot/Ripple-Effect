'use client'

import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { reducedMotion } from '@/lib/motion-choice'

// A number whose digits roll into place like an odometer the first time it is
// seen. The look follows NumberFlow (github.com/barvian/number-flow, MIT):
// digit columns spin to their value, the last digit furthest, fading at the
// edges. NumberFlow animates CSS variables, which the browser recalculates on
// the main thread every frame and which slowed scrolling on phones; here each
// column is a strip of digits moved by a plain transform, which the GPU runs
// alone. Before the roll the columns rest on zero; after it, the number is
// plain text again. Reduce Motion shows the number straight away.

const DURATION = 1200
const EASE = 'cubic-bezier(.16, 1, .3, 1)'
const STRIP = Array.from({ length: 30 }, (_, i) => i % 10)

type Phase = 'waiting' | 'rolling' | 'still'

export function RollingNumber({
  value,
  className,
  format,
  locales,
  prefix,
  suffix,
}: {
  value: number
  className?: string
  format?: Intl.NumberFormatOptions
  locales?: Intl.LocalesArgument
  prefix?: string
  suffix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const [phase, setPhase] = useState<Phase>('waiting')
  const text = `${prefix ?? ''}${new Intl.NumberFormat(locales, format).format(value)}${suffix ?? ''}`

  // Roll the first time the number comes into view.
  useEffect(() => {
    const el = ref.current
    if (!el || phase !== 'waiting') return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const calm = reducedMotion() || document.visibilityState !== 'visible'
      setPhase(calm ? 'still' : 'rolling')
    }, { threshold: 0.3 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [phase])

  // Spin each column to its digit; the last digit makes an extra turn.
  useEffect(() => {
    const el = ref.current
    if (!el || phase !== 'rolling') return
    const strips = [...el.querySelectorAll<HTMLElement>('.odo-strip')]
    const runs = strips.map((strip, i) => {
      const row = Number(strip.dataset.row)
      return strip.animate(
        [{ transform: 'translateY(0)' }, { transform: `translateY(${(-row * 100) / STRIP.length}%)` }],
        { duration: DURATION + (strips.length - 1 - i) * 60, easing: EASE, fill: 'forwards' },
      )
    })
    let done = false
    const finish = () => { if (!done) { done = true; setPhase('still') } }
    Promise.all(runs.map(run => run.finished)).then(finish, () => {})
    // A background tab may never finish the animations; settle anyway.
    const fallback = window.setTimeout(finish, DURATION + strips.length * 60 + 500)
    return () => { clearTimeout(fallback); runs.forEach(run => run.cancel()) }
  }, [phase])

  if (phase === 'still') return <span ref={ref} className={className}>{text}</span>

  const digits = text.replace(/\D/g, '').length
  let seen = 0
  return (
    <span ref={ref} className={className}>
      {/* Screen readers get the real value at once, not the roll. */}
      <span className="sr-only">{text}</span>
      <span className="odo" aria-hidden="true">
        {[...text].map((char, i) => {
          if (!/\d/.test(char)) return <span key={i}>{char}</span>
          const last = ++seen === digits
          const row = (last ? 20 : 10) + Number(char)
          return (
            <span key={i} className="odo-digit">
              <span className="odo-hold">{char}</span>
              <span className="odo-strip" data-row={row} style={{ '--rows': STRIP.length } as CSSProperties}>
                {STRIP.map((d, r) => <span key={r}>{d}</span>)}
              </span>
            </span>
          )
        })}
      </span>
    </span>
  )
}
