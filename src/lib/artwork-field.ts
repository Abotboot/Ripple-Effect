/** Interactive artwork made from the approved master. This is not a particle simulation. */
export type ArtworkCategory = 'all' | 'fibers' | 'fragments' | 'granules'
export type ArtworkPoint = Readonly<{ x: number; y: number }>
export interface ArtworkFrame {
  /** Elapsed animation seconds, supplied by the owner. Repeating inputs repeats pixels. */
  time: number
  /** Zero is the decoded boundary alone; one is the settled artwork. */
  entrance: number
  category: ArtworkCategory
  /** Canvas-relative coordinates in [0, 1], independent of device pixel ratio. */
  pointer: ArtworkPoint | null
  /** The owner supplies and decays strength; the renderer does not keep an impulse clock. */
  impulse?: ArtworkPoint & { strength: number }
}
export interface ArtworkRegion {
  id: string
  category: Exclude<ArtworkCategory, 'all'>
  /** A feathered crop of the master, normalized x/y/width/height. These are art annotations. */
  bounds: readonly [number, number, number, number]
  depth: number
}

/** Hand-selected regions in particle-world-master.webp, not detected or measured particles. */
export const ARTWORK_REGIONS: readonly ArtworkRegion[] = Object.freeze([
  { id: 'fiber-upper-blue', category: 'fibers', bounds: [0.569, 0.106, 0.140, 0.259], depth: 0.85 },
  { id: 'fiber-left-silver', category: 'fibers', bounds: [0.495, 0.461, 0.119, 0.205], depth: 0.75 },
  { id: 'fiber-lower-blue', category: 'fibers', bounds: [0.582, 0.708, 0.069, 0.200], depth: 0.90 },
  { id: 'fiber-upper-fine', category: 'fibers', bounds: [0.860, 0.081, 0.050, 0.238], depth: 0.45 },
  { id: 'fiber-right-blue', category: 'fibers', bounds: [0.875, 0.367, 0.057, 0.220], depth: 0.65 },
  { id: 'fiber-right-silver', category: 'fibers', bounds: [0.850, 0.583, 0.098, 0.282], depth: 0.85 },
  { id: 'fragment-upper-clear', category: 'fragments', bounds: [0.756, 0.218, 0.112, 0.203], depth: 1.00 },
  { id: 'fragment-blue', category: 'fragments', bounds: [0.754, 0.467, 0.088, 0.153], depth: 0.95 },
  { id: 'fragment-middle-clear', category: 'fragments', bounds: [0.564, 0.382, 0.057, 0.117], depth: 0.65 },
  { id: 'fragment-lower-clear', category: 'fragments', bounds: [0.689, 0.603, 0.096, 0.143], depth: 1.00 },
  { id: 'granule-center-pale', category: 'granules', bounds: [0.661, 0.558, 0.042, 0.064], depth: 1.00 },
  { id: 'granule-upper-cluster', category: 'granules', bounds: [0.598, 0.326, 0.043, 0.064], depth: 0.70 },
  { id: 'granule-middle-cluster', category: 'granules', bounds: [0.701, 0.396, 0.038, 0.065], depth: 0.65 },
  { id: 'granule-lower-cluster', category: 'granules', bounds: [0.821, 0.700, 0.054, 0.090], depth: 0.90 },
  { id: 'granule-upper-right', category: 'granules', bounds: [0.839, 0.128, 0.035, 0.053], depth: 0.50 },
  { id: 'granule-far-right', category: 'granules', bounds: [0.882, 0.298, 0.033, 0.060], depth: 0.45 },
  { id: 'granule-upper-pale', category: 'granules', bounds: [0.703, 0.188, 0.036, 0.066], depth: 0.40 },
])

export interface ArtworkDiagnostics {
  renderer: 'canvas2d-interactive-artwork'
  disposed: boolean
  regionCount: number
  backingWidth: number
  backingHeight: number
  effectiveDpr: number
  ownedCanvasCount: number
  approximateCacheBytes: number
  frameCount: number
  lastRenderMs: number
  maxRenderMs: number
  lastMaxDisplacementCssPx: number
  lastCameraScale: number
  lastRegionOffsets: ReadonlyArray<{ id: string; x: number; y: number }>
  lastEntrance: number
  lastCategory: ArtworkCategory
}
export interface ArtworkField {
  render(frame: ArtworkFrame): void
  resize(width: number, height: number, dpr: number): void
  getDiagnostics(): ArtworkDiagnostics
  dispose(): void
}

type Cover = { x: number; y: number; width: number; height: number; scale: number }
type Tile = { region: ArtworkRegion; x: number; y: number; width: number; height: number;
  normal: HTMLCanvasElement; dimmed: HTMLCanvasElement; phaseX: number; phaseY: number }
const DIM = 0.40
const TWO_PI = Math.PI * 2
const clamp = (value: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, value))
const smooth = (value: number) => value * value * (3 - 2 * value)

/** Shared camera/opacity easing; first and second derivatives are zero at both ends. */
export function getArtworkEntrance(entrance: number) {
  const t = clamp(finite(entrance, 'entrance'), 0, 1)
  const progress = t * t * t * (t * (t * 6 - 15) + 10)
  return { opacity: progress, cameraScale: 0.94 + 0.06 * progress, inwardMix: 1 - progress }
}

function finite(value: number, name: string): number {
  if (!Number.isFinite(value)) throw new TypeError(`${name} must be finite`)
  return value
}
function checkPoint(point: ArtworkPoint, name: string) {
  for (const key of ['x', 'y'] as const) {
    if (finite(point[key], `${name}.${key}`) < 0 || point[key] > 1) {
      throw new RangeError(`${name}.${key} must be between zero and one`)
    }
  }
}
function cover(sourceWidth: number, sourceHeight: number, width: number, height: number, focalX = 0.5): Cover {
  const scale = Math.max(width / sourceWidth, height / sourceHeight)
  const drawWidth = sourceWidth * scale
  const drawHeight = sourceHeight * scale
  return { x: clamp(width / 2 - drawWidth * focalX, width - drawWidth, 0),
    y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight, scale }
}
function seeded(index: number, salt: number) {
  let value = Math.imul(index + 17329, 1664525) + salt
  value = Math.imul(value ^ (value >>> 16), 2246822507)
  return ((value ^ (value >>> 13)) >>> 0) / 4294967296
}

/**
 * No network, timers, event listeners, React state or requestAnimationFrame are created here.
 * The caller must decode both same-origin images before construction and own their lifecycle.
 * Boundary uses centered cover. Portrait artwork centers the existing particle area at x=.755.
 */
export function createArtworkField(canvas: HTMLCanvasElement, images: {
  master: HTMLImageElement
  boundary: HTMLImageElement
}): ArtworkField {
  const document = canvas.ownerDocument
  if (!document || typeof canvas.getContext !== 'function') throw new TypeError('An HTML canvas is required')
  for (const [name, image] of Object.entries(images)) {
    if (!image?.complete || !image.naturalWidth || !image.naturalHeight) {
      throw new TypeError(`${name} must be a decoded image`)
    }
  }
  let master: HTMLImageElement | null = images.master
  let boundary: HTMLImageElement | null = images.boundary
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Canvas2D is unavailable')
  const owned: HTMLCanvasElement[] = []
  const makeCanvas = (width: number, height: number) => {
    const result = document.createElement('canvas')
    result.width = width
    result.height = height
    owned.push(result)
    const ctx = result.getContext('2d')
    if (!ctx) throw new Error('Canvas2D cache is unavailable')
    return { canvas: result, context: ctx }
  }
  const sourceWidth = master.naturalWidth
  const sourceHeight = master.naturalHeight
  let tiles: Tile[] = []
  let field: ReturnType<typeof makeCanvas>
  try {
    // Feather only the surrounding water. The original fine edges are inside the opaque center.
    tiles = ARTWORK_REGIONS.map((region, index) => {
      const [u, v, w, h] = region.bounds
      const x = Math.floor(u * sourceWidth)
      const y = Math.floor(v * sourceHeight)
      const width = Math.min(sourceWidth - x, Math.ceil(w * sourceWidth))
      const height = Math.min(sourceHeight - y, Math.ceil(h * sourceHeight))
      const normal = makeCanvas(width, height)
      normal.context.drawImage(master!, x, y, width, height, 0, 0, width, height)
      normal.context.globalCompositeOperation = 'destination-in'
      for (const vertical of [false, true]) {
        const gradient = normal.context.createLinearGradient(0, 0, vertical ? 0 : width, vertical ? height : 0)
        gradient.addColorStop(0, 'rgba(0,0,0,0)')
        gradient.addColorStop(0.12, '#000')
        gradient.addColorStop(0.88, '#000')
        gradient.addColorStop(1, 'rgba(0,0,0,0)')
        normal.context.fillStyle = gradient
        normal.context.fillRect(0, 0, width, height)
      }
      normal.context.globalCompositeOperation = 'source-over'
      const dimmed = makeCanvas(width, height)
      dimmed.context.drawImage(normal.canvas, 0, 0)
      dimmed.context.globalCompositeOperation = 'source-atop'
      dimmed.context.fillStyle = `rgba(0,0,0,${1 - DIM})`
      dimmed.context.fillRect(0, 0, width, height)
      dimmed.context.globalCompositeOperation = 'source-over'
      return { region, x, y, width, height, normal: normal.canvas, dimmed: dimmed.canvas,
        phaseX: seeded(index, 1013904223) * TWO_PI, phaseY: seeded(index, 374761393) * TWO_PI }
    })
    field = makeCanvas(1, 1)
  } catch (error) {
    for (const resource of owned) { resource.width = 0; resource.height = 0 }
    throw error
  }

  let width = 1
  let height = 1
  let dpr = 1
  let disposed = false
  let frameCount = 0
  let lastRenderMs = 0
  let maxRenderMs = 0
  let lastMaxDisplacementCssPx = 0
  let lastCameraScale = 1
  let lastRegionOffsets: Array<{ id: string; x: number; y: number }> = []
  let lastEntrance = 0
  let lastCategory: ArtworkCategory = 'all'
  const alive = () => { if (disposed) throw new Error('Artwork field is disposed') }

  function resize(nextWidth: number, nextHeight: number, nextDpr: number) {
    alive()
    if (finite(nextWidth, 'width') <= 0 || finite(nextHeight, 'height') <= 0 || finite(nextDpr, 'dpr') <= 0) {
      throw new RangeError('Width, height and dpr must be positive')
    }
    width = nextWidth
    height = nextHeight
    dpr = Math.min(nextDpr, 2, 4096 / Math.max(width, height), Math.sqrt(8388608 / (width * height)))
    const backingWidth = Math.max(1, Math.round(width * dpr))
    const backingHeight = Math.max(1, Math.round(height * dpr))
    if (canvas.width !== backingWidth || canvas.height !== backingHeight) {
      canvas.width = backingWidth
      canvas.height = backingHeight
    }
    if (field.canvas.width !== backingWidth || field.canvas.height !== backingHeight) {
      field.canvas.width = backingWidth
      field.canvas.height = backingHeight
    }
    // The owner controls CSS size; only the backing store is changed.
  }

  function render(frame: ArtworkFrame) {
    alive()
    if (finite(frame.time, 'time') < 0) throw new RangeError('time must not be negative')
    const entrance = clamp(finite(frame.entrance, 'entrance'), 0, 1)
    if (!['all', 'fibers', 'fragments', 'granules'].includes(frame.category)) throw new TypeError('Unknown artwork category')
    if (frame.pointer) checkPoint(frame.pointer, 'pointer')
    if (frame.impulse) { checkPoint(frame.impulse, 'impulse'); finite(frame.impulse.strength, 'impulse.strength') }
    const started = performance.now()
    context!.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
    context!.globalAlpha = 1
    context!.globalCompositeOperation = 'source-over'
    context!.imageSmoothingEnabled = true
    context!.imageSmoothingQuality = 'high'
    // A previous translucent entrance must never contribute to a later exact boundary draw.
    context!.clearRect(0, 0, width, height)
    lastMaxDisplacementCssPx = 0
    lastRegionOffsets = []
    const transition = getArtworkEntrance(entrance)
    lastCameraScale = transition.cameraScale

    // This branch must stay free of all artwork, fades, dimming, interaction and motion.
    if (entrance === 0) {
      const fit = cover(boundary!.naturalWidth, boundary!.naturalHeight, width, height)
      context!.drawImage(boundary!, fit.x, fit.y, fit.width, fit.height)
    } else {
      const art = field.context
      art.setTransform(canvas.width / width, 0, 0, canvas.height / height, 0, 0)
      art.globalAlpha = 1
      art.globalCompositeOperation = 'source-over'
      art.imageSmoothingEnabled = true
      art.imageSmoothingQuality = 'high'
      // The small entrance pullback exposes the edge of the image. Clear those borders each frame.
      art.fillStyle = '#010608'
      art.fillRect(0, 0, width, height)
      const portraitMix = smooth(clamp((1.4 - width / height) / 0.6, 0, 1))
      const fit = cover(sourceWidth, sourceHeight, width, height, 0.5 + 0.255 * portraitMix)
      const cameraScale = transition.cameraScale
      fit.x += fit.width * 0.74 * (1 - cameraScale)
      fit.y += fit.height * 0.48 * (1 - cameraScale)
      fit.width *= cameraScale
      fit.height *= cameraScale
      fit.scale *= cameraScale
      art.drawImage(master!, fit.x, fit.y, fit.width, fit.height)
      if (frame.category !== 'all') {
        art.fillStyle = `rgba(0,0,0,${1 - DIM})`
        art.fillRect(0, 0, width, height)
      }
      const locate = (point: ArtworkPoint) => ({ x: (point.x * width - fit.x) / fit.scale,
        y: (point.y * height - fit.y) / fit.scale })
      const pointer = frame.pointer ? locate(frame.pointer) : null
      const impulse = frame.impulse ? locate(frame.impulse) : null
      const motionMix = transition.opacity
      for (const tile of tiles) {
        const { region, phaseX, phaseY } = tile
        const centerX = tile.x + tile.width / 2
        const centerY = tile.y + tile.height / 2
        const amplitude = sourceWidth * 0.0013 * region.depth
        let dx = (Math.sin(frame.time * 0.23 + phaseX) - Math.sin(phaseX)) * amplitude
        let dy = (Math.cos(frame.time * 0.19 + phaseY) - Math.cos(phaseY)) * amplitude * 0.72
        const displace = (point: { x: number; y: number }, strength: number, radius: number) => {
          const vx = centerX - point.x
          const vy = centerY - point.y
          const distance = Math.hypot(vx, vy)
          const weight = smooth(clamp(1 - distance / radius, 0, 1))
          const directionX = distance > 0.01 ? vx / distance : Math.cos(phaseX)
          const directionY = distance > 0.01 ? vy / distance : Math.sin(phaseY)
          dx += directionX * strength * weight * region.depth
          dy += directionY * strength * weight * region.depth
        }
        if (pointer) displace(pointer, sourceWidth * 0.0055, sourceWidth * 0.22)
        if (impulse) displace(impulse, sourceWidth * 0.010 * clamp(frame.impulse!.strength, 0, 1), sourceWidth * 0.33)
        // A small bound keeps the unshifted subject covered by its own opaque patch interior.
        const limit = Math.min(sourceWidth * 0.012, Math.min(tile.width, tile.height) * 0.09)
        const inward = transition.inwardMix * 0.032 * region.depth
        dx = clamp(dx * motionMix + (sourceWidth * 0.74 - centerX) * inward, -limit, limit)
        dy = clamp(dy * motionMix + (sourceHeight * 0.48 - centerY) * inward, -limit, limit)
        lastMaxDisplacementCssPx = Math.max(lastMaxDisplacementCssPx, Math.hypot(dx, dy) * fit.scale)
        lastRegionOffsets.push({ id: region.id, x: dx, y: dy })
        const selected = frame.category === 'all' || frame.category === region.category
        // At rest, drawing the original alone avoids rounding from redundant alpha composites.
        if (dx === 0 && dy === 0 && frame.category === 'all') continue
        const image = selected ? tile.normal : tile.dimmed
        art.drawImage(image, fit.x + (tile.x + dx) * fit.scale, fit.y + (tile.y + dy) * fit.scale,
          tile.width * fit.scale, tile.height * fit.scale)
      }
      if (entrance < 1) {
        const boundaryFit = cover(boundary!.naturalWidth, boundary!.naturalHeight, width, height)
        context!.drawImage(boundary!, boundaryFit.x, boundaryFit.y, boundaryFit.width, boundaryFit.height)
      }
      context!.globalAlpha = transition.opacity
      context!.drawImage(field.canvas, 0, 0, width, height)
      context!.globalAlpha = 1
    }
    frameCount += 1
    lastEntrance = entrance
    lastCategory = frame.category
    lastRenderMs = performance.now() - started
    maxRenderMs = Math.max(maxRenderMs, lastRenderMs)
  }

  function dispose() {
    if (disposed) return
    disposed = true
    for (const resource of owned) { resource.width = 0; resource.height = 0 }
    owned.length = 0
    tiles.length = 0
    lastRegionOffsets = []
    master = null
    boundary = null
    context!.setTransform(1, 0, 0, 1, 0, 0)
    context!.clearRect(0, 0, canvas.width, canvas.height)
  }

  try { resize(canvas.clientWidth || canvas.width || 1, canvas.clientHeight || canvas.height || 1, 1) }
  catch (error) { dispose(); throw error }
  return {
    render, resize, dispose,
    getDiagnostics: () => ({ renderer: 'canvas2d-interactive-artwork', disposed,
      regionCount: tiles.length, backingWidth: canvas.width, backingHeight: canvas.height, effectiveDpr: dpr,
      ownedCanvasCount: owned.length, approximateCacheBytes: owned.reduce((sum, resource) => sum + resource.width * resource.height * 4, 0),
      frameCount, lastRenderMs, maxRenderMs, lastMaxDisplacementCssPx, lastCameraScale,
      lastRegionOffsets: lastRegionOffsets.map(offset => ({ ...offset })), lastEntrance, lastCategory }),
  }
}
