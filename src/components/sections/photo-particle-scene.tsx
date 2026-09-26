'use client'

import Image from 'next/image'
import { memo, useEffect, useRef, useState, type CSSProperties } from 'react'
import styles from './photo-particle-scene.module.css'

type Form = 'fibers' | 'fragments' | 'granules'
const particles = [
  { id: 'fibers', file: 'fiber', alt: 'fiber with dark surface deposits', x: 13, y: 9, size: 36, angle: -25 },
  { id: 'fragments', file: 'fragment', alt: 'green plastic fragment', x: 61, y: 35, size: 35, angle: 14 },
  { id: 'granules', file: 'pellet', alt: 'white plastic pellet', x: 12, y: 59, size: 32, angle: -20 },
  { id: 'granules', file: 'cream', alt: 'pale rounded particle', x: 69, y: 5, size: 18, angle: 16 },
  { id: 'fragments', file: 'ring', alt: 'dark ring-shaped particle', x: 4, y: 38, size: 17, angle: 8 },
  { id: 'fragments', file: 'turquoise', alt: 'textured turquoise fragment', x: 41, y: 60, size: 23, angle: -25 },
  { id: 'fragments', file: 'clear', alt: 'translucent angular flake', x: 44, y: 8, size: 18, angle: 18 },
  { id: 'fragments', file: 'foam', alt: 'white irregular fragment', x: 39, y: 33, size: 15, angle: 15 },
  { id: 'fragments', file: 'black', alt: 'black textured fragment', x: 64, y: 81, size: 19, angle: -30 },
  { id: 'fragments', file: 'grey', alt: 'grey flake', x: 81, y: 23, size: 13, angle: 0 },
  { id: 'fragments', file: 'chip', alt: 'small turquoise chip', x: 29, y: 86, size: 13, angle: 25 },
] as const

// Stable placement avoids hydration changes. Repeated sprites are decorative,
// with density and relative scale chosen for composition, never sample counts.
const scatter = Array.from({ length: 160 }, (_, index) => {
  const seed = (salt: number) => {
    let value = Math.imul(index + 1, salt)
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
    value = Math.imul(value ^ (value >>> 16), 0x45d9f3b)
    return ((value ^ (value >>> 16)) >>> 0) / 4294967296
  }
  const source = particles[index % particles.length]
  return { ...source, x: 3 + seed(619) * 89, y: 3 + seed(383) * 89,
    size: 2.4 + seed(139) * 4.4, angle: seed(773) * 360,
    opacity: .3 + seed(251) * .65, blur: index % 4 === 0 ? 1.1 : 0 }
})

// Memoized: the hero re-renders as the search box is typed in, and 160
// sprites should not re-render with it.
export const PhotoParticleScene = memo(function PhotoParticleScene({ subject = 'all', selected = 'all', paused = false, allowReducedMotion = false, onSelect, hero = false }: {
  subject?: Form | 'all'; selected?: Form | 'all'; paused?: boolean; allowReducedMotion?: boolean; onSelect?: (form: Form) => void; hero?: boolean
}) {
  const root = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    let intersects = false
    const update = () => setVisible(intersects && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; update() })
    if (root.current) observer.observe(root.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  useEffect(() => {
    const scene = root.current
    const surface = hero ? scene?.closest<HTMLElement>('.ripple-hero') : scene?.closest<HTMLElement>('[role="tab"]') ?? scene
    if (!scene || !surface) return
    const preference = matchMedia('(prefers-reduced-motion: reduce)')
    const enabled = () => !paused && visible && (!preference.matches || allowReducedMotion)
    const nodes = Array.from(scene.querySelectorAll<HTMLElement>('[data-particle]'))
    const count = nodes.length

    // A small spring-and-collision simulation in scene pixels. Each particle is
    // tethered to where it was placed; the pointer shoves it with momentum, it
    // knocks into its neighbours (hero only), spins a little, and drifts home.
    // The loop runs only while something moves.
    const home = new Float32Array(count * 2), offset = new Float32Array(count * 2), velocity = new Float32Array(count * 2)
    const radius = new Float32Array(count), weight = new Float32Array(count), baseAngle = new Float32Array(count)
    const spin = new Float32Array(count), spinVelocity = new Float32Array(count)
    const awake = new Uint8Array(count), touched = new Uint8Array(count)
    let pairs: Float32Array = new Float32Array(0) // [i, j, contact distance] triples
    let measured = false
    const measure = () => {
      for (let i = 0; i < count; i++) {
        const node = nodes[i], size = node.offsetWidth
        home[i * 2] = node.offsetLeft + size / 2
        home[i * 2 + 1] = node.offsetTop + node.offsetHeight / 2
        radius[i] = size * 0.36
        // Faint (far) particles react less, like depth in the water.
        weight[i] = 0.45 + 0.55 * (Number.parseFloat(node.style.getPropertyValue('--opacity')) || 1)
        baseAngle[i] = Number.parseFloat(node.style.getPropertyValue('--angle')) || 0
      }
      const found: number[] = []
      if (hero) for (let i = 0; i < count; i++) for (let j = i + 1; j < count; j++) {
        if (!radius[i] || !radius[j]) continue
        const rest = Math.hypot(home[i * 2] - home[j * 2], home[i * 2 + 1] - home[j * 2 + 1])
        // Particles that overlap at rest may keep overlapping; only closing in further bumps.
        if (rest < radius[i] + radius[j] + 60) found.push(i, j, Math.min(radius[i] + radius[j], rest * 0.98))
      }
      pairs = Float32Array.from(found)
      measured = true
    }

    const pointer = { clientX: 0, clientY: 0, x: 0, y: 0, vx: 0, vy: 0, seen: false, movedAt: -1e9 }
    let burst: { clientX: number; clientY: number } | null = null
    let frame = 0, last = 0

    const write = (i: number) => {
      const node = nodes[i]
      if (!awake[i]) { node.style.removeProperty('translate'); node.style.removeProperty('rotate'); touched[i] = 0; return }
      node.style.translate = `${offset[i * 2].toFixed(1)}px ${offset[i * 2 + 1].toFixed(1)}px`
      if (hero) node.style.rotate = `${(baseAngle[i] + spin[i]).toFixed(1)}deg`
      touched[i] = 1
    }

    const step = (now: number) => {
      frame = 0
      if (!enabled()) return
      const dt = Math.min(2, (now - (last || now - 16.7)) / 16.7)
      last = now
      if (!measured) measure()
      const box = scene.getBoundingClientRect()
      const scale = box.width / (scene.offsetWidth || box.width || 1)
      const active = now - pointer.movedAt < 120

      if (active) {
        const x = (pointer.clientX - box.left) / scale, y = (pointer.clientY - box.top) / scale
        pointer.vx = pointer.seen ? (x - pointer.x) / dt : 0
        pointer.vy = pointer.seen ? (y - pointer.y) / dt : 0
        pointer.x = x; pointer.y = y; pointer.seen = true
      } else pointer.seen = false
      const speed = Math.min(40, Math.hypot(pointer.vx, pointer.vy))

      for (let i = 0; i < count; i++) {
        if (!radius[i]) continue
        const ix = i * 2, iy = ix + 1
        if (active) {
          const dx = home[ix] + offset[ix] - pointer.x, dy = home[iy] + offset[iy] - pointer.y
          const reach = 110 + radius[i] * 2, distance = Math.hypot(dx, dy)
          if (distance < reach) {
            const falloff = (1 - distance / reach) ** 2, push = (1.4 + speed * 0.1) * falloff * weight[i] * dt
            const nx = dx / Math.max(distance, 1), ny = dy / Math.max(distance, 1)
            // Pushed away from the pointer, and dragged a little along with it.
            velocity[ix] += nx * push + pointer.vx * falloff * 0.15 * weight[i] * dt
            velocity[iy] += ny * push + pointer.vy * falloff * 0.15 * weight[i] * dt
            spinVelocity[i] += (nx * pointer.vy - ny * pointer.vx) * falloff * 0.35
            awake[i] = 1
          }
        }
        if (burst && radius[i]) {
          const bx = (burst.clientX - box.left) / scale, by = (burst.clientY - box.top) / scale
          const dx = home[ix] + offset[ix] - bx, dy = home[iy] + offset[iy] - by, distance = Math.hypot(dx, dy)
          if (distance < 280) {
            const push = 34 * (1 - distance / 280) ** 2 * weight[i]
            velocity[ix] += dx / Math.max(distance, 1) * push
            velocity[iy] += dy / Math.max(distance, 1) * push
            spinVelocity[i] += (i % 2 ? 1 : -1) * push * 1.5
            awake[i] = 1
          }
        }
      }
      burst = null

      // Neighbours bump: separate overlapping pairs and trade momentum.
      for (let k = 0; k < pairs.length; k += 3) {
        const i = pairs[k], j = pairs[k + 1]
        if (!awake[i] && !awake[j]) continue
        const dx = home[j * 2] + offset[j * 2] - home[i * 2] - offset[i * 2]
        const dy = home[j * 2 + 1] + offset[j * 2 + 1] - home[i * 2 + 1] - offset[i * 2 + 1]
        const distance = Math.hypot(dx, dy), contact = pairs[k + 2]
        if (distance >= contact || distance === 0) continue
        const nx = dx / distance, ny = dy / distance, overlap = (contact - distance) / 2
        offset[i * 2] -= nx * overlap; offset[i * 2 + 1] -= ny * overlap
        offset[j * 2] += nx * overlap; offset[j * 2 + 1] += ny * overlap
        const approach = (velocity[j * 2] - velocity[i * 2]) * nx + (velocity[j * 2 + 1] - velocity[i * 2 + 1]) * ny
        if (approach < 0) {
          const impulse = -approach * 0.8
          velocity[i * 2] -= nx * impulse; velocity[i * 2 + 1] -= ny * impulse
          velocity[j * 2] += nx * impulse; velocity[j * 2 + 1] += ny * impulse
          spinVelocity[i] -= impulse * 0.6; spinVelocity[j] += impulse * 0.6
        }
        awake[i] = awake[j] = 1
      }

      let moving = false
      const damping = 0.93 ** dt, spinDamping = 0.94 ** dt
      for (let i = 0; i < count; i++) {
        if (!awake[i]) { if (touched[i]) write(i); continue }
        const ix = i * 2, iy = ix + 1
        // Spring home, then friction.
        velocity[ix] = (velocity[ix] - offset[ix] * 0.012 * dt) * damping
        velocity[iy] = (velocity[iy] - offset[iy] * 0.012 * dt) * damping
        const v = Math.hypot(velocity[ix], velocity[iy])
        if (v > 26) { velocity[ix] *= 26 / v; velocity[iy] *= 26 / v }
        offset[ix] = Math.max(-170, Math.min(170, offset[ix] + velocity[ix] * dt))
        offset[iy] = Math.max(-170, Math.min(170, offset[iy] + velocity[iy] * dt))
        spinVelocity[i] = (spinVelocity[i] - spin[i] * 0.01 * dt) * spinDamping
        spin[i] = Math.max(-120, Math.min(120, spin[i] + spinVelocity[i] * dt))
        const resting = Math.abs(offset[ix]) + Math.abs(offset[iy]) < 0.15 && v < 0.05 && Math.abs(spin[i]) < 0.2 && Math.abs(spinVelocity[i]) < 0.05
        if (resting) {
          offset[ix] = offset[iy] = velocity[ix] = velocity[iy] = spin[i] = spinVelocity[i] = 0
          awake[i] = 0
        } else moving = true
        write(i)
      }
      if (moving || now - pointer.movedAt < 120) frame = requestAnimationFrame(step)
      else last = 0
    }
    const wake = () => { if (!frame && enabled()) frame = requestAnimationFrame(step) }

    const move = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return
      pointer.clientX = event.clientX; pointer.clientY = event.clientY
      pointer.movedAt = performance.now()
      wake()
    }
    // A tap or click drops a pebble: nearby particles scatter from it.
    const press = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !scene.contains(event.target)) return
      burst = { clientX: event.clientX, clientY: event.clientY }
      wake()
    }
    const settle = () => {
      cancelAnimationFrame(frame); frame = 0; last = 0
      for (let i = 0; i < count; i++) {
        offset[i * 2] = offset[i * 2 + 1] = velocity[i * 2] = velocity[i * 2 + 1] = spin[i] = spinVelocity[i] = 0
        awake[i] = 0
        if (touched[i]) write(i)
      }
    }
    const forget = () => { measured = false }
    if (!enabled()) settle()
    surface.addEventListener('pointermove', move, { passive: true })
    surface.addEventListener('pointerdown', press, { passive: true })
    window.addEventListener('resize', forget, { passive: true })
    preference.addEventListener('change', settle)
    return () => {
      settle()
      surface.removeEventListener('pointermove', move)
      surface.removeEventListener('pointerdown', press)
      window.removeEventListener('resize', forget)
      preference.removeEventListener('change', settle)
    }
  }, [hero, paused, visible, allowReducedMotion])
  const displayed = hero ? scatter : particles.filter(particle => subject === 'all' || subject === particle.id)
  return <span ref={root} className={styles.scene} data-testid={hero ? 'hero-cutout-scene' : 'photo-cutout-scene'} data-subject={subject} data-dense={hero} data-motion={visible && !paused} data-motion-override={allowReducedMotion}
    role={hero ? 'img' : undefined} aria-label={hero ? 'Dense field of tiny particles at varying depths' : undefined}
    onDragStart={event => event.preventDefault()}
    onPointerDown={event => { pointerStart.current = { x: event.clientX, y: event.clientY } }}
    onPointerCancel={() => { pointerStart.current = null }}
    onPointerUp={event => {
      const start = pointerStart.current
      pointerStart.current = null
      if (!start || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return
      if (!hero || !onSelect || !(event.target instanceof Element)) return
      const form = event.target.closest<HTMLElement>('[data-form]')?.dataset.form
      if (form === 'fibers' || form === 'fragments' || form === 'granules') onSelect(form)
    }}
    >
    <span className={styles.light} aria-hidden="true" />
    {displayed.map((particle, index) => {
      const content = <span className={styles.reaction}><span className={styles.float}><Image src={hero ? `/media/ripple/photo-cutouts/sm/${particle.file}.webp` : `/media/ripple/photo-cutouts/${particle.file}.webp`} alt={hero ? '' : particle.alt} width={hero ? 192 : 960} height={hero ? 192 : 960} sizes={hero ? '64px' : '(max-width: 699px) 28vw, 360px'} loading={hero ? 'eager' : 'lazy'} draggable={false} unoptimized data-testid={hero && index === 1 ? 'hero-artwork' : undefined} onError={() => setFailed(true)} /></span></span>
      const placement = { '--x': `${particle.x}%`, '--y': `${particle.y}%`, '--size': `${particle.size}%`, '--angle': `${particle.angle}deg`, '--duration': `${9 + index % 5}s`, '--delay': `${-index * 1.7}s`, '--opacity': 'opacity' in particle ? particle.opacity : 1, '--blur': `${'blur' in particle ? particle.blur : 0}px` } as CSSProperties
      const properties = { className: styles.particle, style: placement, 'data-particle': particle.file, 'data-form': particle.id, 'data-primary': index === 0, 'data-dimmed': selected !== 'all' && selected !== particle.id, 'data-highlighted': selected === particle.id }
      return onSelect && !hero
        ? <button key={`${particle.file}-${index}`} {...properties} type="button" aria-label={`Highlight ${particle.id}: ${particle.file}`} aria-pressed={selected === particle.id} onClick={() => onSelect(particle.id)}>{content}</button>
        : <span key={`${particle.file}-${index}`} {...properties} aria-hidden={hero || undefined}>{content}</span>
    })}
    {failed && <span className={styles.error}>Particle image unavailable.</span>}
  </span>
})
