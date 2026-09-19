'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { particlePhotographs } from '@/lib/particle-photographs'
import { PhotographCredit } from './photograph-credit'
import { PhotoParticleScene } from './photo-particle-scene'
import styles from './particle-atlas.module.css'

const categories = [
  {
    id: 'fibers',
    title: 'Fibers',
    description: 'Long, fine strands',
  },
  {
    id: 'fragments',
    title: 'Fragments',
    description: 'Irregular flakes and chips',
  },
  {
    id: 'granules',
    title: 'Granules',
    description: 'Compact, rounded pieces',
  },
] as const

export function ParticleAtlas({ onMethodology }: { onMethodology?: () => void } = {}) {
  const [selected, setSelected] = useState(0)
  const [paused, setPaused] = useState(false)
  const tabs = useRef<Array<HTMLButtonElement | null>>([])

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
    <section id="particle-atlas" className={styles.atlas} aria-labelledby="particle-atlas-title" data-testid="particle-atlas">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>Particle atlas</p>
            <h2 id="particle-atlas-title">Compare particle forms</h2>
          </div>
          <div><p className={styles.intro}>Photo-derived particles. Three forms to explore.</p><button className={styles.motionToggle} type="button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>{paused ? 'Resume motion' : 'Pause motion'}</button></div>
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
            >
              <span className={styles.scene} data-form={id}>
                <PhotoParticleScene subject={id} selected={selected === index ? id : 'all'} paused={paused} />
              </span>
              <span className={styles.cardLabel}>
                <span id={`atlas-label-${id}`} className={styles.cardTitle}>{title}</span>
                <span className={styles.selection} aria-hidden="true">{selected === index ? 'Exploring' : 'Explore ↗'}</span>
              </span>
              <span className={styles.description}>{description}</span>
            </button>
          ))}
        </div>
        {categories.map(({ id, title, description }, index) => (
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
            <div className={styles.detail}>
              <Image src={particlePhotographs[id].src} alt={particlePhotographs[id].alt} width={particlePhotographs[id].width} height={particlePhotographs[id].height} sizes="(max-width: 699px) 80vw, 480px" loading="lazy" unoptimized />
              <div><p className={styles.features}>{particlePhotographs[id].caption}</p><p className={styles.note}><PhotographCredit photo={particlePhotographs[id]} /></p></div>
            </div>
          </div>
        ))}
        <div className={styles.footer}>
          <p className={styles.note}>Photo-derived artwork. Source photo shown for each form.</p>
          <div className={styles.footerLinks}>
            {onMethodology && <button type="button" className={styles.link} onClick={onMethodology}>Methodology &amp; sources <span aria-hidden="true">↗</span></button>}
            <a className={styles.link} href="#sample-study">Examine a sample <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}
