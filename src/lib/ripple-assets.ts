import manifest from './ripple-asset-manifest.json'

/** The reviewed originals, optimized variants and provisional footage provenance. */
export const rippleAssetManifest = manifest

function still(original: string, alt: string) {
  const asset = manifest.assets.find((candidate) => candidate.original === original)
  if (!asset) throw new Error(`Missing reviewed Ripple artwork: ${original}`)
  return {
    ...asset,
    width: asset.sourceDimensions[0],
    height: asset.sourceDimensions[1],
    alt,
  }
}

export const rippleAssets = {
  master: still('01-particle-world-master.png', 'Illustrated translucent fragments, curved fibers and solid granules suspended in dark water'),
  fibers: still('02-fibers-card.png', 'Illustrated fine curved fibers suspended in dark water'),
  fragments: still('03-fragments-card.png', 'Illustrated irregular translucent fragments in dark water'),
  granules: still('04-granules-card.png', 'Illustrated solid granules at different depths'),
  sample: still('05-sample-study-panel.png', 'Illustrated glass specimen slide with a small water bead on a dark instrument stage'),
} as const

/** Timing proof only: its exact terminal poster does not match the master artwork. */
export const rippleSequence = {
  ...manifest.sequence,
  width: 1920,
  height: 1080,
  textRevealAtSeconds: 7.5,
} as const
