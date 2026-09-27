'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// A hand-drawn mark (underline, circle, box, highlight) that draws itself the
// first time a phrase is read. Rough Notation (github.com/rough-stuff/
// rough-notation, MIT) does the drawing; it is loaded only when a marked phrase
// comes into view, and marks appear already drawn for Reduce Motion.

type Kind = 'underline' | 'box' | 'circle' | 'highlight' | 'strike-through' | 'crossed-off' | 'bracket'

export function Annotate({
  children,
  type = 'underline',
  color = '#1df2b3',
  strokeWidth = 2,
  padding = 3,
  duration = 900,
  delay = 150,
  rootMargin = '0px',
}: {
  children: ReactNode
  type?: Kind
  color?: string
  strokeWidth?: number
  padding?: number
  duration?: number
  delay?: number
  /** Shrink the trigger area, e.g. '0px 0px -40% 0px' to wait until the phrase is higher up the screen. */
  rootMargin?: string
}) {
  const phrase = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = phrase.current
    if (!el) return
    let mark: { show(): void; remove(): void } | null = null
    let timer = 0
    let gone = false
    const observer = new IntersectionObserver(async ([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      const { annotate } = await import('rough-notation')
      if (gone) return
      const calm = matchMedia('(prefers-reduced-motion: reduce)').matches
      mark = annotate(el, { type, color, strokeWidth, padding, multiline: true, animate: !calm, animationDuration: duration })
      timer = window.setTimeout(() => mark?.show(), calm ? 0 : delay)
    }, { threshold: 0.8, rootMargin })
    observer.observe(el)
    return () => { gone = true; observer.disconnect(); clearTimeout(timer); mark?.remove() }
  }, [type, color, strokeWidth, padding, duration, delay, rootMargin])

  // The drawing is inserted next to the phrase, inside this wrapper, so React
  // never has to reconcile around it.
  return <span className="annotate"><span ref={phrase}>{children}</span></span>
}
