import Image from 'next/image'
import { particlePhotographs } from '@/lib/particle-photographs'
import { PhotographCredit } from '../sections/photograph-credit'
import { ParticleStudyCounter } from './particle-study-counter'
import './water-narrative.css'

const researchSource = 'https://www.nih.gov/news-events/nih-research-matters/plastic-particles-bottled-water'

export function WaterNarrative({ contributeHref = '#submit', onMethodology, showResearch = true }: {
  contributeHref?: string
  onMethodology?: () => void
  /** Hidden where the bottle story already tells the same study. */
  showResearch?: boolean
} = {}) {
  return <div className="water-narrative">
    <section id="sample-study" className="particle-stage" aria-labelledby="particle-title">
      <div className="narrative-inner sample-examination-layout">
        <figure className="sample-examination-art">
          <Image
            src="/media/ripple/photo-cutouts/microscope-detail.webp"
            alt="Close-up of a Raman microscope objective and sample stage"
            width={960}
            height={1200}
            sizes="(max-width: 699px) 88vw, (max-width: 1199px) 36vw, 390px"
            loading="lazy"
            unoptimized
          />
          <figcaption>Raman microscope.<br /><PhotographCredit photo={particlePhotographs.sample} /></figcaption>
        </figure>
        <div className="sample-examination-copy">
          <p className="narrative-label">From image to evidence</p>
          <h2 id="particle-title">Sample examination</h2>
          <p>A useful result connects a sample, a method and a source.</p>
          <dl className="sample-record">
            <div><dt>Sample</dt><dd>Where the water came from and when it was collected.</dd></div>
            <div><dt>Method</dt><dd>How it was examined and what was measured.</dd></div>
            <div><dt>Result</dt><dd>The reported value, units, source, and limitations.</dd></div>
          </dl>
          {onMethodology && <button type="button" className="narrative-link" onClick={onMethodology}>Methodology &amp; sources <span aria-hidden="true">↗</span></button>}
          <a className="narrative-link" href="#search">Return to water search <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </section>

    {showResearch && <section className="research-stage" aria-labelledby="siphon-title">
      <div className="narrative-inner">
        <div className="research-heading">
          <div>
            <p className="narrative-label">Research context</p>
            <h2 id="siphon-title">Inside a bottled-water study</h2>
          </div>
          <a className="narrative-link" href={researchSource} target="_blank" rel="noopener noreferrer">Read the NIH research summary <span aria-hidden="true">↗</span></a>
        </div>
        <div className="research-layout">
          <div className="research-finding">
            <h3 className="particle-study-title">Bottled-water study · 2024</h3>
            <ParticleStudyCounter />
            <p>The study examined three bottled-water brands. About 90% of the detected particles were nanoplastics.</p>
          </div>
          <div className="research-limits">
            <h3>Study scope</h3>
            <p>This average describes the tested brands, not your water. Particle counts varied; health effects remain under investigation.</p>
          </div>
        </div>
      </div>
    </section>}

    <section className="countermeasure-stage" aria-labelledby="countermeasure-title">
      <div className="narrative-inner countermeasure-layout">
        <div>
          <p className="narrative-label">Community observations</p>
          <h2 id="countermeasure-title">Contribute a reading</h2>
          <p className="countermeasure-intro">Have a water reading? Include the source, collection location, date, method, and units so someone else can understand the result.</p>
        </div>
        <div className="countermeasure-panel">
          <p>Citizen readings stay separate from reviewed utility measurements.</p>
          <a className="countermeasure-action" href={contributeHref}>Contribute a reading <span aria-hidden="true">↗</span></a>
          <a className="narrative-link" href="#search">Explore existing water data <span aria-hidden="true">↑</span></a>
        </div>
      </div>
    </section>
  </div>
}
