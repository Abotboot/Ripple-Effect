'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
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

export function PhotoParticleScene({ subject = 'all', selected = 'all', paused = false, onSelect, hero = false }: {
  subject?: Form | 'all'; selected?: Form | 'all'; paused?: boolean; onSelect?: (form: Form) => void; hero?: boolean
}) {
  const root = useRef<HTMLSpanElement>(null)
  const [visible, setVisible] = useState(false)
  const [failed, setFailed] = useState(false)
  const pointerFrame = useRef<number | null>(null)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    let intersects = false
    const update = () => setVisible(intersects && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => { intersects = entry.isIntersecting; update() })
    if (root.current) observer.observe(root.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update); if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current) }
  }, [])
  const displayed = hero ? scatter : particles.filter(particle => subject === 'all' || subject === particle.id)
  return <span ref={root} className={styles.scene} data-testid={hero ? 'hero-cutout-scene' : 'photo-cutout-scene'} data-subject={subject} data-dense={hero} data-motion={visible && !paused}
    role={hero ? 'img' : undefined} aria-label={hero ? 'Dense field of tiny particles at varying depths' : undefined}
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
    onPointerMove={event => {
      if (event.pointerType !== 'mouse' || paused || !visible || matchMedia('(prefers-reduced-motion: reduce)').matches) return
      const { clientX, clientY } = event
      if (pointerFrame.current !== null) cancelAnimationFrame(pointerFrame.current)
      pointerFrame.current = requestAnimationFrame(() => {
        pointerFrame.current = null
        root.current?.querySelectorAll<HTMLElement>('[data-particle]').forEach(node => {
          const box = node.getBoundingClientRect()
          const dx = box.x + box.width / 2 - clientX, dy = box.y + box.height / 2 - clientY
          const distance = Math.hypot(dx, dy), influence = Math.max(0, 1 - distance / 220)
          node.style.setProperty('--push-x', `${dx / Math.max(distance, 1) * influence * 20}px`)
          node.style.setProperty('--push-y', `${dy / Math.max(distance, 1) * influence * 20}px`)
        })
      })
    }}
    onPointerLeave={() => {
      if (pointerFrame.current !== null) { cancelAnimationFrame(pointerFrame.current); pointerFrame.current = null }
      root.current?.querySelectorAll<HTMLElement>('[data-particle]').forEach(node => { node.style.setProperty('--push-x', '0px'); node.style.setProperty('--push-y', '0px') })
    }}>
    <span className={styles.light} aria-hidden="true" />
    {displayed.map((particle, index) => {
      const content = <span className={styles.reaction}><span className={styles.float}><Image src={`/media/ripple/photo-cutouts/${particle.file}.webp`} alt={hero ? '' : particle.alt} width={960} height={960} sizes={hero ? '64px' : '(max-width: 699px) 28vw, 360px'} loading={hero ? 'eager' : 'lazy'} unoptimized data-testid={hero && index === 1 ? 'hero-artwork' : undefined} onError={() => setFailed(true)} /></span></span>
      const placement = { '--x': `${particle.x}%`, '--y': `${particle.y}%`, '--size': `${particle.size}%`, '--angle': `${particle.angle}deg`, '--duration': `${9 + index % 5}s`, '--delay': `${-index * 1.7}s`, '--opacity': 'opacity' in particle ? particle.opacity : 1, '--blur': `${'blur' in particle ? particle.blur : 0}px` } as CSSProperties
      const properties = { className: styles.particle, style: placement, 'data-particle': particle.file, 'data-form': particle.id, 'data-primary': index === 0, 'data-dimmed': selected !== 'all' && selected !== particle.id, 'data-highlighted': selected === particle.id }
      return onSelect && !hero
        ? <button key={`${particle.file}-${index}`} {...properties} type="button" aria-label={`Highlight ${particle.id}: ${particle.file}`} aria-pressed={selected === particle.id} onClick={() => onSelect(particle.id)}>{content}</button>
        : <span key={`${particle.file}-${index}`} {...properties} aria-hidden={hero || undefined}>{content}</span>
    })}
    {failed && <span className={styles.error}>Particle image unavailable.</span>}
  </span>
}
