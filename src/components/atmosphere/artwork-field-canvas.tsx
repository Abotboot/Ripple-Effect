'use client'

import { useEffect, useLayoutEffect, useRef } from 'react'
import { artworkJourney, type ArtworkCategory, type ArtworkPhase } from '@/lib/artwork-journey'
import { rippleAssets } from '@/lib/ripple-assets'

type Props = {
  phase: ArtworkPhase
  paused: boolean
  reduced: boolean
  category: ArtworkCategory
  onReady: () => void
  onError: () => void
}

/** Owns one visible-only clock. The renderer itself never queues a frame. */
export function ArtworkFieldCanvas(props: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const options = useRef(props)
  const wake = useRef<() => void>(() => {})
  useLayoutEffect(() => { options.current = props; wake.current() }, [props])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const abort = new AbortController()
    let disposed = false
    let visible = false
    let frame: number | null = null
    let previous = 0
    let clock = 0
    let lastDraw = 0
    let draws = 0
    let previousPhase: ArtworkPhase = options.current.phase
    let field: ReturnType<typeof import('@/lib/artwork-field').createArtworkField> | null = null
    let pointer: { x: number; y: number } | null = null
    let impulse: { x: number; y: number; started: number } | null = null
    let down: { x: number; y: number; at: number } | null = null
    const objectURLs = new Set<string>()
    const timeout = window.setTimeout(() => abort.abort(), 12000)

    const stop = () => {
      if (frame !== null) cancelAnimationFrame(frame)
      frame = null
      previous = 0
      canvas.dataset.running = 'false'
    }
    const isRunning = () => !disposed && field && visible && !document.hidden && !options.current.paused && !options.current.reduced && options.current.phase !== 'video'
    const paint = () => {
      if (!field || disposed) return
      const current = options.current
      if (current.phase !== previousPhase) {
        if (current.phase === 'entering' || current.phase === 'video') { clock = 0; impulse = null; pointer = null }
        previousPhase = current.phase
      }
      // The DOM terminal layer owns the dissolve. Keep the field at its final
      // camera framing so the handoff never adds a second zoom or lens crop.
      const entrance = 1
      const strength = impulse ? Math.max(0, 1 - (clock - impulse.started) / 1.5) : 0
      try {
        field.render({ time: current.reduced ? 0 : clock, entrance, category: current.category,
          pointer: current.reduced || current.paused ? null : pointer,
          impulse: impulse && strength > 0 && !current.reduced ? { x: impulse.x, y: impulse.y, strength } : undefined })
      } catch {
        stop(); field.dispose(); field = null
        canvas.dataset.failed = 'true'
        current.onError()
        return
      }
      canvas.dataset.draws = String(++draws)
      canvas.dataset.fieldTime = clock.toFixed(4)
      canvas.dataset.entrance = entrance.toFixed(4)
      canvas.dataset.category = current.category
    }
    const tick = (now: number) => {
      frame = null
      if (!isRunning()) { stop(); return }
      if (previous) clock += Math.min(0.05, Math.max(0, (now - previous) / 1000))
      previous = now
      // Cap drawing at 30fps while preserving an elapsed-time motion clock.
      if (now - lastDraw >= 1000 / 30 - 1) { paint(); lastDraw = now }
      if (isRunning()) frame = requestAnimationFrame(tick)
      canvas.dataset.running = frame === null ? 'false' : 'true'
    }
    const synchronize = () => {
      if (disposed || !field) return
      // A discrete change (filter, resize, pause, phase) gets one frame even
      // while paused. It does not restart the decorative animation loop.
      paint()
      if (isRunning()) { if (frame === null) { previous = 0; frame = requestAnimationFrame(tick); canvas.dataset.running = 'true' } }
      else stop()
    }
    wake.current = synchronize
    const resize = () => {
      if (!field || disposed) return
      const box = canvas.getBoundingClientRect()
      field.resize(Math.max(1, box.width), Math.max(1, box.height), Math.min(window.devicePixelRatio || 1, 1.5))
      synchronize()
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; synchronize() }, { threshold: 0.01 })
    observer.observe(canvas)
    const sizeObserver = new ResizeObserver(resize)
    sizeObserver.observe(canvas)
    document.addEventListener('visibilitychange', synchronize)
    const coordinates = (event: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      return { x: Math.max(0, Math.min(1, (event.clientX - r.left) / r.width)), y: Math.max(0, Math.min(1, (event.clientY - r.top) / r.height)) }
    }
    const canInteract = () => !options.current.reduced && !options.current.paused && ['idle', 'live'].includes(options.current.phase)
    const move = (event: PointerEvent) => { if (canInteract() && event.pointerType !== 'touch') pointer = coordinates(event) }
    const leave = () => { pointer = null; down = null }
    const press = (event: PointerEvent) => { if (canInteract()) down = { x: event.clientX, y: event.clientY, at: performance.now() } }
    const release = (event: PointerEvent) => {
      if (down && canInteract() && performance.now() - down.at < 700 && Math.hypot(event.clientX - down.x, event.clientY - down.y) < 12) {
        impulse = { ...coordinates(event), started: clock }
        canvas.dataset.impulses = String(Number(canvas.dataset.impulses || 0) + 1)
        synchronize()
      }
      down = null
    }
    canvas.addEventListener('pointermove', move, { passive: true })
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('pointerdown', press, { passive: true })
    canvas.addEventListener('pointerup', release, { passive: true })
    canvas.addEventListener('pointercancel', leave)

    const load = async (src: string) => {
      const response = await fetch(src, { signal: abort.signal })
      if (!response.ok) throw new Error('Artwork unavailable')
      const blob = await response.blob()
      if (abort.signal.aborted) throw new Error('Artwork load cancelled')
      const url = URL.createObjectURL(blob)
      objectURLs.add(url)
      const image = new window.Image()
      image.src = url
      try { await image.decode(); return image }
      finally { URL.revokeObjectURL(url); objectURLs.delete(url) }
    }
    Promise.all([import('@/lib/artwork-field'), load(rippleAssets.master.src), load(artworkJourney.terminalPoster)])
      .then(([module, master, boundary]) => {
        if (disposed) return
        clearTimeout(timeout)
        field = module.createArtworkField(canvas, { master, boundary })
        resize()
        if (field) options.current.onReady()
        synchronize()
      }).catch(() => {
        abort.abort()
        if (!disposed) { stop(); canvas.dataset.failed = 'true'; options.current.onError() }
      }).finally(() => { clearTimeout(timeout); for (const url of objectURLs) URL.revokeObjectURL(url); objectURLs.clear() })
    return () => {
      disposed = true
      abort.abort(); clearTimeout(timeout); stop()
      observer.disconnect(); sizeObserver.disconnect()
      document.removeEventListener('visibilitychange', synchronize)
      canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('pointerdown', press); canvas.removeEventListener('pointerup', release); canvas.removeEventListener('pointercancel', leave)
      wake.current = () => {}
      field?.dispose()
      for (const url of objectURLs) URL.revokeObjectURL(url)
    }
  }, [])
  return <canvas ref={canvasRef} className="ripple-artwork-canvas" data-testid="artwork-field" aria-hidden="true" />
}
