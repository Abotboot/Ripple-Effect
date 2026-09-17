'use client'

import React, { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import { spawnPool, drawParticle, stepParticle, Particle } from './specimen-particles'

export type ParticleFilter = 'all' | 'fibers' | 'fragments' | 'granules'

export interface TankCanvasHandle {
  triggerImpulse: (nx: number, ny: number, strength?: number) => void
  getCanvasElement: () => HTMLCanvasElement | null
}

interface TankCanvasProps {
  paused?: boolean
  filter?: ParticleFilter
  enabled?: boolean
  className?: string
}

export const TankCanvas = forwardRef<TankCanvasHandle, TankCanvasProps>(function TankCanvas(
  { paused = false, filter = 'all', enabled = true, className = 'tank-canvas' },
  ref
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const impulseRef = useRef<((nx: number, ny: number, strength?: number) => void) | null>(null)
  const syncPropsRef = useRef<((newFilter: ParticleFilter, newPaused: boolean, newEnabled: boolean) => void) | null>(null)

  useImperativeHandle(ref, () => ({
    triggerImpulse: (nx: number, ny: number, strength?: number) => {
      impulseRef.current?.(nx, ny, strength)
    },
    getCanvasElement: () => canvasRef.current,
  }))

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1
    let height = 1
    let raf: number | null = null
    let last = 0
    let disposed = false
    let visible = true
    let particles: Particle[] = []
    let currentFilter: ParticleFilter = filter
    let currentPaused = paused
    let currentEnabled = enabled

    const pointer = { x: -1000, y: -1000, speed: 0 }

    const shouldRun = () =>
      !disposed && visible && currentEnabled && !currentPaused && !document.hidden && !reduced.matches

    const matchesFilter = (p: Particle, f: ParticleFilter): boolean => {
      if (f === 'all') return true
      if (f === 'fibers') return p.kind === 'fiber'
      if (f === 'fragments') return p.kind === 'fragment'
      if (f === 'granules') return p.kind === 'pellet' || p.kind === 'bead'
      return true
    }

    const draw = (time: number, delta = 0) => {
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
      if (typeof window !== 'undefined') {
        const w = window as unknown as { __tankCanvasDrawn?: number }
        w.__tankCanvasDrawn = (w.__tankCanvasDrawn || 0) + 1
      }
      for (const p of particles) {
        if (!reduced.matches && delta > 0) {
          if (typeof window !== 'undefined') {
            const w = window as unknown as { __tankCanvasUpdates?: number }
            w.__tankCanvasUpdates = (w.__tankCanvasUpdates || 0) + 1
          }
          stepParticle(p, {
            width,
            height,
            cx: pointer.x,
            cy: pointer.y,
            cursorSpeed: pointer.speed,
            time,
            delta,
          })
        }
        if (matchesFilter(p, currentFilter)) {
          drawParticle(ctx, p)
        }
      }
      pointer.speed *= 0.92 ** delta
    }

    function stop() {
      if (raf !== null) cancelAnimationFrame(raf)
      raf = null
      last = 0
      canvas?.setAttribute('data-tank-raf', 'idle')
    }

    function tick(time: number) {
      raf = null
      if (!shouldRun()) {
        stop()
        return
      }
      const delta = last ? Math.min((time - last) / 16.667, 2) : 0
      last = time
      draw(time, delta)
      if (shouldRun()) {
        raf = requestAnimationFrame(tick)
        if (typeof window !== 'undefined') {
          const w = window as unknown as { __tankCanvasScheduled?: number }
          w.__tankCanvasScheduled = (w.__tankCanvasScheduled || 0) + 1
        }
        canvas?.setAttribute('data-tank-raf', 'active')
      } else {
        canvas?.setAttribute('data-tank-raf', 'idle')
      }
    }

    function sync() {
      if (!shouldRun()) {
        stop()
        draw(performance.now(), 0) // one static render, no physics progression
        return
      }
      if (raf === null) {
        last = 0
        raf = requestAnimationFrame(tick)
        if (typeof window !== 'undefined') {
          const w = window as unknown as { __tankCanvasScheduled?: number }
          w.__tankCanvasScheduled = (w.__tankCanvasScheduled || 0) + 1
        }
        canvas?.setAttribute('data-tank-raf', 'active')
      }
    }

    // Expose impulse handler
    impulseRef.current = (nx: number, ny: number, strength = 1.4) => {
      const cx = nx * width
      const cy = ny * height
      for (const p of particles) {
        const dx = p.x - cx
        const dy = p.y - cy
        const dist = Math.hypot(dx, dy) + 1
        const force = (strength / Math.max(1, dist * 0.05)) * (1.4 - p.depth * 0.4)
        p.vx += (dx / dist) * force
        p.vy += (dy / dist) * force
        p.agit = Math.min(1, p.agit + 0.8)
      }
      sync()
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = Math.max(1, rect.width)
      height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (particles.length === 0) {
        particles = spawnPool(width < 700 ? 70 : 180, width, height)
      } else {
        // Clamp existing particles to new dimensions without reallocating
        for (const p of particles) {
          if (p.x > width) p.x = Math.random() * width
          if (p.y > height) p.y = Math.random() * height
        }
      }
      draw(performance.now(), 0)
    }

    // Scoped pointer stirring on hero container instead of tracking entire window
    const container = canvas.closest('.tank-hero') || canvas
    const move = (event: PointerEvent | MouseEvent) => {
      const target = event.target as HTMLElement | null
      if (target && target.closest('button, a, input, select, textarea, [role="button"], dialog, .tank-gate')) {
        return
      }
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      pointer.speed = Math.min(80, Math.hypot(x - pointer.x, y - pointer.y))
      pointer.x = x
      pointer.y = y
      if (raf === null && shouldRun()) sync()
    }

    const leave = () => {
      pointer.x = -1000
      pointer.y = -1000
    }

    const pointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null
      if (target && target.closest('button, a, input, select, textarea, [role="button"], dialog, .tank-gate')) {
        return
      }
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left
      const y = event.clientY - rect.top
      for (const p of particles) {
        const dx = p.x - x
        const dy = p.y - y
        const dist = Math.hypot(dx, dy) + 1
        if (dist < 200) {
          const force = (1 - dist / 200) * 2.5
          p.vx += (dx / dist) * force
          p.vy += (dy / dist) * force
          p.agit = 1
        }
      }
      sync()
    }

    const resizeObserver = new ResizeObserver(() => {
      resize()
      sync()
    })
    resizeObserver.observe(canvas)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    intersectionObserver.observe(canvas)

    const handleVisibilityChange = () => {
      sync()
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    const handleReducedMotion = () => {
      sync()
    }
    reduced.addEventListener('change', handleReducedMotion)

    // Listen to custom window reveal event as secondary hook
    const handleRevealEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ nx?: number; ny?: number }>
      if (customEvent.detail && typeof customEvent.detail.nx === 'number') {
        impulseRef.current?.(customEvent.detail.nx, customEvent.detail.ny ?? 0.5)
      }
    }
    window.addEventListener('tank-reveal-impulse', handleRevealEvent)

    container.addEventListener('pointermove', move as EventListener, { passive: true })
    container.addEventListener('pointerleave', leave as EventListener)
    container.addEventListener('pointerdown', pointerDown as EventListener, { passive: true })

    resize()
    sync()

    syncPropsRef.current = (newFilter: ParticleFilter, newPaused: boolean, newEnabled: boolean) => {
      currentFilter = newFilter
      currentPaused = newPaused
      currentEnabled = newEnabled
      sync()
    }

    return () => {
      disposed = true
      stop()
      impulseRef.current = null
      syncPropsRef.current = null
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      reduced.removeEventListener('change', handleReducedMotion)
      window.removeEventListener('tank-reveal-impulse', handleRevealEvent)
      container.removeEventListener('pointermove', move as EventListener)
      container.removeEventListener('pointerleave', leave as EventListener)
      container.removeEventListener('pointerdown', pointerDown as EventListener)
    }
  }, [])

  // Sync prop changes without remounting the canvas or re-initializing the particle pool
  useEffect(() => {
    syncPropsRef.current?.(filter, paused, enabled)
  }, [filter, paused, enabled])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      data-tank-raf="idle"
      aria-hidden="true"
    />
  )
})
