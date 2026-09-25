'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

let activeLenis: Lenis | undefined

/** Jump to the top without smoothing (section changes happen behind a transition). */
export function jumpToTop() {
  if (activeLenis) activeLenis.scrollTo(0, { immediate: true, force: true })
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
}

/** Smoothly scroll to an absolute page offset (instant for reduced motion). */
export function glideTo(top: number) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (activeLenis && !reduced) activeLenis.scrollTo(top, { duration: 1.2 })
  else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function glideToTop() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (activeLenis && !reduced) activeLenis.scrollTo(0, { duration: 1.1 })
  else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

/** Freeze or release smooth scrolling, e.g. while a full-screen menu is open. */
export function setScrollLocked(locked: boolean) {
  if (locked) activeLenis?.stop()
  else activeLenis?.start()
}

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
      activeLenis = undefined

      if (preference.matches) {
        gsap.ticker.sleep()
        return
      }

      gsap.ticker.wake()
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false })
      activeLenis = lenis
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
      activeLenis = undefined
      preference.removeEventListener('change', configure)
    }
  }, [])
  return null
}
