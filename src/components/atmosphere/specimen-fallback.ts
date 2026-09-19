import type { BottleScene, SpecimenForm } from './bottle-scene'

// Explicitly static 2D fallback. Rotation is disabled in the accompanying UI;
// this does not pretend that scaling a still image is a 3D view.
export function createSpecimenFallback(canvas: HTMLCanvasElement): BottleScene {
  const context = canvas.getContext('2d')
  let visible = false, disposed = false, uv = false, form: SpecimenForm = 'all', frames = 0
  const outline = new Path2D('M -24 -143 L 24 -143 L 24 -124 C 24 -109 56 -104 62 -69 L 63 124 Q 63 147 43 150 L -43 150 Q -63 147 -63 124 L -62 -69 C -56 -104 -24 -109 -24 -124 Z')
  const draw = () => {
    if (!context || !visible || disposed) return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    const dpr = Math.min(devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(bounds.width * dpr); canvas.height = Math.round(bounds.height * dpr)
    const c = context
    c.setTransform(dpr, 0, 0, dpr, 0, 0)
    c.fillStyle = '#111719'; c.fillRect(0, 0, bounds.width, bounds.height)
    const scale = Math.min(bounds.height / 380, bounds.width / 220)
    c.translate(bounds.width / 2, bounds.height / 2 + 8); c.scale(scale, scale)
    const glass = c.createLinearGradient(-63, 0, 63, 0)
    glass.addColorStop(0, '#8ca9a180'); glass.addColorStop(.08, '#bcc8bf35'); glass.addColorStop(.3, '#bdd0c208'); glass.addColorStop(.85, '#aac5bc10'); glass.addColorStop(1, '#9dbfb56b')
    c.fillStyle = glass; c.fill(outline); c.strokeStyle = '#bed1c073'; c.lineWidth = .9; c.stroke(outline)
    c.save(); c.clip(outline)
    for (const y of [-61, -48, -35, 94, 107, 120]) {
      c.strokeStyle = '#b9c8c44a'; c.lineWidth = .7; c.beginPath(); c.ellipse(0, y, 63, 4, 0, 0, Math.PI * 2); c.stroke()
    }
    if (uv) for (let i = 0; i < 26; i++) {
      const fiber = i % 3 === 0
      if (form !== 'all' && form !== (fiber ? 'fibers' : 'fragments')) continue
      const x = Math.sin(i * 2.39996) * (15 + i % 29), y = -72 + (i * 47) % 194
      c.strokeStyle = '#b7cebe'; c.fillStyle = '#cdd3bf'; c.lineWidth = .9
      c.beginPath()
      if (fiber) { c.moveTo(x - 1, y - 5); c.bezierCurveTo(x + 3, y - 1, x - 3, y + 2, x + 1, y + 6); c.stroke() }
      else { c.moveTo(x - 2, y); c.lineTo(x, y - 2); c.lineTo(x + 2, y + 1); c.lineTo(x - 1, y + 2); c.closePath(); c.fill() }
    }
    if (!uv) { c.fillStyle = '#d7dbd0'; c.fillRect(-64, 14, 128, 41); c.fillStyle = '#23382e'; c.font = '12px sans-serif'; c.textAlign = 'center'; c.fillText('WATER', 0, 33); c.font = '6px sans-serif'; c.fillText('ILLUSTRATED SPECIMEN', 0, 45) }
    c.restore()
    c.fillStyle = '#d7d9cf'; c.fillRect(-27, -165, 54, 23); c.fillRect(-25, -139, 50, 4)
    c.strokeStyle = '#a1aea45c'; c.lineWidth = .6
    for (let x = -24; x <= 24; x += 3) { c.beginPath(); c.moveTo(x, -162); c.lineTo(x, -145); c.stroke() }
    canvas.dataset.rendered = uv ? 'uv' : 'macro'; canvas.dataset.renderer = '2d-fallback'
    canvas.dataset.angle = '0'; canvas.dataset.form = form; canvas.dataset.transition = 'settled'
    canvas.dataset.running = 'false'; canvas.dataset.motion = 'static-fallback'; canvas.dataset.renderCount = String(++frames)
  }
  const observer = new ResizeObserver(draw)
  observer.observe(canvas)
  return {
    update(nextUv, _angle, motion) { uv = nextUv; form = motion.form; draw() },
    setVisible(next) { visible = next; draw() },
    scan() { /* No animation in the static fallback. */ },
    dispose() { disposed = true; observer.disconnect(); canvas.dataset.disposed = 'true' },
  }
}
