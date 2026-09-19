'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TankHero } from '@/components/atmosphere/tank-hero'
import { WaterNarrative } from '@/components/atmosphere/water-narrative'
import { SpecimenInspector } from '@/components/atmosphere/specimen-inspector'
import { ParticleAtlas } from '@/components/sections/particle-atlas'
import './motion-study.css'

export default function MotionStudy() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return (
    <main className="motion-study">
      <header className="motion-study-heading"><Link href="/">← Water search</Link><p>Motion study · provisional timing proof · no backend requests</p></header>
      <TankHero>
        <form onSubmit={event => { event.preventDefault(); setSubmitted(true) }}>
          <label className="sr-only" htmlFor="study-search">ZIP, city, or utility</label>
          <input id="study-search" value={query} onChange={event => { setQuery(event.target.value); setSubmitted(false) }} placeholder="ZIP, city, or utility" />
          <button type="submit">Try search</button>
        </form>
        <div className="tank-search-links"><a href="#specimen-study">Explore the specimen</a><a href="#sample-study">Examine a sample</a></div>
      </TankHero>
      <section id="search" className="motion-study-results" aria-live="polite">
        <h2>Search interaction preview</h2>
        <p>{submitted ? `Input preserved: “${query || '(empty)'}”. This isolated study makes no data request.` : 'The real HTML field remains in place during playback. Try it after the journey; no results are fabricated.'}</p>
      </section>
      <ParticleAtlas />
      <div id="specimen-study"><SpecimenInspector /><WaterNarrative contributeHref="/#submit" /></div>
    </main>
  )
}
