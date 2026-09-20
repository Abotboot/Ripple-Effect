'use client'

import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import type { ArtworkCategory } from '@/lib/artwork-journey'
import { useParticleMotion } from '@/hooks/use-particle-motion'
import { PhotoParticleScene } from '../sections/photo-particle-scene'
import './tank.css'
import './photo-hero.css'

export { TankCanvas } from './tank-canvas'

const forms: { id: ArtworkCategory; label: string; description: string }[] = [
  { id: 'all', label: 'All forms', description: 'Move across the particles, or tap a form to highlight it.' },
  { id: 'fibers', label: 'Fibers', description: 'Thread-like forms with long, narrow profiles.' },
  { id: 'fragments', label: 'Fragments', description: 'Irregular, angular or film-like pieces.' },
  { id: 'granules', label: 'Granules', description: 'Rounded or bead-like solid forms.' },
]

export function TankHero({ children }: { children: ReactNode }) {
  const [category, setCategory] = useState<ArtworkCategory>('all')
  const motion = useParticleMotion()
  const root = useRef<HTMLElement>(null)
  useLayoutEffect(() => {
    const updateOffset = () => {
      const header = document.querySelector<HTMLElement>('.site-header')
      const height = header && ['fixed', 'sticky'].includes(getComputedStyle(header).position) ? header.getBoundingClientRect().height : 0
      root.current?.style.setProperty('--ripple-header-offset', `${height}px`)
    }
    updateOffset()
    window.addEventListener('resize', updateOffset)
    return () => window.removeEventListener('resize', updateOffset)
  }, [])

  return <section ref={root} className="tank-hero ripple-hero" aria-labelledby="tank-title" data-testid="ripple-hero" data-state="live">
    <div className="ripple-media" data-testid="ripple-media">
      <figure className="ripple-photograph" data-testid="particle-stage" data-renderer="photo-derived-cutouts" data-category={category}>
        <PhotoParticleScene hero selected={category} paused={motion.paused} allowReducedMotion={motion.override} onSelect={setCategory} />
        <figcaption><a href="#particle-atlas">Photo sources ↓</a></figcaption>
      </figure>
    </div>
    <div className="tank-editorial ripple-editorial">
      <p className="tank-eyebrow">A RIPPLE EFFECT INITIATIVE</p>
      <h1 id="tank-title">Clear water.<br /><em>Look closer.</em></h1>
      <div className="tank-copy"><p>Explore water measurements and their sources.</p></div>
      <div className="tank-search">{children}</div>
    </div>
    <div className="ripple-workbench" aria-label="Photograph controls">
      <div className="ripple-form-selector"><span className="ripple-control-label">Highlight a form</span>
        <div className="ripple-category-buttons" role="group" aria-label="Choose particle form">{forms.map(form => <button type="button" key={form.id} data-testid={`field-${form.id}`} aria-pressed={category === form.id} onClick={() => setCategory(form.id)}>{form.label}</button>)}</div>
      </div>
      <button type="button" className="ripple-motion-button" data-testid="field-pause" aria-pressed={motion.paused} onClick={motion.toggle}>{motion.label}</button>
      <p className="ripple-field-description" data-testid="field-description" aria-live="polite">{forms.find(form => form.id === category)!.description}</p>
    </div>
  </section>
}
