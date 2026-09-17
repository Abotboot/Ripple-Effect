'use client'

import { useEffect, useRef } from 'react'
import { createMicroscopeScene } from './microscope-scene'

/**
 * Three-dimensional instrument stage for the opening: cast base, turret,
 * optics and a droplet sequence on the slide. Dispose closes WebGL context.
 */
export function MicroscopeStage({ onComplete, onReady }: { onComplete: () => void; onReady: (play: (() => void) | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const scene = useRef<ReturnType<typeof createMicroscopeScene> | null>(null)
  const done = useRef<() => void>(() => {})
  useEffect(() => {
    done.current = onComplete
  }, [onComplete, onReady])
  useEffect(() => {
    const c = canvas.current!
    const supported = (() => { try { return !!document.createElement('canvas').getContext('webgl2') } catch { return false } })()
    if (!supported) { done.current(); return }
    const instance = createMicroscopeScene(c)
    scene.current = instance
    onReady(() => instance.play(done.current))
    return () => { onReady(null); instance.dispose() }
  }, [])
  return <canvas ref={canvas} className="microscope-model" aria-hidden="true" />
}
