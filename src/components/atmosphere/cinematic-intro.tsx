'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { artworkJourney } from '@/lib/artwork-journey'

export type IntroOutcome = 'complete' | 'skip' | 'reduced-motion' | 'error'
type Phase = 'loading' | 'playing' | 'paused' | 'handoff' | 'error'

export function CinematicIntro({ onComplete, onReveal }: { onComplete: (outcome: IntroOutcome) => void; onReveal: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const skipRef = useRef<HTMLButtonElement>(null)
  const finishRef = useRef<(outcome: IntroOutcome) => void>(() => {})
  const pauseRef = useRef<() => void>(() => {})
  const effectEpoch = useRef(0)
  const callbacks = useRef({ onComplete, onReveal })
  useLayoutEffect(() => { callbacks.current = { onComplete, onReveal } }, [onComplete, onReveal])
  const [phase, setPhase] = useState<Phase>('loading')
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const epoch = ++effectEpoch.current
    let disposed = false
    let completed = false
    let revealed = false
    let manualPause = false
    let offscreen = false
    let playAttempt = 0
    let pendingPlays = 0
    let frame: number | undefined
    let lastTime = 0
    let lastProgress = performance.now()
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const cancelFrame = () => {
      if (frame !== undefined) video.cancelVideoFrameCallback?.(frame)
      frame = undefined
    }
    // A delayed play implementation can unpause an already detached element
    // before its promise settles. Retain only this guard while that work exists.
    const stopRetiredPlay = () => {
      if ((disposed || completed) && effectEpoch.current === epoch) video.pause()
    }
    const releaseVideo = () => {
      ++playAttempt
      if (pendingPlays) video.addEventListener('play', stopRetiredPlay)
      cancelFrame(); video.pause(); video.removeAttribute('src'); video.load()
    }
    const finish = (outcome: IntroOutcome) => {
      if (disposed || completed) return
      completed = true
      releaseVideo()
      setPhase(outcome === 'error' ? 'error' : 'handoff')
      callbacks.current.onComplete(outcome)
    }
    finishRef.current = finish
    const cue = (mediaTime: number) => {
      if (disposed || completed) return
      video.dataset.mediaTime = mediaTime.toFixed(3)
      if (mediaTime > lastTime) { lastTime = mediaTime; lastProgress = performance.now() }
      if (!revealed && mediaTime >= artworkJourney.textRevealAtSeconds) { revealed = true; callbacks.current.onReveal() }
    }
    const scheduleFrame = () => {
      cancelFrame()
      if (!video.requestVideoFrameCallback || disposed || completed || video.paused) return
      frame = video.requestVideoFrameCallback((_now, metadata) => { frame = undefined; cue(metadata.mediaTime); scheduleFrame() })
    }
    const shouldSuspend = () => manualPause || document.hidden || offscreen
    const play = () => {
      if (disposed || completed || shouldSuspend()) return
      const attempt = ++playAttempt
      lastProgress = performance.now()
      setPhase('loading')
      // A superseded rejection must not end a resumed journey. Strict Mode can
      // also reuse this element: an old effect must not pause its new owner.
      try {
        const promise = video.play()
        if (!promise) return
        ++pendingPlays
        promise.then(() => {
          if (disposed || completed) {
            if (effectEpoch.current === epoch) video.pause()
            return
          }
          if (attempt !== playAttempt) return
          if (shouldSuspend()) { video.pause(); return }
          setPhase('playing')
          scheduleFrame()
        }).catch(() => { if (!disposed && !completed && attempt === playAttempt && !shouldSuspend()) finish('error') }).finally(() => {
          if (--pendingPlays === 0) video.removeEventListener('play', stopRetiredPlay)
        })
      } catch { if (!disposed && !completed && attempt === playAttempt && !shouldSuspend()) finish('error') }
    }
    const suspend = () => { ++playAttempt; cancelFrame(); video.pause(); lastProgress = performance.now(); if (!completed && !disposed) setPhase('paused') }
    pauseRef.current = () => {
      if (completed || disposed) return
      manualPause = !manualPause
      setPaused(manualPause)
      if (shouldSuspend()) suspend(); else play()
    }
    const visibility = () => { if (shouldSuspend()) suspend(); else play() }
    const reduce = () => { if (preference.matches) finish('reduced-motion') }
    const keyboard = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.preventDefault(); finish('skip') } }
    const ended = () => { cue(video.currentTime); finish('complete') }
    const failed = () => finish('error')
    const playing = () => {
      if (disposed || completed || shouldSuspend()) { video.pause(); return }
      setPhase('playing'); lastProgress = performance.now(); scheduleFrame()
    }
    const waiting = () => { if (!completed && !disposed && !shouldSuspend()) setPhase('loading') }
    // Less precise media-clock fallback; never presented-frame sync.
    const timeupdate = () => { if (!video.requestVideoFrameCallback) cue(video.currentTime) }
    video.addEventListener('ended', ended)
    video.addEventListener('error', failed)
    video.addEventListener('playing', playing)
    video.addEventListener('waiting', waiting)
    video.addEventListener('timeupdate', timeupdate)
    document.addEventListener('visibilitychange', visibility)
    document.addEventListener('keydown', keyboard)
    preference.addEventListener('change', reduce)
    const observer = new IntersectionObserver(([entry]) => {
      if (disposed || completed) return
      const next = !entry.isIntersecting
      if (offscreen === next) return
      offscreen = next
      visibility()
    }, { threshold: 0.01 })
    observer.observe(video)
    // Only visible, unpaused lack of progress counts toward recovery.
    const watchdog = window.setInterval(() => {
      if (disposed || completed || shouldSuspend()) { lastProgress = performance.now(); return }
      if (video.currentTime > lastTime) { lastTime = video.currentTime; lastProgress = performance.now() }
      if (performance.now() - lastProgress > 10000) finish('error')
    }, 500)
    skipRef.current?.focus({ preventScroll: true })
    if (preference.matches) finish('reduced-motion')
    else { video.src = artworkJourney.src; play() }
    return () => {
      disposed = true; completed = true
      clearInterval(watchdog); observer.disconnect()
      video.removeEventListener('ended', ended)
      video.removeEventListener('error', failed)
      video.removeEventListener('playing', playing)
      video.removeEventListener('waiting', waiting)
      video.removeEventListener('timeupdate', timeupdate)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('keydown', keyboard)
      preference.removeEventListener('change', reduce)
      releaseVideo()
      finishRef.current = () => {}; pauseRef.current = () => {}
    }
  }, [])
  const skip = useCallback(() => finishRef.current('skip'), [])
  return (
    <div className="ripple-intro" data-testid="cinematic-intro" data-state={phase}>
      <video ref={videoRef} className="ripple-intro-video" data-testid="journey-video" muted playsInline preload="none" poster={artworkJourney.poster} aria-label="Microscope camera journey">Your browser cannot play this journey. Use Skip intro to explore the water search.</video>
      <div className="ripple-player-controls" role="group" aria-label="Journey controls">
        <button type="button" ref={skipRef} className="ripple-motion-button" data-testid="journey-skip" onClick={skip}>Skip intro</button>
        <button type="button" className="ripple-motion-button" data-testid="journey-pause" onClick={() => pauseRef.current()} aria-pressed={paused}>{paused ? 'Resume journey' : 'Pause journey'}</button>
        <span className="ripple-player-status" role="status">{phase === 'loading' ? 'Loading microscope…' : phase === 'paused' ? 'Journey paused' : 'Through the microscope'}</span>
      </div>
    </div>
  )
}
