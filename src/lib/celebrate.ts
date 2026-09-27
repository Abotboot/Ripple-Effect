// A short burst of water droplets when someone contributes (a reading or a
// report). Uses canvas-confetti (github.com/catdad/canvas-confetti, ISC) with a
// droplet-shaped path instead of paper squares. It is loaded only when it
// fires, draws on one temporary canvas that is removed when the drops settle,
// and does nothing for Reduce Motion.

const DROP = 'M5 0C5 0 0 6.2 0 9.5A5 5 0 0 0 10 9.5C10 6.2 5 0 5 0Z'
const COLOURS = ['#1df2b3', '#8fd3ff', '#b7f5dc', '#e9fff7', '#4fd1c5']

export async function celebrate(from?: Element | null) {
  if (typeof window === 'undefined' || matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const { default: confetti } = await import('canvas-confetti')
  const rect = from?.getBoundingClientRect()
  const origin = rect
    ? { x: (rect.left + rect.width / 2) / innerWidth, y: (rect.top + rect.height / 2) / innerHeight }
    : { x: 0.5, y: 0.45 }
  const drop = confetti.shapeFromPath({ path: DROP })
  const shared = { origin, shapes: [drop], colors: COLOURS, disableForReducedMotion: true, zIndex: 80, ticks: 160, gravity: 1.1, decay: 0.92 }
  // A tall splash straight up, then a wider, lower spray.
  void confetti({ ...shared, particleCount: 34, spread: 38, startVelocity: 34, scalar: 1.1 })
  void confetti({ ...shared, particleCount: 26, spread: 110, startVelocity: 22, scalar: 0.8 })
}
