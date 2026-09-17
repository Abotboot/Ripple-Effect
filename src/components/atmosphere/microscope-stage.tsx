'use client'

import { useEffect, useRef } from 'react'
import { createMicroscopeScene } from './microscope-scene'

/**
 * Three-dimensional instrument stage for the opening: cast base, turret,
 * optics and a droplet sequence on the slide. Dispose closes WebGL context.
 */
export function MicroscopeStage({
  onComplete,
  onReveal,
  onReady,
}: {
  onComplete: () => void
  onReveal?: (coords: { x: number; y: number }) => void
  onReady: (play: (() => void) | null) => void
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ReturnType<typeof createMicroscopeScene> | null>(null)
  const done = useRef<() => void>(() => {})
  const revealCb = useRef<((coords: { x: number; y: number }) => void) | undefined>(onReveal)

  useEffect(() => {
    done.current = onComplete
    revealCb.current = onReveal
  }, [onComplete, onReveal])

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const supported = (() => {
      try {
        return !!document.createElement('canvas').getContext('webgl2')
      } catch {
        return false
      }
    })()
    if (!supported) {
      done.current()
      return
    }
    const instance = createMicroscopeScene(c, {
      onReveal: (coords) => revealCb.current?.(coords),
    })
    scene.current = instance
    onReady(() => instance.play(done.current))
    return () => {
      onReady(null)
      instance.dispose()
    }
  }, [onReady])
  return <canvas ref={canvas} className="microscope-model" aria-hidden="true" />
}
