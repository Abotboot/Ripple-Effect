/** Approved microscope source followed by a live, artwork-based continuation. */
export const artworkJourney = {
  src: '/media/ripple/live/microscope-original.mp4',
  poster: '/media/ripple/live/microscope-opening.webp',
  terminalPoster: '/media/ripple/live/microscope-terminal.webp',
  width: 1920,
  height: 1080,
  durationSeconds: 5,
  // The original shot ends in optical darkness. HTML reveals in the live phase,
  // not at an arbitrary time inside the video or from a second encoded scene.
  textRevealAtSeconds: Number.POSITIVE_INFINITY,
  entranceSeconds: 3.4,
  revealProgress: 0.72,
} as const

export type ArtworkCategory = 'all' | 'fibers' | 'fragments' | 'granules'
export type ArtworkPhase = 'idle' | 'video' | 'entering' | 'live'
