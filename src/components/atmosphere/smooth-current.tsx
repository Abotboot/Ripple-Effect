'use client'

import { useEffect } from 'react'
import Lenis from '@studio-freight/lenis'

// Smooth wheel scrolling for mice and trackpads. Touch screens keep native
// scrolling (Lenis never smoothed touch, and its scroll bookkeeping forced a
// layout on every touch scroll event). The frame loop sleeps whenever nothing
// is gliding, so an idle page schedules no frames.

let activeLenis: Lenis | undefined
let wakeLoop: (() => void) | undefined

/** Jump to the top without smoothing (section changes happen behind a transition). */
export function jumpToTop() {
  if (activeLenis) activeLenis.scrollTo(0, { immediate: true, force: true })
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
}

/** Smoothly scroll to an absolute page offset (instant for reduced motion). */
export function glideTo(top: number) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (activeLenis && !reduced) { activeLenis.scrollTo(top, { duration: 1.2 }); wakeLoop?.() }
  else window.scrollTo({ top, behavior: reduced ? 'auto' : 'smooth' })
}

export function glideToTop() {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
  if (activeLenis && !reduced) { activeLenis.scrollTo(0, { duration: 1.1 }); wakeLoop?.() }
  else window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' })
}

/** Freeze or release smooth scrolling, e.g. while a full-screen menu is open. */
export function setScrollLocked(locked: boolean) {
  if (locked) activeLenis?.stop()
  else activeLenis?.start()
}

export function SmoothCurrent() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const touch = matchMedia('(hover: none), (pointer: coarse)')
    let lenis: Lenis | undefined
    let frame = 0
    let quiet = 0

    const loop = (time: number) => {
      lenis?.raf(time)
      // Keep ticking while a glide runs, plus a few frames of grace.
      quiet = lenis?.isScrolling ? 0 : quiet + 1
      frame = lenis && quiet < 12 ? requestAnimationFrame(loop) : 0
    }
    const wake = () => {
      quiet = 0
      if (lenis && !frame) frame = requestAnimationFrame(loop)
    }

    const configure = () => {
      cancelAnimationFrame(frame)
      frame = 0
      lenis?.destroy()
      lenis = activeLenis = wakeLoop = undefined
      if (reduced.matches || touch.matches) return
      lenis = new Lenis({ duration: 1.15, smoothWheel: true, syncTouch: false })
      activeLenis = lenis
      wakeLoop = wake
    }

    configure()
    // Lenis turns each wheel event into a glide; wake the loop to run it.
    window.addEventListener('wheel', wake, { passive: true })
    reduced.addEventListener('change', configure)
    touch.addEventListener('change', configure)

    return () => {
      cancelAnimationFrame(frame)
      lenis?.destroy()
      activeLenis = wakeLoop = undefined
      window.removeEventListener('wheel', wake)
      reduced.removeEventListener('change', configure)
      touch.removeEventListener('change', configure)
    }
  }, [])
  return null
}
