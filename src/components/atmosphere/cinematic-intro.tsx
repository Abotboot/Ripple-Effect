'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { artworkJourney } from '@/lib/artwork-journey'

export type IntroOutcome = 'complete' | 'skip' | 'reduced-motion' | 'error'
type Phase = 'loading' | 'playing' | 'paused' | 'handoff' | 'error'

export function CinematicIntro({ onComplete }: { onComplete: (outcome: IntroOutcome) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const ambientRef = useRef<HTMLCanvasElement>(null)
  const effectEpoch = useRef(0)
  const callback = useRef(onComplete)
  const [phase, setPhase] = useState<Phase>('loading')
  useLayoutEffect(() => { callback.current = onComplete }, [onComplete])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const epoch = ++effectEpoch.current
    let disposed = false
    let completed = false
    let offscreen = false
    let playAttempt = 0
    let pendingPlays = 0
    let frame: number | undefined
    let lastMediaTime = 0
    let lastProgress = performance.now()
    let releaseTimer: number | undefined
    let lastAmbient = -1
    const preference = matchMedia('(prefers-reduced-motion: reduce)')

    const cancelFrame = () => {
      if (frame !== undefined) video.cancelVideoFrameCallback?.(frame)
      frame = undefined
    }
    const stopRetiredPlay = () => {
      if ((disposed || completed) && effectEpoch.current === epoch) video.pause()
    }
    const retireVideo = (pause: boolean) => {
      ++playAttempt
      if (pendingPlays) video.addEventListener('play', stopRetiredPlay)
      cancelFrame()
      if (pause) video.pause()
    }
    const releaseVideoWhenDetached = (attempt = 0) => {
      if (effectEpoch.current !== epoch) return
      if (video.isConnected) {
        if (attempt < 30) releaseTimer = window.setTimeout(() => releaseVideoWhenDetached(attempt + 1), 16)
        return
      }
      video.pause()
      video.removeAttribute('src')
      video.load()
    }
    const finish = (outcome: IntroOutcome) => {
      if (disposed || completed) return
      completed = true
      // Keep the native ended frame painted until React detaches this node. Clearing
      // src/load while connected would reveal opening-v4.png for a frame at handoff.
      retireVideo(outcome !== 'complete')
      setPhase(outcome === 'error' ? 'error' : 'handoff')
      callback.current(outcome)
    }
    const cue = (mediaTime: number) => {
      if (disposed || completed) return
      video.dataset.mediaTime = mediaTime.toFixed(3)
      // One decoder, with a tiny blurred copy extending the same frame to the edges.
      if (video.readyState >= 2 && (mediaTime - lastAmbient >= .08 || video.ended)) {
        const ambient = ambientRef.current
        const context = ambient?.getContext('2d')
        if (ambient && context) { context.drawImage(video, 0, 0, ambient.width, ambient.height); lastAmbient = mediaTime }
      }
      if (mediaTime > lastMediaTime) {
        lastMediaTime = mediaTime
        lastProgress = performance.now()
      }
    }
    const scheduleFrame = () => {
      cancelFrame()
      if (!video.requestVideoFrameCallback || disposed || completed || video.paused) return
      frame = video.requestVideoFrameCallback((_now, metadata) => {
        frame = undefined
        cue(metadata.mediaTime)
        scheduleFrame()
      })
    }
    const shouldSuspend = () => document.hidden || offscreen
    const play = () => {
      if (disposed || completed || shouldSuspend()) return
      const attempt = ++playAttempt
      lastProgress = performance.now()
      setPhase('loading')
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
          if (shouldSuspend()) {
            video.pause()
            return
          }
          setPhase('playing')
          scheduleFrame()
        }).catch(() => {
          if (!disposed && !completed && attempt === playAttempt && !shouldSuspend()) finish('error')
        }).finally(() => {
          if (--pendingPlays === 0) video.removeEventListener('play', stopRetiredPlay)
        })
      } catch {
        if (!disposed && !completed && attempt === playAttempt && !shouldSuspend()) finish('error')
      }
    }
    const suspend = () => {
      ++playAttempt
      cancelFrame()
      video.pause()
      lastProgress = performance.now()
      if (!completed && !disposed) setPhase('paused')
    }
    const visibility = () => { if (shouldSuspend()) suspend(); else play() }
    const reduce = () => { if (preference.matches) finish('reduced-motion') }
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        finish('skip')
      }
    }
    const ended = () => {
      if (!video.ended || !Number.isFinite(video.duration) || video.currentTime < video.duration - 0.1) return
      cue(video.currentTime)
      finish('complete')
    }
    const failed = () => finish('error')
    const playing = () => {
      if (disposed || completed || shouldSuspend()) {
        video.pause()
        return
      }
      setPhase('playing')
      cue(video.currentTime)
      lastProgress = performance.now()
      scheduleFrame()
    }
    const waiting = () => {
      if (!completed && !disposed && !shouldSuspend()) setPhase('loading')
    }
    const timeupdate = () => {
      if (!video.requestVideoFrameCallback) cue(video.currentTime)
    }

    video.addEventListener('ended', ended)
    video.addEventListener('error', failed)
    video.addEventListener('playing', playing)
    video.addEventListener('waiting', waiting)
    video.addEventListener('stalled', waiting)
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

    const watchdog = window.setInterval(() => {
      if (disposed || completed || shouldSuspend()) {
        lastProgress = performance.now()
        return
      }
      if (video.currentTime > lastMediaTime) {
        lastMediaTime = video.currentTime
        lastProgress = performance.now()
      }
      if (performance.now() - lastProgress > 10000) finish('error')
    }, 500)

    if (preference.matches) finish('reduced-motion')
    else {
      video.muted = true
      video.defaultMuted = true
      video.src = artworkJourney.src
      play()
    }

    return () => {
      disposed = true
      completed = true
      if (releaseTimer !== undefined) clearTimeout(releaseTimer)
      clearInterval(watchdog)
      observer.disconnect()
      video.removeEventListener('ended', ended)
      video.removeEventListener('error', failed)
      video.removeEventListener('playing', playing)
      video.removeEventListener('waiting', waiting)
      video.removeEventListener('stalled', waiting)
      video.removeEventListener('timeupdate', timeupdate)
      document.removeEventListener('visibilitychange', visibility)
      document.removeEventListener('keydown', keyboard)
      preference.removeEventListener('change', reduce)
      retireVideo(true)
      releaseVideoWhenDetached()
    }
  }, [])

  return (
    <div className="ripple-intro" data-testid="cinematic-intro" data-state={phase}>
      <canvas ref={ambientRef} width={128} height={72} className="ripple-ambient" aria-hidden="true" />
      <video
        ref={videoRef}
        className="ripple-intro-video"
        data-testid="journey-video"
        muted
        playsInline
        preload="none"
        poster={artworkJourney.poster}
        tabIndex={-1}
        aria-label="Microscope camera journey"
      >
        Your browser cannot play this journey.
      </video>
      <button type="button" className="ripple-entry-skip" onClick={() => callback.current('skip')}>Skip intro</button>
      <span className="sr-only" role="status" aria-live="polite">
        {phase === 'loading' ? 'Loading microscope journey.' : phase === 'paused' ? 'Microscope journey paused while out of view.' : 'Microscope journey playing.'}
      </span>
    </div>
  )
}
