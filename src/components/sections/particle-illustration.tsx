'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import styles from './particle-illustration.module.css'

const subjects = {
  microplastics: { label: 'Microplastics', src: '/media/ripple/layers/fragment.png', companion: '/media/ripple/layers/fiber.png' },
  nanoplastics: { label: 'Nanoplastics', src: '/media/ripple/illustrations/nano-aggregate.webp', companion: null },
  microbeads: { label: 'Microbeads', src: '/media/ripple/illustrations/microbead.webp', companion: null },
  tire: { label: 'Tire-wear particles', src: '/media/ripple/illustrations/tire-wear.webp', companion: null },
  fibers: { label: 'Synthetic textile fibers', src: '/media/ripple/layers/fiber.png', companion: null },
} as const
export type ParticleSubject = keyof typeof subjects

export function ParticleIllustration({ subject }: { subject: ParticleSubject }) {
  const artwork = subjects[subject]
  const root = useRef<HTMLElement>(null)
  const [visible, setVisible] = useState(false)
  const [paused, setPaused] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  useEffect(() => {
    let inView = false
    const update = () => setVisible(inView && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; update() })
    if (root.current) observer.observe(root.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])
  return <figure ref={root} className={styles.figure} data-testid={`illustration-${subject}`} data-motion={visible && !paused}>
    <button type="button" className={styles.scene} aria-label={`Inspect ${artwork.label} illustration`} aria-pressed={zoomed} data-zoomed={zoomed}
      onClick={() => setZoomed(value => !value)}
      onPointerMove={event => {
        if (event.pointerType !== 'mouse' || paused) return
        const box = event.currentTarget.getBoundingClientRect()
        event.currentTarget.style.setProperty('--look-x', `${((event.clientX - box.left) / box.width - .5) * 14}px`)
        event.currentTarget.style.setProperty('--look-y', `${((event.clientY - box.top) / box.height - .5) * 10}px`)
      }}
      onPointerLeave={event => { event.currentTarget.style.setProperty('--look-x', '0px'); event.currentTarget.style.setProperty('--look-y', '0px') }}>
      <Image className={styles.water} src="/media/ripple/illustrations/water-background.webp" alt="" fill sizes="(max-width: 639px) 100vw, 400px" />
      <span className={styles.parallax}><span className={styles.zoom}>
        <span className={styles.subject}><Image src={artwork.src} alt="" fill sizes="(max-width: 639px) 80vw, 300px" /></span>
        {artwork.companion && <span className={styles.companion}><Image src={artwork.companion} alt="" fill sizes="160px" /></span>}
      </span></span>
      <span className={styles.inspect}>{zoomed ? 'Reset view −' : 'Inspect +'}</span>
    </button>
    <figcaption className={styles.caption}>
      <span>{subject === 'nanoplastics' ? 'Conceptual nanoscale illustration' : 'Generated illustration'}</span>
      <button type="button" className={styles.pause} aria-label={`${paused ? 'Resume' : 'Pause'} ${artwork.label} motion`} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume' : 'Pause'}</button>
    </figcaption>
  </figure>
}
