import Image from 'next/image'
import { rippleAssets } from '@/lib/ripple-assets'
import { ParticleStudyCounter } from './particle-study-counter'
import './water-narrative.css'

const researchSource = 'https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water'

export function WaterNarrative({ contributeHref = '#submit' }: { contributeHref?: string } = {}) {
  return <div className="water-narrative">
    <section id="sample-study" className="particle-stage" aria-labelledby="particle-title">
      <div className="narrative-inner sample-examination-layout">
        <figure className="sample-examination-art">
          <Image
            src={rippleAssets.sample.src}
            alt={rippleAssets.sample.alt}
            width={rippleAssets.sample.width}
            height={rippleAssets.sample.height}
            sizes="(max-width: 699px) 88vw, (max-width: 1199px) 36vw, 390px"
            loading="lazy"
          />
          <figcaption>Illustrated specimen slide and water bead. No laboratory result is shown.</figcaption>
        </figure>
        <div className="sample-examination-copy">
          <p className="narrative-label">From image to evidence</p>
          <h2 id="particle-title">Sample examination</h2>
          <p>Appearance is a starting point. Identifying a particle requires an analytical method and a result that can be traced to the sample.</p>
          <dl className="sample-record">
            <div><dt>Sample</dt><dd>Where the water came from and when it was collected.</dd></div>
            <div><dt>Method</dt><dd>How it was examined and what was measured.</dd></div>
            <div><dt>Result</dt><dd>The reported value, units, source, and limitations.</dd></div>
          </dl>
          <p className="sample-boundary">The illustrated bead has no measured particle count. The study below describes different samples.</p>
          <a className="narrative-link" href="#search">Return to water search <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </section>

    <section className="research-stage" aria-labelledby="siphon-title">
      <div className="narrative-inner">
        <div className="research-heading">
          <div>
            <p className="narrative-label">Research context</p>
            <h2 id="siphon-title">What the research establishes</h2>
          </div>
          <a className="narrative-link" href={researchSource} target="_blank" rel="noopener noreferrer">Read the NIH research summary <span aria-hidden="true">↗</span></a>
        </div>
        <div className="research-layout">
          <div className="research-finding">
            <h3 className="particle-study-title">Bottled-water study · 2024</h3>
            <ParticleStudyCounter />
            <p>The study examined three bottled-water brands. About 90% of the detected particles were nanoplastics.</p>
            <p className="research-context-note">A reported study average for micro- and nanoplastic particles. Concentrations varied across the tested samples.</p>
          </div>
          <div className="research-limits">
            <h3>What it does not establish</h3>
            <dl>
              <div><dt>Your water</dt><dd>This is not a measurement of your utility, the illustrated bottle, or the water bead above.</dd></div>
              <div><dt>Your exposure</dt><dd>A concentration in tested samples is not a personal ingestion count or a route through the body.</dd></div>
              <div><dt>Health effects</dt><dd>Detection alone does not establish a health outcome. Health implications remain under investigation.</dd></div>
            </dl>
          </div>
        </div>
      </div>
    </section>

    <section className="countermeasure-stage" aria-labelledby="countermeasure-title">
      <div className="narrative-inner countermeasure-layout">
        <div>
          <p className="narrative-label">Community observations</p>
          <h2 id="countermeasure-title">Contribute a reading</h2>
          <p className="countermeasure-intro">Have a water reading? Include the source, collection location, date, method, and units so someone else can understand the result.</p>
        </div>
        <div className="countermeasure-panel">
          <p>Contributions are labeled as citizen readings. A single reading is not a safety verdict.</p>
          <a className="countermeasure-action" href={contributeHref}>Contribute a reading <span aria-hidden="true">↗</span></a>
          <a className="narrative-link" href="#search">Explore existing water data <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </section>
  </div>
}
