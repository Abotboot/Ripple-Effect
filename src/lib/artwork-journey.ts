/** User-approved microscope camera journey followed by the existing live artwork field. */
export const artworkJourney = {
  src: '/media/ripple/microscope/microscope-journey-v4.mp4',
  poster: '/media/ripple/microscope/opening-v4.png',
  terminalPoster: '/media/ripple/microscope/terminal-v4.png',
  width: 1280,
  height: 720,
  durationSeconds: 2.966016,
  // The live boundary is the approved video's actual decoded final lens-interior frame.
  // HTML reveals in the live phase, not at an arbitrary time inside the video.
  textRevealAtSeconds: Number.POSITIVE_INFINITY,
  entranceSeconds: 3.4,
  revealProgress: 0.72,
} as const

export type ArtworkCategory = 'all' | 'fibers' | 'fragments' | 'granules'
export type ArtworkPhase = 'idle' | 'video' | 'entering' | 'live'
