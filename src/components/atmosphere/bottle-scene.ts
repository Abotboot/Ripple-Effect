export type SpecimenForm = 'all' | 'fibers' | 'fragments'
export type SpecimenPosition = { x: number; y: number }
export type SpecimenView = {
  uv: boolean
  position: SpecimenPosition
  zoom: number
  form: SpecimenForm
  paused: boolean
  reducedMotion: boolean
}

const clamp = (value: number, low: number, high: number) => Math.max(low, Math.min(high, value))

/** Normalized square crop of the single bottle image, also used by the locator. */
export function specimenCrop(position: SpecimenPosition, zoom: number) {
  const width = 1 / clamp(zoom, 2, 4)
  const height = width * 1122 / 1402
  return {
    x: clamp(position.x - width / 2, 0, 1 - width),
    y: clamp(position.y - height / 2, 0, 1 - height),
    width,
    height,
  }
}

// These tiny authored marks exist only in the enlarged, explicitly illustrative
// detail. They are never put on the full bottle and never extracted from it.
const forms = Array.from({ length: 12 }, (_, index) => ({
  x: .22 + ((index * 37) % 57) / 100,
  y: .15 + ((index * 29) % 70) / 100,
  fiber: index % 3 === 0,
  phase: index * 2.39996,
  size: .008 + (index % 4) * .0018,
}))

export function createBottleScene(canvas: HTMLCanvasElement, image: HTMLImageElement, onFailure: () => void) {
  const context = canvas.getContext('2d', { alpha: false })
  if (!context) throw new Error('Canvas detail is unavailable')
  delete canvas.dataset.disposed
  canvas.dataset.running = 'false'
  let view: SpecimenView = { uv: false, position: { x: .5, y: .26 }, zoom: 3, form: 'all', paused: false, reducedMotion: false }
  let visible = false, disposed = false, frame: number | undefined
  let lastFrame = 0, elapsed = 0, scanProgress = 1, renderedFrames = 0
  let width = 0, height = 0, dpr = 1

  const state = () => {
    canvas.dataset.motion = !visible ? 'offscreen' : view.reducedMotion ? 'reduced-motion' : view.paused ? 'paused' : view.uv ? 'active' : 'idle'
  }
  const cancel = () => {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined; lastFrame = 0; canvas.dataset.running = 'false'
  }
  const render = () => {
    if (disposed || !visible || !image.complete || !image.naturalWidth) return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const nextDpr = Math.min(window.devicePixelRatio || 1, 2)
    if (bounds.width !== width || bounds.height !== height || nextDpr !== dpr) {
      width = bounds.width; height = bounds.height; dpr = nextDpr
      canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr)
    }
    const c = context
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.globalAlpha = 1
    c.fillStyle = '#f8f8f6'; c.fillRect(0, 0, width, height)
    const crop = specimenCrop(view.position, view.zoom)
    c.drawImage(image, crop.x * image.naturalWidth, crop.y * image.naturalHeight, crop.width * image.naturalWidth, crop.height * image.naturalHeight, 0, 0, width, height)

    let visibleForms = 0
    if (view.uv) {
      // Keep a faint view of the same crop behind an editorial overlay. The
      // persistent HTML label makes clear that this is not a UV scan result.
      c.fillStyle = 'rgba(10,22,25,.90)'; c.fillRect(0, 0, width, height)
      const field = c.createRadialGradient(width * .62, height * .36, 0, width * .5, height * .5, width * .72)
      field.addColorStop(0, 'rgba(112,151,142,.10)'); field.addColorStop(1, 'rgba(7,17,19,0)')
      c.fillStyle = field; c.fillRect(0, 0, width, height)
      c.save(); c.beginPath(); c.rect(width * .09, height * .08, width * .82, height * .84); c.clip()
      for (const item of forms) {
        if (view.form !== 'all' && view.form !== (item.fiber ? 'fibers' : 'fragments')) continue
        const alpha = scanProgress < 1 ? clamp((scanProgress - item.y) * 10 + .2, 0, 1) : 1
        if (!alpha) continue
        visibleForms++
        const x = (item.x + Math.sin(elapsed * .13 + item.phase) * .0025) * width
        const y = (item.y + Math.cos(elapsed * .10 + item.phase) * .002) * height
        const size = item.size * Math.min(width, height)
        c.save(); c.translate(x, y); c.rotate(item.phase + Math.sin(elapsed * .14 + item.phase) * .035)
        c.globalAlpha = alpha * (.62 + (item.phase % 1) * .28)
        if (item.fiber) {
          c.strokeStyle = '#c0d8cc'; c.lineWidth = Math.max(.75, width / 480)
          c.beginPath(); c.moveTo(-size * .85, -size * .15)
          c.bezierCurveTo(-size * .30, -size * .55, size * .30, size * .5, size * .9, size * .10)
          c.stroke()
        } else {
          c.fillStyle = 'rgba(217,224,211,.50)'; c.strokeStyle = '#c8d9d0'; c.lineWidth = .6
          c.beginPath(); c.moveTo(-size * .26, -size * .32); c.lineTo(size * .34, -size * .18)
          c.lineTo(size * .23, size * .26); c.lineTo(-size * .18, size * .38); c.lineTo(-size * .36, size * .06)
          c.closePath(); c.fill(); c.stroke()
        }
        c.restore()
      }
      if (scanProgress < 1) {
        const y = scanProgress * height
        c.globalAlpha = Math.sin(scanProgress * Math.PI) * .38
        const band = c.createLinearGradient(0, y - 16, 0, y + 3)
        band.addColorStop(0, 'rgba(169,205,196,0)'); band.addColorStop(1, 'rgba(169,205,196,.28)')
        c.fillStyle = band; c.fillRect(width * .09, y - 16, width * .82, 19)
        c.strokeStyle = '#a9cdc4'; c.lineWidth = .7; c.beginPath(); c.moveTo(width * .09, y); c.lineTo(width * .91, y); c.stroke()
      }
      c.restore()
    }
    c.globalAlpha = 1
    canvas.dataset.renderer = 'photo-canvas'
    canvas.dataset.rendered = view.uv ? 'uv' : 'macro'
    canvas.dataset.form = view.form
    canvas.dataset.visibleForms = String(visibleForms)
    canvas.dataset.zoom = String(view.zoom)
    canvas.dataset.position = `${view.position.x.toFixed(3)},${view.position.y.toFixed(3)}`
    canvas.dataset.crop = JSON.stringify(crop)
    canvas.dataset.transition = view.uv && scanProgress < 1 ? 'scanning' : 'settled'
    canvas.dataset.scanProgress = scanProgress.toFixed(3)
    canvas.dataset.renderCount = String(++renderedFrames)
    state()
  }
  const request = () => {
    if (disposed || !visible || frame !== undefined) return
    canvas.dataset.running = 'true'; frame = requestAnimationFrame(tick)
  }
  const tick = (now: number) => {
    frame = undefined
    if (disposed || !visible) { cancel(); return }
    // Motion is bounded to this small detail window. Macro, pause and reduced
    // motion draw only when needed; hidden/offscreen views request no frames.
    if (lastFrame && now - lastFrame < 50) { request(); return }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .06) : 1 / 25
    lastFrame = now
    if (!view.paused && !view.reducedMotion && view.uv) {
      elapsed += dt; scanProgress = Math.min(1, scanProgress + dt / 1.35)
    }
    try { render() } catch { cancel(); onFailure(); return }
    if (view.uv && !view.paused && !view.reducedMotion) request()
    else { canvas.dataset.running = 'false'; lastFrame = 0 }
  }
  const resize = new ResizeObserver(request)
  resize.observe(canvas)
  return {
    update(next: SpecimenView) {
      if (disposed) return
      const changed = next.uv !== view.uv || next.form !== view.form || next.zoom !== view.zoom || next.position.x !== view.position.x || next.position.y !== view.position.y
      if (next.uv && !view.uv) scanProgress = 0
      view = next
      if (view.reducedMotion || (view.paused && changed)) scanProgress = 1
      if (view.paused || view.reducedMotion || !view.uv) cancel()
      state(); request()
    },
    setVisible(next: boolean) {
      if (disposed || visible === next) return
      visible = next
      if (visible) request(); else cancel()
      state()
    },
    scan() {
      if (disposed || !view.uv || view.paused || view.reducedMotion) return
      scanProgress = 0; request()
    },
    dispose() {
      if (disposed) return
      disposed = true; visible = false; cancel(); resize.disconnect(); canvas.dataset.disposed = 'true'
    },
  }
}

export type BottleScene = ReturnType<typeof createBottleScene>
