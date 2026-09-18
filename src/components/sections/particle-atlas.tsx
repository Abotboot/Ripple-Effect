import Image from 'next/image'
import { rippleAssets } from '@/lib/ripple-assets'
import styles from './particle-atlas.module.css'

const categories = [
  { title: 'Fibers', description: 'Fine, thread-like forms.', asset: rippleAssets.fibers },
  { title: 'Fragments', description: 'Irregular flakes and chips.', asset: rippleAssets.fragments },
  { title: 'Granules', description: 'Small, rounded pieces.', asset: rippleAssets.granules },
]

export function ParticleAtlas() {
  return (
    <section className={styles.atlas} aria-labelledby="particle-atlas-title">
      <div className={styles.inner}>
        <div className={styles.heading}>
          <div>
            <p className={styles.eyebrow}>A closer look / illustrated forms</p>
            <h2 id="particle-atlas-title">A particle atlas.</h2>
          </div>
          <a className={styles.link} href="#specimen-study">Explore the interactive specimen study <span aria-hidden="true">↓</span></a>
        </div>
        <div className={styles.grid}>
          {categories.map(({ title, description, asset }) => (
            <figure className={styles.card} key={title}>
              <Image
                src={asset.src}
                alt={asset.alt}
                width={asset.width}
                height={asset.height}
                sizes="(max-width: 699px) 88vw, (max-width: 1399px) 28vw, 390px"
                loading="lazy"
              />
              <figcaption>
                <h3>{title}</h3>
                <p>{description}</p>
              </figcaption>
            </figure>
          ))}
        </div>
        <p className={styles.note}>Illustrations, not measured samples. Appearance alone does not confirm material.</p>
      </div>
    </section>
  )
}
