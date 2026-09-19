'use client'

import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { rippleAssets } from '@/lib/ripple-assets'
import styles from './particle-atlas.module.css'

const categories = [
  {
    id: 'fibers',
    title: 'Fibers',
    description: 'Long, fine strands',
    asset: rippleAssets.fibers,
  },
  {
    id: 'fragments',
    title: 'Fragments',
    description: 'Irregular flakes and chips',
    asset: rippleAssets.fragments,
  },
  {
    id: 'granules',
    title: 'Granules',
    description: 'Compact, rounded pieces',
    asset: rippleAssets.granules,
  },
] as const

export function ParticleAtlas({ onMethodology }: { onMethodology?: () => void } = {}) {
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  const [visible, setVisible] = useState(false)
  const atlas = useRef<HTMLElement>(null)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])
  useEffect(() => {
    let intersecting = false
    const update = () => setVisible(intersecting && !document.hidden)
    const observer = new IntersectionObserver(([entry]) => { intersecting = entry.isIntersecting; update() })
    if (atlas.current) observer.observe(atlas.current)
    document.addEventListener('visibilitychange', update)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', update) }
  }, [])

  const moveSelection = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next: number
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % categories.length; break
      case 'ArrowLeft': next = (index - 1 + categories.length) % categories.length; break
      case 'Home': next = 0; break
      case 'End': next = categories.length - 1; break
      default: return
    }
    event.preventDefault()
    setSelected(next)
    tabs.current[next]?.focus()
  }

  return (
    <section ref={atlas} id="particle-atlas" className={styles.atlas} aria-labelledby="particle-atlas-title" data-testid="particle-atlas" data-motion={visible && !paused}>
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Particle atlas</p>
            <h2 id="particle-atlas-title">Compare particle forms</h2>
          </div>
          <div><p className={styles.intro}>Three forms. Take a closer look.</p><button type="button" className={styles.motionToggle} aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume motion' : 'Pause motion'}</button></div>
        </div>
        <div className={styles.grid} role="tablist" aria-label="Particle form" aria-orientation="horizontal">
          {categories.map(({ id, title, description }, index) => (
            <button
              key={id}
              ref={element => { tabs.current[index] = element }}
              id={`atlas-tab-${id}`}
              type="button"
              role="tab"
              aria-selected={selected === index}
              aria-controls={`atlas-panel-${id}`}
              aria-labelledby={`atlas-label-${id}`}
              tabIndex={selected === index ? 0 : -1}
              className={styles.card}
              onClick={() => setSelected(index)}
              onKeyDown={event => moveSelection(event, index)}
              onPointerMove={event => {
                if (event.pointerType !== 'mouse') return
                const box = event.currentTarget.getBoundingClientRect()
                event.currentTarget.style.setProperty('--look-x', `${((event.clientX - box.left) / box.width - .5) * 12}px`)
                event.currentTarget.style.setProperty('--look-y', `${((event.clientY - box.top) / box.height - .5) * 12}px`)
              }}
              onPointerLeave={event => { event.currentTarget.style.setProperty('--look-x', '0px'); event.currentTarget.style.setProperty('--look-y', '0px') }}
            >
              <span className={styles.scene} data-form={id} aria-hidden="true">
                <span className={styles.light} />
                <span className={styles.depth}>
                  {[0, 1, 2].map(layer => <span key={layer} className={styles.particle} data-layer={layer}><Image src={`/media/ripple/layers/${id === 'fibers' ? 'fiber' : id === 'fragments' ? 'fragment' : 'granule'}.png`} alt="" width={1280} height={1280} sizes="(max-width: 699px) 28vw, 300px" loading="lazy" /></span>)}
                </span>
              </span>
              <span className={styles.cardLabel}>
                <span id={`atlas-label-${id}`} className={styles.cardTitle}>{title}</span>
                <span className={styles.selection} aria-hidden="true">{selected === index ? 'Exploring' : 'Explore ↗'}</span>
              </span>
              <span className={styles.description}>{description}</span>
            </button>
          ))}
        </div>
        {categories.map(({ id, title, description, asset }, index) => (
          <div
            key={id}
            id={`atlas-panel-${id}`}
            role="tabpanel"
            aria-labelledby={`atlas-tab-${id}`}
            hidden={selected !== index}
            tabIndex={0}
            className={styles.panel}
            data-testid={`atlas-panel-${id}`}
          >
            <div className={styles.panelHeading}>
              <h3>{title}</h3>
              <span>{description}</span>
            </div>
            <p className={styles.features}>{id === 'fibers' ? 'Follow the curve and fine strands along its edge.' : id === 'fragments' ? 'Look for folded surfaces, sharp edges and uneven thickness.' : 'Compare the rounded outlines and rough surfaces.'}</p>
            <details className={styles.reference}><summary>View original illustration</summary><Image src={asset.src} alt={asset.alt} width={asset.width} height={asset.height} sizes="(max-width: 699px) 80vw, 320px" loading="lazy" /></details>
          </div>
        ))}
        <div className={styles.footer}>
          <p className={styles.note}>Particle illustrations. Identification requires a sample test.</p>
          <div className={styles.footerLinks}>
            {onMethodology && <button type="button" className={styles.link} onClick={onMethodology}>Methodology &amp; sources <span aria-hidden="true">↗</span></button>}
            <a className={styles.link} href="#specimen-study">Try the specimen controls <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}
