'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Animated count-up hook. Animates a number from 0 to `end` when the element
 * scrolls into view (or immediately if `startOnView` is false).
 *
 * Uses requestAnimationFrame with an ease-out cubic curve for a smooth,
 * professional feel. Respects prefers-reduced-motion.
 */
export function useCountUp(end: number, opts?: { duration?: number; startOnView?: boolean }) {
  const { duration = 1400, startOnView = true } = opts ?? {}
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLElement | null>(null)
  const startedRef = useRef(false)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    // If end is 0 or NaN, no animation needed.
    if (!end || !Number.isFinite(end)) {
      return
    }

    // Check reduced-motion preference.
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    const startAnimation = () => {
      if (startedRef.current) return
      startedRef.current = true

      // For reduced motion, jump straight to end via a single rAF tick.
      if (prefersReduced) {
        rafRef.current = requestAnimationFrame(() => setValue(end))
        return
      }

      const startTime = performance.now()
      const tick = (now: number) => {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3)
        setValue(Math.round(end * eased))
        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick)
        } else {
          setValue(end)
        }
      }
      rafRef.current = requestAnimationFrame(tick)
    }

    if (!startOnView) {
      startAnimation()
      return
    }

    // IntersectionObserver to trigger on scroll into view.
    const el = ref.current
    if (!el) {
      startAnimation()
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          startAnimation()
          observer.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [end, duration, startOnView])

  return { value, ref }
}

/** Format a number for display with locale-aware grouping. */
export function formatCount(n: number): string {
  return n.toLocaleString()
}
