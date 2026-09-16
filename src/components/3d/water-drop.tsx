'use client'

/**
 * Client wrapper for the WebGL water drop.
 *
 * Contract:
 *  - Server and first client render show a static SVG poster (zero 3D cost).
 *  - The three.js chunk is only downloaded on capable desktops (fine pointer,
 *    wide viewport, no reduced-motion / data-saver preference), after idle,
 *    and only when the poster is actually on screen.
 *  - Any failure (no WebGL, failed chunk, context loss) falls back to the
 *    poster permanently - the page never breaks.
 */

import { useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { cn } from '@/lib/utils'

const Scene = dynamic(() => import('@/components/3d/water-drop-scene'), {
  ssr: false,
  loading: () => null,
})

function DropletPoster() {
  return (
    <div className="relative flex h-full w-full items-center justify-center" aria-hidden="true">
      <div className="absolute h-56 w-56 rounded-full bg-primary/20 blur-3xl sm:h-72 sm:w-72" />
      <svg viewBox="0 0 200 240" className="relative h-full max-h-[420px] w-auto drop-shadow-[0_20px_60px_rgba(0,180,210,0.25)]">
        <defs>
          <radialGradient id="wd-body" cx="38%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#d9f6fb" />
            <stop offset="45%" stopColor="#8fdcee" />
            <stop offset="100%" stopColor="#1e9ab5" />
          </radialGradient>
          <radialGradient id="wd-shine" cx="35%" cy="25%" r="30%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path
          d="M100 12 C118 60, 172 108, 172 152 A72 72 0 1 1 28 152 C28 108, 82 60, 100 12 Z"
          fill="url(#wd-body)"
        />
        <ellipse cx="72" cy="80" rx="26" ry="36" fill="url(#wd-shine)" transform="rotate(-24 72 80)" />
        <g fill="#0e7490" opacity="0.55">
          <path d="M92 128 l10 -6 8 7 -4 10 -11 1 Z" />
          <path d="M118 160 l7 -4 5 5 -3 7 -8 1 Z" />
          <path d="M74 168 l6 -3 5 4 -3 6 -7 1 Z" />
        </g>
      </svg>
    </div>
  )
}

function eligibleForScene(): boolean {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (window.matchMedia('(max-width: 767px)').matches) return false
  if (window.matchMedia('(pointer: coarse)').matches) return false
  if (typeof navigator !== 'undefined' && 'saveData' in navigator && (navigator as { saveData?: boolean }).saveData) return false
  try {
    const canvas = document.createElement('canvas')
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'))
  } catch {
    return false
  }
}

export function WaterDrop3D({ className }: { className?: string }) {
  const [go, setGo] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [sceneOk, setSceneOk] = useState(false)
  const [failed, setFailed] = useState(false)
  const [revealed, setRevealed] = useState(false)
  const [onScreen, setOnScreen] = useState(false)
  const hostRef = useRef<HTMLDivElement>(null)

  // Decide eligibility after paint, then wait for idle before pulling the chunk.
  useEffect(() => {
    if (!eligibleForScene()) return
    setMounted(true)
    let idleTimer: ReturnType<typeof setTimeout> | undefined
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number }
    if (w.requestIdleCallback) {
      w.requestIdleCallback(() => setGo(true), { timeout: 2000 })
    } else {
      idleTimer = setTimeout(() => setGo(true), 800)
    }
    return () => {
      if (idleTimer !== undefined) clearTimeout(idleTimer)
    }
  }, [])

  // Only mount the scene once the poster has scrolled into view.
  useEffect(() => {
    if (!go) return
    const el = hostRef.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setOnScreen(true)
      },
      { rootMargin: '200px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [go])

  const showScene = mounted && go && onScreen && !failed

  return (
    <div ref={hostRef} className={className}>
      {/* The poster is the permanent base layer; the live scene fades in over
          it once WebGL has rendered its first frame, so there is no pop. */}
      <div
        className={cn(
          'absolute inset-0 transition-opacity duration-700',
          sceneOk ? 'opacity-0' : 'opacity-100'
        )}
        aria-hidden={sceneOk || undefined}
      >
        <DropletPoster />
      </div>
      {showScene && (
        <div
          className={cn(
            'absolute inset-0 transition-opacity duration-700',
            sceneOk ? 'opacity-100' : 'opacity-0'
          )}
        >
          <Scene
            revealed={revealed}
            onReady={() => setSceneOk(true)}
            onFail={() => setFailed(true)}
          />
        </div>
      )}

      {/* Controls: plain HTML buttons, keyboard reachable. */}
      {showScene && sceneOk && (
        <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap">
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            className="shrink-0 rounded-full border border-border/70 bg-card/90 px-3 py-1 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:text-foreground"
            aria-pressed={revealed}
          >
            {revealed ? 'Hide particles' : 'Reveal particles'}
          </button>
        </div>
      )}
    </div>
  )
}
