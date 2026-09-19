/** User-approved microscope camera journey followed by the existing live artwork field. */
export const artworkJourney = {
  src: '/media/ripple/microscope/microscope-journey-v4.mp4',
  poster: '/media/ripple/microscope/opening-v4.png',
  terminalPoster: '/media/ripple/microscope/terminal-v4.png',
  width: 1280,
  height: 720,
  durationSeconds: 2.966016,
  // Hold the decoded lens frame at its original framing, then dissolve to the
  // artwork. HTML reveals after this handoff, never on top of a stuck lens.
  textRevealAtSeconds: Number.POSITIVE_INFINITY,
} as const

export type ArtworkCategory = 'all' | 'fibers' | 'fragments' | 'granules'
export type ArtworkPhase = 'idle' | 'video' | 'entering' | 'live'
