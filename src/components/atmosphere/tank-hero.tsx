'use client'

import { useEffect, useRef, useState } from 'react'
import { spawnPool, drawParticle, stepParticle } from './specimen-particles'
import { MicroscopeStage } from './microscope-stage'
import { gsap } from 'gsap'
import './tank.css'
import './microscope.css'

export function TankCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1, height = 1, frame = 0, last = 0, visible = true
    let particles = spawnPool(0, 1, 1)
    let scrollY = window.scrollY
    const pointer = { x: -1000, y: -1000, speed: 0 }
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width; height = rect.height
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = spawnPool(width < 700 ? 70 : 180, width, height)
      draw(0)
    }
    const draw = (time: number, delta = 0) => {
      ctx.clearRect(0, 0, width, height)
      ctx.globalCompositeOperation = 'source-over'
      for (const p of particles) {
        if (!reduced.matches) stepParticle(p, { width, height, cx: pointer.x, cy: pointer.y, cursorSpeed: pointer.speed, time, delta })
        drawParticle(ctx, p)
      }
      pointer.speed *= 0.92 ** delta
    }
    const tick = (time: number) => {
      if (visible && !document.hidden && !reduced.matches && time - last >= 16) { draw(time, Math.min((time - last) / 16.667, 2)); last = time }
      frame = requestAnimationFrame(tick)
    }
    const move = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      const x = event.clientX - rect.left, y = event.clientY - rect.top
      pointer.speed = Math.min(80, Math.hypot(x - pointer.x, y - pointer.y))
      pointer.x = x; pointer.y = y
    }
    const scroll = () => {
      const speed = Math.min(30, Math.abs(window.scrollY - scrollY))
      scrollY = window.scrollY
      if (speed > 2 && visible && !reduced.matches) {
        for (const p of particles) p.vy += speed * 0.006 * (0.5 + p.depth)
      }
    }
    const leave = () => { pointer.x = -1000; pointer.y = -1000 }
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const intersection = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting })
    intersection.observe(canvas)
    window.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    window.addEventListener('scroll', scroll, { passive: true })
    resize(); frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame); observer.disconnect(); intersection.disconnect()
      window.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave)
      window.removeEventListener('scroll', scroll)
    }
  }, [])
  return <canvas ref={ref} className="tank-canvas" aria-hidden="true" />
}

export function TankHero({ children }: { children: React.ReactNode }) {
  const [entered, setEntered] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const entryMotion = useRef<gsap.core.Timeline | null>(null)
  const microscope = useRef<(() => void) | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    try {
      if (!new URLSearchParams(window.location.search).has('intro') && (sessionStorage.getItem('ripple-entered') || window.location.hash)) {
        setEntered(true)
        return
      }
    } catch { /* Storage can be disabled. */ }

    const gate = dialog.current
    gate?.showModal()

    const scene = gsap.context(() => {
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      entryMotion.current = gsap.timeline({ defaults: { ease: 'power2.out' } })
        .fromTo('.microscope-viewport', { filter: 'blur(14px)', scale: 1.08 }, { filter: 'blur(0px)', scale: 1, duration: 1.8 }, 0)
        .from('.microscope-copy > *', { opacity: 0, y: 14, duration: 0.6, stagger: 0.1 }, 0.4)
    }, gate!)

    return () => { scene.revert(); gate?.close() }
  }, [])

  const finishEntry = () => {
    dialog.current?.close()
    setEntered(true)
    try { sessionStorage.setItem('ripple-entered', '1') } catch { /* Storage */ }
  }

  const enter = () => {
    if (leaving) return
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finishEntry(); return }
    setLeaving(true)
    entryMotion.current?.kill()
    const gate = dialog.current
    if (!gate) { finishEntry(); return }

    entryMotion.current = gsap.timeline({ onComplete: () => microscope.current?.() })
      .to(gate.querySelectorAll('.microscope-copy, .gate-top'), { opacity: 0, duration: 0.25 }, 0)
      .call(() => { if (!microscope.current) finishEntry() }, [], 0.35)
  }

  const skip = () => {
    microscope.current = () => finishEntry()
    enter()
  }

  return (
    <section className="tank-hero" aria-labelledby="tank-title">
      <TankCanvas />
      <div className="tank-editorial">
        <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
        <h1 id="tank-title">Clear water.<br /><em>Unclear</em><br />consequences.</h1>
        <div className="tank-copy">
          <p>What disappears from sight<br />does not disappear from water.</p>
          <p>Explore microplastics and other contaminants in our rivers, lakes, and streams. Follow the evidence, not the illusion.</p>
        </div>
        <div className="tank-search">{children}</div>
      </div>

      {!entered && (
        <dialog
          ref={dialog}
          className={`tank-gate${leaving ? ' is-leaving' : ''}`}
          onCancel={(e) => { e.preventDefault(); enter() }}
          onWheel={(e) => { if (e.deltaY > 15) enter() }}
          aria-labelledby="gate-title"
        >
          <div className="gate-top">
            <span>RIPPLE EFFECT</span>
          </div>
          <div className="microscope-viewport">
            <MicroscopeStage
              onComplete={finishEntry}
              onReady={(play) => { microscope.current = play }}
            />
          </div>
          <div className="gate-center microscope-copy">
            <p className="tank-eyebrow">LOOK BENEATH THE SURFACE</p>
            <h2 id="gate-title">A closer<br /><em>look changes everything.</em></h2>
            <button type="button" className="gate-enter" onClick={enter}>
              ENTER THE CURRENT <span aria-hidden="true">↗</span>
            </button>
            <button type="button" className="gate-skip" onClick={skip}>
              SKIP INTRO ↗
            </button>
          </div>
        </dialog>
      )}
    </section>
  )
}


