'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedCounterProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
}

export function AnimatedCounter({
  value,
  duration = 1400,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
}: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const elementRef = useRef<HTMLSpanElement>(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = elementRef.current
    if (!el) return

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true

          let startTime: number | null = null
          const startVal = 0
          const endVal = value

          const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp
            const progress = Math.min((timestamp - startTime) / duration, 1)

            // Ease-out expo curve for smooth, premium deceleration
            const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
            const current = startVal + (endVal - startVal) * easeProgress

            setDisplayValue(current)

            if (progress < 1) {
              requestAnimationFrame(step)
            } else {
              setDisplayValue(endVal)
            }
          }

          requestAnimationFrame(step)
        }
      },
      { threshold: 0.15 }
    )

    observer.observe(el)

    return () => {
      observer.disconnect()
    }
  }, [value, duration])

  // If value changes after initial animation, animate smoothly to new value
  useEffect(() => {
    if (hasAnimated.current) {
      let startTime: number | null = null
      const startVal = displayValue
      const endVal = value

      const step = (timestamp: number) => {
        if (!startTime) startTime = timestamp
        const progress = Math.min((timestamp - startTime) / (duration / 2), 1)
        const easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
        setDisplayValue(startVal + (endVal - startVal) * easeProgress)

        if (progress < 1) {
          requestAnimationFrame(step)
        } else {
          setDisplayValue(endVal)
        }
      }

      requestAnimationFrame(step)
    }
  }, [value])

  const formatted = decimals > 0
    ? displayValue.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
    : Math.round(displayValue).toLocaleString()

  return (
    <span
      ref={elementRef}
      className={`inline-block tabular-nums tracking-tight ${className}`}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  )
}
