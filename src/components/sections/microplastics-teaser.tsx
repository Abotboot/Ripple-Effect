'use client'

import type { Section } from '@/components/site/site-header'
import { SplitWords } from '@/components/motion/split-words'
import { requestSectionFocus } from '@/lib/section-focus'
import './microplastics-teaser.css'

// A short doorway on Home to the microplastics explainers, which live on the
// Microplastics page. Each card opens that page scrolled to its explainer.

const ITEMS = [
  {
    id: 'how-small',
    title: 'How small is small?',
    body: 'Zoom from a 5 mm fragment to a nanoplastic.',
    icon: <><circle cx="24" cy="24" r="18" /><circle cx="24" cy="24" r="10" /><circle cx="24" cy="24" r="3.5" className="mt-fill" /></>,
  },
  {
    id: 'plastic-path',
    title: 'How plastic reaches your water',
    body: 'Follow it from litter and laundry to the tap.',
    icon: <><path d="M4 30c7-9 13 9 20 0s13 9 20 0" /><circle cx="14" cy="27" r="2" className="mt-fill" /><circle cx="33" cy="30" r="2" className="mt-fill" /><path d="M4 20c7-9 13 9 20 0s13 9 20 0" className="mt-faint" /></>,
  },
  {
    id: 'particle-atlas',
    title: 'Compare particle forms',
    body: 'Fibers, fragments and pellets, photographed up close.',
    icon: <><path d="M6 32c5-10 10 2 15-8" /><path d="M26 14l9-3 5 7-6 7-8-2z" /><circle cx="17" cy="37" r="4" className="mt-fill" /></>,
  },
] as const

export function MicroplasticsTeaser({ onNavigate }: { onNavigate?: (s: Section) => void }) {
  const open = (id: string) => {
    requestSectionFocus(id)
    onNavigate?.('microplastics')
  }
  return (
    <section className="mp-teaser" aria-labelledby="mp-teaser-title">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="home-heading">
          <span className="home-eyebrow">Microplastics</span>
          <h2 id="mp-teaser-title" data-split><SplitWords text="Go deeper" /></h2>
        </div>
        <div className="mp-teaser-grid">
          {ITEMS.map(item => (
            <button key={item.id} type="button" className="mp-teaser-card" onClick={() => open(item.id)} data-spotlight>
              <svg viewBox="0 0 48 48" aria-hidden="true">{item.icon}</svg>
              <span className="mp-teaser-text">
                <strong>{item.title}</strong>
                <span>{item.body}</span>
              </span>
              <span className="mp-teaser-arrow" aria-hidden="true">→</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
