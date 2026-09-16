'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function SmoothCurrent() {
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | undefined
    let frame = 0
    const configure = () => {
      cancelAnimationFrame(frame)
      lenis?.destroy(); lenis = undefined
      if (preference.matches) return
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false })
      lenis.on('scroll', ScrollTrigger.update)
      const tick = (time: number) => { lenis?.raf(time); frame = requestAnimationFrame(tick) }
      frame = requestAnimationFrame(tick)
    }
    configure(); preference.addEventListener('change', configure)
    return () => { cancelAnimationFrame(frame); lenis?.destroy(); preference.removeEventListener('change', configure) }
  }, [])
  return null
}
