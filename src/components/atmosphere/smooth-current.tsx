'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

export function SmoothCurrent() {
  useEffect(() => {
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    let lenis: Lenis | undefined
    let tickerCb: ((time: number) => void) | undefined

    const configure = () => {
      if (tickerCb) {
        gsap.ticker.remove(tickerCb)
        tickerCb = undefined
      }
      lenis?.destroy()
      lenis = undefined

      if (preference.matches) {
        gsap.ticker.sleep()
        return
      }

      gsap.ticker.wake()
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false })
      lenis.on('scroll', ScrollTrigger.update)
      tickerCb = (time: number) => {
        lenis?.raf(time * 1000)
      }
      gsap.ticker.add(tickerCb)
      gsap.ticker.lagSmoothing(0)
    }

    configure()
    preference.addEventListener('change', configure)

    return () => {
      if (tickerCb) gsap.ticker.remove(tickerCb)
      lenis?.destroy()
      preference.removeEventListener('change', configure)
    }
  }, [])
  return null
}
