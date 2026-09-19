/** Refined microscope camera illustration followed by the existing live artwork field. */
export const artworkJourney = {
  src: '/media/ripple/microscope/microscope-journey.mp4',
  poster: '/media/ripple/microscope/opening.webp',
  terminalPoster: '/media/ripple/microscope/terminal.webp',
  width: 1920,
  height: 1080,
  durationSeconds: 5,
  // The edited camera study ends in exact optical black. HTML reveals in the live phase,
  // not at an arbitrary time inside the video or from a second encoded scene.
  textRevealAtSeconds: Number.POSITIVE_INFINITY,
  entranceSeconds: 3.4,
  revealProgress: 0.72,
} as const

export type ArtworkCategory = 'all' | 'fibers' | 'fragments' | 'granules'
export type ArtworkPhase = 'idle' | 'video' | 'entering' | 'live'
