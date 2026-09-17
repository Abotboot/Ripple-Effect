'use client'

import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import SplitType from 'split-type'
import './water-narrative.css'

gsap.registerPlugin(ScrollTrigger)

const SIPHON_WAYPOINTS = [
  {
    id: 'siphon-ingestion',
    index: '01',
    name: 'INGESTION',
    body: 'The bottle empties. Exposure begins where visibility ends.',
    note: 'Plastic particles have been detected in bottled water. A study average does not measure your exposure.',
  },
  {
    id: 'siphon-contact',
    index: '02',
    name: 'CONTACT',
    body: 'Below the visible scale, size changes the question.',
    note: 'NIH describes nanoplastics as small enough to enter cells and tissues. This is not a prediction for every particle.',
  },
  {
    id: 'siphon-transit',
    index: '03',
    name: 'TRANSIT',
    body: 'Researchers have reported plastic particles in human blood, lungs and placenta.',
    note: 'Detection does not establish a route from a particular bottle, dose or health effect.',
  },
  {
    id: 'siphon-unknown',
    index: '04',
    name: 'THE UNSETTLED',
    body: 'A finding is not a forecast. Health effects remain under investigation.',
    note: 'Exposure, transport and health outcomes are different questions. Uncertainty belongs in the picture.',
  },
]

export function WaterNarrative() {
  const root = useRef<HTMLDivElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const track = useRef<HTMLDivElement>(null)

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
      // Stage 03: pinned horizontal scrub across the anatomic waypoints.
      if (context.conditions?.desktop && track.current) {
        const inner = track.current
        const distance = () => Math.max(0, inner.scrollWidth - inner.parentElement!.clientWidth)
        gsap.to(inner, {
          x: () => -distance(), ease: 'none',
          scrollTrigger: {
            trigger: element.querySelector('.siphon-stage')!,
            start: 'top 76px', end: '+=1500', scrub: true, pin: true,
            invalidateOnRefresh: true,
          },
        })
        // matchMedia owns the tween and restores its transform on cleanup.
      }
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
    <section className="siphon-stage" aria-labelledby="siphon-title">
      <div className="siphon-head">
        <div className="narrative-label">03 / THE ANATOMIC SIPHON</div>
        <h2 id="siphon-title">Inside <em>the body.</em><br />At the edge of what we know.</h2>
      </div>
      <div className="siphon-viewport">
        <div className="siphon-track" ref={track}>
          {SIPHON_WAYPOINTS.map((waypoint) => (
            <article className="siphon-stop" key={waypoint.id} aria-labelledby={`${waypoint.id}-name`}>
              <span className="siphon-index" aria-hidden="true">{waypoint.index}</span>
              <h3 id={`${waypoint.id}-name`}>{waypoint.name}</h3>
              <p className="siphon-body">{waypoint.body}</p>
              <p className="siphon-note">{waypoint.note}</p>
            </article>
          ))}
        </div>
      </div>
      <div className="siphon-disclaimer"><p>ILLUSTRATIVE RESEARCH SEQUENCE, NOT A PROVEN ROUTE THROUGH THE BODY OR A MEDICAL SIMULATION.</p><a className="narrative-link" href="https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water" target="_blank" rel="noopener noreferrer">Evidence and limits / NIH <span aria-hidden="true">↗</span></a></div>
    </section>
  </div>
}
