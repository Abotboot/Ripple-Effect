'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitType from 'split-type'
import './water-narrative.css'

gsap.registerPlugin(ScrollTrigger)

export function WaterNarrative() {
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const element = root.current
    if (!element) return
    const media = gsap.matchMedia()
    media.add({ motion: '(prefers-reduced-motion: no-preference)', desktop: '(min-width: 900px) and (min-height: 900px)' }, (context) => {
      if (!context.conditions?.motion) return
      const heading = element.querySelector<HTMLElement>('[data-split]')!
      const split = new SplitType(heading, { types: 'words' })
      gsap.from(split.words, {
        opacity: 0.2, y: 24, stagger: 0.1, ease: 'none',
        scrollTrigger: { trigger: heading, start: 'top 85%', end: 'bottom 45%', scrub: true },
      })
      const stage = element.querySelector<HTMLElement>('.particle-stage')!
      const meter = { value: 0 }
      const render = () => { if (count.current) count.current.textContent = Math.round(meter.value).toLocaleString('en-US') }
      gsap.fromTo(meter, { value: 0 }, {
        value: 240000, ease: 'none', onUpdate: render,
        scrollTrigger: {
          trigger: stage, start: 'top 76px', end: '+=650', scrub: true,
          // Small screens keep native document flow; never trap touch scrolling.
          pin: Boolean(context.conditions?.desktop),
          invalidateOnRefresh: true,
        },
      })
      return () => { split.revert(); if (count.current) count.current.textContent = '240,000' }
    }, element)
    let active = true
    document.fonts.ready.then(() => { if (active) ScrollTrigger.refresh() })
    return () => { active = false; media.revert() }
  }, [])

  return <div className="water-narrative" ref={root}>
    <section className="illusion-stage" aria-labelledby="illusion-title">
      <div className="narrative-label">01 / THE ILLUSION OF CLEAR WATER</div>
      <h2 id="illusion-title" aria-label="Transparency is not purity."><span aria-hidden="true" data-split>Transparency is not purity.</span></h2>
      <div className="illusion-bottom">
        <span className="narrative-coordinate" aria-hidden="true">H₂O / BEYOND THE VISIBLE</span>
        <p>A sealed bottle. A pristine label. A promise you can see straight through. Clear water tells us what our eyes can detect. Not everything it contains.</p>
      </div>
      <a className="narrative-link" href="#search">Skip to your water data <span aria-hidden="true">↓</span></a>
    </section>
    <section className="particle-stage" aria-labelledby="particle-title">
      <div className="narrative-label">02 / THE INVISIBLE CONTENTS</div>
      <h2 id="particle-title">One liter.<br /><em>A smaller world inside.</em></h2>
      <div className="particle-number" aria-label="Approximately 240,000 particles per liter on average in the study">
        <span ref={count} aria-hidden="true">240,000</span><span className="particle-unit" aria-hidden="true">PARTICLES / LITER</span>
      </div>
      <div className="particle-context">
        <p>A 2024 study of three bottled-water brands found an average of approximately 240,000 micro- and nanoplastic particles per liter. About 90% were nanoplastics.</p>
        <div><p>Study average, not a measurement of your water or a personal ingestion count. Concentrations varied across tested samples. Health implications remain under investigation.</p>
          <a className="narrative-link" href="https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water" target="_blank" rel="noopener noreferrer">Read the NIH research summary <span aria-hidden="true">↗</span></a>
        </div>
      </div>
    </section>
  </div>
}
