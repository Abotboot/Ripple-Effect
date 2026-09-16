/**
 * Specimen particle simulation for The Tank.
 * Pure logic, no DOM. Consumed by tank-canvas.tsx.
 *
 * Particles are suspended microplastics:
 *  - fiber   : wavy synthetic line (PET / nylon) — toxin colors
 *  - fragment: irregular shard (polypropylene)   — glass cyan
 *  - pellet  : near-sphere (nurdle)              — biolume
 *  - bead    : microbead, brightest              — biolume core
 */

export type ParticleKind = 'fiber' | 'fragment' | 'pellet' | 'bead'

export interface Particle {
  kind: ParticleKind
  x: number
  y: number
  vx: number
  vy: number
  /** depth layer 0 (far) .. 1 (near) — drives parallax + alpha + size */
  depth: number
  /** base radius / half-length in px */
  size: number
  /** facing angle (radians) */
  rot: number
  rotV: number
  /** Brownian phase seeds */
  seedA: number
  seedB: number
  seedC: number
  /** stroke/fill color */
  color: string
  /** transient excitation from cursor force 0..1 */
  agit: number
}

export interface TankOptions {
  width: number
  height: number
  /** cursor position in canvas space */
  cx: number
  cy: number
  /** cursor speed px/frame (velocity magnitude, smoothed) */
  cursorSpeed: number
  time: number
  /** Elapsed time in 60 Hz frames; clamped after tab suspension. */
  delta?: number
  /** multiplier applied to cursor repulsion radius */
  repulsionScale?: number
}

const TOXIN_COLORS = ['rgba(255, 42, 109,', 'rgba(143, 0, 255,']
const BIOLUME_COLORS = ['rgba(29, 242, 179,', 'rgba(14, 210, 247,']
const GLASS_COLOR = 'rgba(210, 245, 255,'

/** Tweakable feel constants */
const REPULSION_RADIUS = 150
const REPULSION_STRENGTH = 0.9
const DRIFT = 0.014
const FLOAT_BIAS = -0.006
const MAX_SPEED = 1.6
const AGIT_DECAY = 0.94
const DAMPING = 0.985

function rand(min: number, max: number) {
  return min + Math.random() * (max - min)
}

function pickColor(): string {
  const r = Math.random()
  // 10% harsh toxin accents, 90% aqueous
  if (r < 0.1) return TOXIN_COLORS[(Math.random() * TOXIN_COLORS.length) | 0]
  if (r < 0.62) return BIOLUME_COLORS[(Math.random() * BIOLUME_COLORS.length) | 0]
  return GLASS_COLOR
}

export function spawnParticle(w: number, h: number): Particle {
  const depth = rand(0, 1)
  const roll = Math.random()
  const kind: ParticleKind = roll < 0.34 ? 'fiber' : roll < 0.62 ? 'fragment' : roll < 0.86 ? 'pellet' : 'bead'
  const size =
    kind === 'fiber'
      ? rand(10, 26) * (0.6 + depth * 0.8)
      : kind === 'fragment'
        ? rand(2.2, 5.2) * (0.6 + depth * 0.8)
        : kind === 'pellet'
          ? rand(1.6, 3.2) * (0.6 + depth * 0.8)
          : rand(0.9, 1.7)
  return {
    kind,
    x: rand(0, w),
    y: rand(0, h),
    vx: rand(-0.15, 0.15),
    vy: rand(-0.12, 0.12),
    depth,
    size,
    rot: rand(0, Math.PI * 2),
    rotV: rand(-0.004, 0.004),
    seedA: rand(0, Math.PI * 2),
    seedB: rand(0, Math.PI * 2),
    seedC: rand(0, Math.PI * 2),
    color: pickColor(),
    agit: 0,
  }
}

export function spawnPool(count: number, w: number, h: number): Particle[] {
  const pool: Particle[] = []
  for (let i = 0; i < count; i++) pool.push(spawnParticle(w, h))
  return pool
}

export function stepParticle(p: Particle, o: TankOptions) {
  const t = o.time
  const dt = Math.max(0, Math.min(o.delta ?? 1, 2))
  if (!dt) return

  // --- Brownian drift (smooth pseudo-noise, no allocations) ---
  const nx = Math.sin(p.seedA + t * 0.00037) + Math.sin(p.seedB + t * 0.00081) * 0.6
  const ny = Math.cos(p.seedC + t * 0.00043) + Math.sin(p.seedB + t * 0.00067) * 0.6
  p.vx += nx * DRIFT * (0.5 + p.depth) * dt
  p.vy += ny * DRIFT * (0.5 + p.depth) * dt

  // fibers slowly rise; beads sink faintly — stratification
  if (p.kind === 'fiber') p.vy += FLOAT_BIAS * dt
  else if (p.kind === 'bead') p.vy -= FLOAT_BIAS * 0.4 * dt

  // --- cursor repulsion (violent scatter, velocity-scaled) ---
  const dx = p.x - o.cx
  const dy = p.y - o.cy
  const d2 = dx * dx + dy * dy
  const radius = REPULSION_RADIUS * (o.repulsionScale ?? 1) * (0.7 + p.depth * 0.6)
  if (d2 < radius * radius && d2 > 0.01) {
    const d = Math.sqrt(d2)
    const fall = 1 - d / radius
    const force = REPULSION_STRENGTH * fall * fall * (0.35 + Math.min(o.cursorSpeed * 0.02, 1.6))
    p.vx += (dx / d) * force * dt
    p.vy += (dy / d) * force * dt
    p.agit = Math.min(1, p.agit + force * 1.4)
  }
  p.agit *= AGIT_DECAY ** dt

  // --- integrate ---
  p.vx *= DAMPING ** dt
  p.vy *= DAMPING ** dt
  const sp2 = p.vx * p.vx + p.vy * p.vy
  const max = MAX_SPEED * (0.5 + p.depth * 0.9)
  if (sp2 > max * max) {
    const s = max / Math.sqrt(sp2)
    p.vx *= s
    p.vy *= s
  }
  p.x += p.vx * dt
  p.y += p.vy * dt
  p.rot += (p.rotV + p.vx * 0.002) * dt

  // --- wrap with margin ---
  const m = 40
  if (p.x < -m) p.x = o.width + m
  else if (p.x > o.width + m) p.x = -m
  if (p.y < -m) p.y = o.height + m
  else if (p.y > o.height + m) p.y = -m
}

/** Draw one particle. ctx assumed pre-scaled for DPR; composite 'lighter' set by caller. */
export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle) {
  const alpha = (0.14 + p.depth * 0.5) * (1 + p.agit * 1.3)
  const alphaClamped = Math.min(alpha, 0.95)
  const colorTail = `${alphaClamped.toFixed(3)})`
  const color = p.color + colorTail

  if (p.kind === 'fiber') {
    ctx.strokeStyle = color
    ctx.lineWidth = Math.max(0.6, p.size * 0.055 + p.agit * 0.4)
    ctx.beginPath()
    const segs = 5
    const half = p.size
    const ux = Math.cos(p.rot)
    const uy = Math.sin(p.rot)
    const px = -uy
    const py = ux
    ctx.moveTo(p.x - ux * half, p.y - uy * half)
    for (let i = 1; i <= segs; i++) {
      const f = (i / segs) * 2 - 1 // -1..1
      const wave = Math.sin(p.seedA + p.rot * 3 + i * 1.7) * half * 0.22
      ctx.lineTo(p.x + ux * half * f + px * wave, p.y + uy * half * f + py * wave)
    }
    ctx.stroke()
    return
  }

  if (p.kind === 'fragment') {
    ctx.fillStyle = color
    ctx.save()
    ctx.translate(p.x, p.y)
    ctx.rotate(p.rot)
    const r = p.size
    ctx.beginPath()
    // irregular pentagon shard
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2
      const rr = r * (0.55 + ((i * 2654435761) % 100) / 220)
      const x = Math.cos(a) * rr
      const y = Math.sin(a) * rr
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.fill()
    ctx.restore()
    return
  }

  // pellet / bead — soft orb via radial gradient (cheap, cached not worth it at this size)
  const r = p.size * (1 + p.agit * 0.35)
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3)
  const coreA = p.kind === 'bead' ? Math.min(1, alphaClamped * 1.8) : alphaClamped
  g.addColorStop(0, p.color + `${coreA.toFixed(3)})`)
  g.addColorStop(0.45, p.color + `${(coreA * 0.35).toFixed(3)})`)
  g.addColorStop(1, p.color + '0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(p.x, p.y, r * 3, 0, Math.PI * 2)
  ctx.fill()
}
