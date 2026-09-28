'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { reducedMotion } from '@/lib/motion-choice'

// Charts draw themselves in (bars grow, lines trace) when they mount. Mounted
// with the page, that happens off screen and is missed; so the chart mounts
// when it scrolls into view, and draws in where it can be seen. The box keeps
// its height meanwhile. With reduced motion the chart is simply there.

export function ChartReveal({ className, children }: { className?: string; children: (animate: boolean) => ReactNode }) {
  const box = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'waiting' | 'animate' | 'still'>('waiting')

  useEffect(() => {
    const el = box.current
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      observer.disconnect()
      setState(reducedMotion() ? 'still' : 'animate')
    }, { threshold: 0.35 })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={box} className={className}>
      {state !== 'waiting' && children(state === 'animate')}
    </div>
  )
}
