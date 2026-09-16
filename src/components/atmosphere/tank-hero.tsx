'use client'

import { useEffect, useRef, useState } from 'react'
import { spawnPool, drawParticle, stepParticle } from './specimen-particles'
import { createHydrophone } from './audio-engine'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './tank.css'

export function TankCanvas() {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current!
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    let width = 1, height = 1, frame = 0, last = 0, visible = true
    let particles = spawnPool(0, 1, 1)
    const rings: { x: number; y: number; radius: number; life: number }[] = []
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
      ctx.globalCompositeOperation = 'lighter'
      for (const p of particles) {
        if (!reduced.matches) stepParticle(p, { width, height, cx: pointer.x, cy: pointer.y, cursorSpeed: pointer.speed, time, delta })
        drawParticle(ctx, p)
      }
      for (let i = rings.length - 1; i >= 0; i--) {
        const ring = rings[i]
        ring.radius += 3 * delta; ring.life -= 0.018 * delta
        if (ring.life <= 0) { rings.splice(i, 1); continue }
        ctx.strokeStyle = `rgba(100,240,209,${ring.life * 0.16})`
        ctx.lineWidth = 1
        ctx.beginPath(); ctx.ellipse(ring.x, ring.y, ring.radius, ring.radius * 0.72, 0, 0, Math.PI * 2); ctx.stroke()
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
      if (pointer.speed > 10 && rings.length < 6 && !reduced.matches) rings.push({ x, y, radius: 8, life: 1 })
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
  const [purity, setPurity] = useState(99.4)
  const [leaving, setLeaving] = useState(false)
  const [sound, setSound] = useState(false)
  const [audioError, setAudioError] = useState('')
  const audio = useRef<ReturnType<typeof createHydrophone> | null>(null)
  const exitTimer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => {
    if (!entered) return
    // Entry restores the scrollbar; discard pin widths measured behind the gate.
    const frame = requestAnimationFrame(() => ScrollTrigger.refresh())
    return () => cancelAnimationFrame(frame)
  }, [entered])
  useEffect(() => {
    audio.current = createHydrophone()
    const visibility = () => audio.current?.visibility(document.hidden)
    document.addEventListener('visibilitychange', visibility)
    return () => { audio.current?.dispose(); clearTimeout(exitTimer.current); document.removeEventListener('visibilitychange', visibility) }
  }, [])
  const toggleSound = async () => {
    try { setSound(await audio.current!.toggle()) }
    catch { setAudioError('Audio unavailable. Continue silently.') }
  }
  const dialog = useRef<HTMLDialogElement>(null)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    // Hydrate a browser-only session preference after the server-rendered shell.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    try { if (sessionStorage.getItem('ripple-entered') || window.location.hash) { setEntered(true); return } } catch { /* Storage can be disabled. */ }
    const gate = dialog.current
    gate?.showModal()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { setPurity(14.8); return () => gate?.close() }
    const start = performance.now()
    const timer = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - start) / 2200)
      setPurity(99.4 - progress * 84.6)
      if (progress === 1) clearInterval(timer)
    }, 60)
    return () => { clearInterval(timer); gate?.close() }
  }, [])
  const finishEntry = () => {
    dialog.current?.close(); setEntered(true)
    try { sessionStorage.setItem('ripple-entered', '1') } catch { /* Optional preference. */ }
    title.current?.focus({ preventScroll: true })
  }
  const enter = () => {
    if (leaving) return
    audio.current?.knock()
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { finishEntry(); return }
    setLeaving(true)
    exitTimer.current = setTimeout(finishEntry, 550)
  }
  const soundControl = <button type="button" aria-pressed={sound} onClick={toggleSound}>SOUND {sound ? 'ON' : 'OFF'}</button>
  return <section className="tank-hero" aria-labelledby="tank-title">
    <TankCanvas />
    <div className="tank-sound">{soundControl}<span role="status">{audioError}</span></div>
    <div className="tank-orbit" aria-hidden="true"><span /><span /><span /></div>
    <div className="tank-topline"><span>FIELD NOTES / 001</span><span>FRESHWATER. UNDER EXAMINATION.</span></div>
    <div className="tank-editorial">
      <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
      <h1 ref={title} tabIndex={-1} id="tank-title">Clear water.<br /><em>Unclear</em><br />consequences.</h1>
      <div className="tank-copy"><span className="tank-cross" aria-hidden="true">+</span><p>What disappears from sight<br />does not disappear from water.</p><p>Explore microplastics and other contaminants in our rivers, lakes, and streams. Follow the evidence, not the illusion.</p></div>
      <div className="tank-search">{children}</div>
    </div>
    <div className="tank-bottomline"><span>MOVE THROUGH THE CURRENT</span><span>PARTICLE FIELD: ARTISTIC SIMULATION / NOT SAMPLE DATA</span><span aria-hidden="true">↓</span></div>
    {!entered && <dialog ref={dialog} className={`tank-gate${leaving ? " is-leaving" : ""}`} data-lenis-prevent onCancel={(event) => { event.preventDefault(); enter() }} aria-labelledby="gate-title" aria-describedby="gate-note">
      <div className="gate-top"><span>RIPPLE EFFECT</span><button onClick={enter}>SKIP INTRO ↗</button></div>
      <div className="gate-center"><p className="tank-eyebrow">THE HUMAN AQUASTRUCTURE</p><h2 id="gate-title">Nothing is<br /><em>as clear as it seems.</em></h2><div className="gate-meter" aria-hidden="true"><span>PURITY</span><strong>{purity.toFixed(1)}<small>%</small></strong><div><i style={{ transform: `scaleX(${purity / 100})` }} /></div></div><p id="gate-note">A theatrical purity meter. Not a water-quality measurement.</p><button className="gate-enter" onClick={enter}>ENTER THE CURRENT <span aria-hidden="true">↗</span></button><p className="gate-knock">KNOCK ON THE GLASS. LOOK CLOSER.</p></div>
      <div className="gate-bottom"><span>AN INDEPENDENT WATER INITIATIVE</span><span>{soundControl}<span role="status">{audioError}</span></span></div>
    </dialog>}
  </section>
}
