'use client'

/**
 * Self-hosted WebGL scene: "a world inside one drop".
 *
 * A translucent water droplet with suspended microplastic fragments inside.
 * Deliberately cheap: procedural geometry only, one renderer, capped DPR,
 * demand-based rendering (frames run only while visible, tab is focused and
 * something is animating), and full disposal on unmount. This is the ONLY
 * file that imports three - keep it that way so the chunk stays isolated.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'

export type WaterDropSceneProps = {
  /** Reveal the suspended fragments (exploded cutaway view). */
  revealed: boolean
  /** Called once the first frame has been rendered successfully. */
  onReady?: () => void
  /** Called if WebGL is unavailable or the context dies; wrapper shows the poster. */
  onFail?: () => void
}

export default function WaterDropScene({ revealed, onReady, onFail }: WaterDropSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const revealRef = useRef(revealed)
  revealRef.current = revealed
  const readyRef = useRef(onReady)
  readyRef.current = onReady
  const failRef = useRef(onFail)
  failRef.current = onFail

  useEffect(() => {
    const host = hostRef.current
    if (!host) return

    let renderer: THREE.WebGLRenderer
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' })
    } catch {
      failRef.current?.()
      return
    }
    renderer.setClearColor(0x000000, 0)
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(dpr)
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const scene = new THREE.Scene()

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
    camera.position.set(0, 0, 7.2)

    // Lighting: simple key + rim, no HDR environment.
    scene.add(new THREE.AmbientLight(0xbfe9f2, 1.1))
    const key = new THREE.DirectionalLight(0xffffff, 2.2)
    key.position.set(3, 4, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x4dd8e6, 1.6)
    rim.position.set(-4, -1, -3)
    scene.add(rim)

    // The droplet itself.
    const dropGroup = new THREE.Group()
    scene.add(dropGroup)

    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0x7ccfe4,
      transmission: 0.85,
      thickness: 2.0,
      roughness: 0.08,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.1,
      ior: 1.33,
      transparent: true,
      opacity: 1,
    })
    const drop = new THREE.Mesh(new THREE.SphereGeometry(1.9, 64, 64), dropMat)
    // Squash into a droplet silhouette.
    drop.scale.set(0.86, 1.06, 0.86)
    dropGroup.add(drop)

    // Inner glow shell for depth.
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x67d8ea,
      transparent: true,
      opacity: 0.12,
      side: THREE.BackSide,
    })
    const glow = new THREE.Mesh(new THREE.SphereGeometry(2.05, 48, 48), glowMat)
    glow.scale.copy(drop.scale)
    dropGroup.add(glow)

    // Suspended microplastic fragments - instanced so 90 shards cost one draw call.
    const FRAGMENTS = 90
    const fragGeo = new THREE.TetrahedronGeometry(0.085, 0)
    // Opaque on purpose: three.js's transmission pass only refracts opaque
    // objects, so transparent fragments would vanish when seen through the drop.
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0x2fa8c9,
      roughness: 0.35,
      metalness: 0.15,
    })
    const fragments = new THREE.InstancedMesh(fragGeo, fragMat, FRAGMENTS)
    const seeds: Array<{ pos: THREE.Vector3; axis: THREE.Vector3; spin: number; scale: number; phase: number }> = []
    const dummy = new THREE.Object3D()
    for (let i = 0; i < FRAGMENTS; i++) {
      // Random point inside a squashed ellipsoid slightly smaller than the drop.
      const v = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      )
      v.multiply(new THREE.Vector3(1.35, 1.6, 1.35))
      if (v.length() > 1.35) v.setLength(1.35)
      seeds.push({
        pos: v,
        axis: new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize(),
        spin: 0.3 + Math.random() * 0.7,
        scale: 0.5 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
      })
      dummy.position.set(0, 0, 0)
      dummy.scale.setScalar(0.0001)
      dummy.updateMatrix()
      fragments.setMatrixAt(i, dummy.matrix)
    }
    dropGroup.add(fragments)

    // Bounded pointer tilt (never a free orbit).
    const targetTilt = { x: 0, y: 0 }
    const onPointerMove = (e: PointerEvent) => {
      const rect = host.getBoundingClientRect()
      const nx = (e.clientX - rect.left) / Math.max(rect.width, 1) - 0.5
      const ny = (e.clientY - rect.top) / Math.max(rect.height, 1) - 0.5
      targetTilt.x = THREE.MathUtils.clamp(ny, -0.5, 0.5) * 0.35
      targetTilt.y = THREE.MathUtils.clamp(nx, -0.5, 0.5) * 0.55
    }
    host.addEventListener('pointermove', onPointerMove)

    // Resize via ResizeObserver (no window listeners needed).
    const resize = () => {
      const w = host.clientWidth
      const h = host.clientHeight
      if (w === 0 || h === 0) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    // Demand-driven loop: animate only while visible, tab focused, or settling.
    let visible = true
    const io = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? true
    })
    io.observe(host)

    let raf = 0
    let settleFrames = 30 // a few frames after each wake-up so motion eases out
    let revealedAmount = 0
    let disposed = false

    const tick = () => {
      if (disposed) return
      raf = requestAnimationFrame(tick)
      const t = performance.now() / 1000
      const hidden = document.hidden || !visible
      if (hidden && settleFrames <= 0) return
      if (!hidden) settleFrames = 30
      else settleFrames--

      // Gentle idle bob + eased tilt toward the pointer target.
      dropGroup.position.y = Math.sin(t * 0.8) * 0.08
      dropGroup.rotation.x += (targetTilt.x - dropGroup.rotation.x) * 0.06
      dropGroup.rotation.y += (targetTilt.y - dropGroup.rotation.y) * 0.06
      if (!hidden) {
        targetTilt.x *= 0.999
      }

      // Ease fragments in/out of the revealed state.
      const goal = revealRef.current ? 1 : 0
      revealedAmount += (goal - revealedAmount) * 0.05
      for (let i = 0; i < FRAGMENTS; i++) {
        const s = seeds[i]
        // Spread apart when revealed, but stay inside the droplet silhouette.
        const drift = 1 + revealedAmount * 0.35
        dummy.position.set(s.pos.x * drift, s.pos.y * drift, s.pos.z * drift)
        dummy.quaternion.setFromAxisAngle(s.axis, t * s.spin + s.phase)
        dummy.scale.setScalar(Math.max(s.scale * revealedAmount, 0.0001))
        dummy.updateMatrix()
        fragments.setMatrixAt(i, dummy.matrix)
      }
      fragments.instanceMatrix.needsUpdate = true

      renderer.render(scene, camera)
    }
    tick()

    // Signal ready after the first real frame, then start the demand loop.
    readyRef.current?.()
    raf = requestAnimationFrame(tick)
    const onContextLost = (e: Event) => {
      e.preventDefault()
      failRef.current?.()
    }
    renderer.domElement.addEventListener('webglcontextlost', onContextLost)

    return () => {
      disposed = true
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      host.removeEventListener('pointermove', onPointerMove)
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost)
      drop.geometry.dispose()
      dropMat.dispose()
      glow.geometry.dispose()
      glowMat.dispose()
      fragGeo.dispose()
      fragMat.dispose()
      fragments.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} className="h-full w-full" />
}
