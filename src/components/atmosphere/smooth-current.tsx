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
    const startIntro = () => { lenis?.scrollTo(0, { immediate: true, force: true }); lenis?.stop() }
    const endIntro = () => { lenis?.start(); lenis?.scrollTo(0, { immediate: true, force: true }) }
    window.addEventListener('ripple-cinematic-start', startIntro)
    window.addEventListener('ripple-cinematic-end', endIntro)
    if (document.body.classList.contains('ripple-cinematic-active')) startIntro()
    preference.addEventListener('change', configure)

    return () => {
      window.removeEventListener('ripple-cinematic-start', startIntro)
      window.removeEventListener('ripple-cinematic-end', endIntro)
      if (tickerCb) gsap.ticker.remove(tickerCb)
      lenis?.destroy()
      preference.removeEventListener('change', configure)
    }
  }, [])
  return null
}
