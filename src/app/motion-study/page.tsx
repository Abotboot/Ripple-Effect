'use client'

import Link from 'next/link'
import { useState } from 'react'
import { TankHero } from '@/components/atmosphere/tank-hero'
import { WaterNarrative } from '@/components/atmosphere/water-narrative'
import { ParticleAtlas } from '@/components/sections/particle-atlas'
import './motion-study.css'

export default function MotionStudy() {
  const [query, setQuery] = useState('')
  const [submitted, setSubmitted] = useState(false)
  return (
    <main className="motion-study">
      <header className="motion-study-heading"><Link href="/">← Water search</Link><p>Interactive field study · no backend requests</p></header>
      <TankHero>
        <form onSubmit={event => { event.preventDefault(); setSubmitted(true) }}>
          <label className="sr-only" htmlFor="study-search">ZIP, city, or utility</label>
          <input id="study-search" value={query} onChange={event => { setQuery(event.target.value); setSubmitted(false) }} placeholder="ZIP, city, or utility" />
          <button type="submit">Try search</button>
        </form>
        <div className="tank-search-links"><a href="#particle-atlas">Compare particles</a><a href="#sample-study">Examine a sample</a></div>
      </TankHero>
      <section id="search" className="motion-study-results" aria-live="polite">
        <h2>Try the search interaction</h2>
        <p>{submitted ? `Input preserved: “${query || '(empty)'}”. This isolated study makes no data request.` : 'This field study demonstrates the experience without requesting water records. Use Water search for the main application.'}</p>
      </section>
      <ParticleAtlas />
      <div id="specimen-study"><WaterNarrative contributeHref="/#submit" /></div>
    </main>
  )
}
