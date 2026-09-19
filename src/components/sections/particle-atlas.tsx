'use client'

import { useRef, useState, type KeyboardEvent } from 'react'
import Image from 'next/image'
import { rippleAssets } from '@/lib/ripple-assets'
import styles from './particle-atlas.module.css'

const categories = [
  {
    id: 'fibers',
    title: 'Fibers',
    description: 'Long, fine strands',
    asset: rippleAssets.fibers,
    observation: 'Follow the slender outlines. The strands bend along their length, with narrow highlights at their edges. Softer strands sit behind the two sharper examples.',
    limitation: 'The colors and apparent widths are illustrative, not material tests or size measurements.',
    record: 'For a real sample, look for recorded dimensions, an examination method, and evidence for any material label.',
  },
  {
    id: 'fragments',
    title: 'Fragments',
    description: 'Irregular flakes and chips',
    asset: rippleAssets.fragments,
    observation: 'Compare the uneven outlines and broad, translucent faces. The foreground pieces have folds and bright edges; the more distant shapes are less distinct.',
    limitation: 'Transparency and surface texture here are visual cues, not polymer-identification results.',
    record: 'For a real sample, keep the image and its scale with the method used to identify the material.',
  },
  {
    id: 'granules',
    title: 'Granules',
    description: 'Compact, rounded pieces',
    asset: rippleAssets.granules,
    observation: 'Look at the compact forms and uneven surfaces. Their rounded outlines differ from the thin strands and broad flakes in the other illustrations.',
    limitation: 'The number of pieces shown is an artistic choice, not a count or concentration from a water sample.',
    record: 'For a real sample, check the sampled volume, reported units, and analytical result before interpreting a particle count.',
  },
] as const

export function ParticleAtlas({ onMethodology }: { onMethodology?: () => void } = {}) {
  const [selected, setSelected] = useState(0)
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
          <p className={styles.intro}>Choose a form to read its visible features and the limits of visual identification.</p>
        </div>
        <div className={styles.grid} role="tablist" aria-label="Particle form" aria-orientation="horizontal">
          {categories.map(({ id, title, description, asset }, index) => (
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
              <Image
                src={asset.src}
                alt={asset.alt}
                width={asset.width}
                height={asset.height}
                sizes="(max-width: 699px) 28vw, (max-width: 1399px) 28vw, 370px"
                loading="lazy"
              />
              <span className={styles.cardLabel}>
                <span id={`atlas-label-${id}`} className={styles.cardTitle}>{title}</span>
                <span className={styles.selection} aria-hidden="true">{selected === index ? 'Selected' : 'View notes'}</span>
              </span>
              <span className={styles.description}>{description}</span>
            </button>
          ))}
        </div>
        {categories.map(({ id, title, observation, limitation, record }, index) => (
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
              <h3>{title}: reading the illustration</h3>
              <span>Illustration only</span>
            </div>
            <dl className={styles.observations}>
              <div><dt>Visible features</dt><dd>{observation}</dd></div>
              <div><dt>What this cannot tell you</dt><dd>{limitation}</dd></div>
            </dl>
            <p className={styles.record}>{record}</p>
          </div>
        ))}
        <div className={styles.footer}>
          <p className={styles.note}>Illustrations only. Form alone cannot identify material, source, concentration, or risk.</p>
          <div className={styles.footerLinks}>
            {onMethodology && <button type="button" className={styles.link} onClick={onMethodology}>Methodology &amp; sources <span aria-hidden="true">↗</span></button>}
            <a className={styles.link} href="#specimen-study">Try the specimen controls <span aria-hidden="true">↓</span></a>
          </div>
        </div>
      </div>
    </section>
  )
}
