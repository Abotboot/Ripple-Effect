'use client'

/**
 * Self-hosted WebGL scene: "a world inside one drop".
 *
 * A glassy teardrop (custom geometry matching the org logo) with microplastic
 * fragments suspended inside, and ripple rings pulsing outward beneath it.
 * Cheap on purpose: procedural geometry only, one renderer, capped DPR,
 * environment lighting from three's bundled RoomEnvironment (no HDR files),
 * demand-based rendering (frames run only while visible, tab is focused and
 * something is animating), and full disposal on unmount. This is the ONLY
 * file that imports three - keep it that way so the chunk stays isolated.
 */

import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

export type WaterDropSceneProps = {
  /** Reveal the suspended fragments (exploded cutaway view). */
  revealed: boolean
  /** Called once the first frame has been rendered successfully. */
  onReady?: () => void
  /** Called if WebGL is unavailable or the context dies; wrapper shows the poster. */
  onFail?: () => void
}

/**
 * Teardrop geometry: a sphere whose upper hemisphere tapers to a soft point,
 * echoing the org logo. Returns positions/normals ready for BufferGeometry.
 */
function teardropGeometry(radius: number, segments = 72): THREE.BufferGeometry {
  const geo = new THREE.SphereGeometry(radius, segments, segments / 2)
  const pos = geo.getAttribute('position') as THREE.BufferAttribute
  const v = new THREE.Vector3()
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i)
    const h = v.y / radius // -1 .. 1
    if (h > 0) {
      // Pull the top toward a vertical spike: narrow strongly near the top,
      // while stretching height so the drop reads taller than wide.
      const t = Math.pow(h, 1.35)
      v.x *= 1 - 0.82 * t
      v.z *= 1 - 0.82 * t
      v.y = radius * (0.35 + h * 1.45) // stretch the top half upward
    } else {
      // Slightly plump the bottom into a rounded belly.
      v.y *= 1.08
      const bulge = 1 + 0.12 * -h
      v.x *= bulge
      v.z *= bulge
    }
    pos.setXYZ(i, v.x, v.y, v.z)
  }
  geo.computeVertexNormals()
  return geo
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
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5)
    renderer.setPixelRatio(dpr)
    host.appendChild(renderer.domElement)
    renderer.domElement.setAttribute('aria-hidden', 'true')

    const scene = new THREE.Scene()

    // Realistic glass reflections from three's bundled procedural environment
    // (generated locally, no HDR download).
    const pmrem = new THREE.PMREMGenerator(renderer)
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = envMap

    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 50)
    camera.position.set(0, 0.2, 7.2)

    scene.add(new THREE.AmbientLight(0xbfe9f2, 0.9))
    const key = new THREE.DirectionalLight(0xffffff, 1.6)
    key.position.set(3, 4, 6)
    scene.add(key)
    const rim = new THREE.DirectionalLight(0x4dd8e6, 2.0)
    rim.position.set(-4, -1, -3)
    scene.add(rim)

    const dropGroup = new THREE.Group()
    scene.add(dropGroup)

    // The droplet: true teardrop silhouette, glassy physical material.
    const dropMat = new THREE.MeshPhysicalMaterial({
      color: 0xa9e4f2,
      transmission: 0.9,
      thickness: 2.0,
      roughness: 0.06,
      metalness: 0,
      clearcoat: 1,
      clearcoatRoughness: 0.06,
      ior: 1.33,
      transparent: true,
      opacity: 1,
      envMapIntensity: 1.2,
    })
    const drop = new THREE.Mesh(teardropGeometry(1.7), dropMat)
    dropGroup.add(drop)

    // Fresnel rim glow so the silhouette reads against light backgrounds.
    const rimMat = new THREE.ShaderMaterial({
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        uColor: { value: new THREE.Color(0x53d0e8) },
        uPower: { value: 2.6 },
        uStrength: { value: 0.85 },
      },
      vertexShader: /* glsl */ `
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vView = normalize(-mv.xyz);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: /* glsl */ `
        uniform vec3 uColor;
        uniform float uPower;
        uniform float uStrength;
        varying vec3 vNormal;
        varying vec3 vView;
        void main() {
          float fres = pow(1.0 - abs(dot(vNormal, vView)), uPower);
          gl_FragColor = vec4(uColor, fres * uStrength);
        }
      `,
    })
    const rimGlow = new THREE.Mesh(teardropGeometry(1.7), rimMat)
    rimGlow.scale.setScalar(1.015)
    dropGroup.add(rimGlow)

    // Ripple rings beneath the drop - a nod to the logo.
    const RINGS = 3
    const rings: Array<{ mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; phase: number }> = []
    const ringGeo = new THREE.TorusGeometry(1, 0.02, 12, 80)
    for (let i = 0; i < RINGS; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0x5fd6ea,
        transparent: true,
        opacity: 0.5,
      })
      const mesh = new THREE.Mesh(ringGeo, mat)
      mesh.rotation.x = -Math.PI / 2
      mesh.position.y = -2.15
      dropGroup.add(mesh)
      rings.push({ mesh, mat, phase: (i / RINGS) * 1.0 })
    }

    // Suspended microplastic fragments - instanced so 90 shards cost one draw call.
    const FRAGMENTS = 90
    const fragGeo = new THREE.TetrahedronGeometry(0.07, 0)
    // Opaque on purpose: three.js's transmission pass only refracts opaque
    // objects, so transparent fragments would vanish when seen through the drop.
    const fragMat = new THREE.MeshStandardMaterial({
      color: 0x2fa8c9,
      roughness: 0.3,
      metalness: 0.2,
    })
    const fragments = new THREE.InstancedMesh(fragGeo, fragMat, FRAGMENTS)
    const seeds: Array<{ pos: THREE.Vector3; axis: THREE.Vector3; spin: number; scale: number; phase: number }> = []
    const dummy = new THREE.Object3D()
    for (let i = 0; i < FRAGMENTS; i++) {
      // Random point inside the teardrop volume: belly is wider than the neck.
      const v = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      )
      v.x *= 1.1
      v.y *= 1.5
      v.z *= 1.1
      if (v.y > 0) {
        // Neck: clamp x/z proportionally to height.
        const t = Math.min(v.y / 1.5, 1)
        const maxR = 1.15 * (1 - 0.8 * t)
        v.x *= maxR
        v.z *= maxR
      } else if (v.length() > 1.25) {
        v.setLength(1.25)
      }
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
      targetTilt.x = THREE.MathUtils.clamp(ny, -0.5, 0.5) * 0.3
      targetTilt.y = THREE.MathUtils.clamp(nx, -0.5, 0.5) * 0.5
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
    let settleFrames = 30
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

      // Ripple rings: expand, fade, restart - staggered by phase.
      for (const r of rings) {
        const p = ((t * 0.28 + r.phase) % 1)
        r.mesh.scale.setScalar(0.7 + p * 2.4)
        r.mat.opacity = 0.5 * (1 - p) * (1 - p)
      }

      // Ease fragments in/out of the revealed state.
      const goal = revealRef.current ? 1 : 0
      revealedAmount += (goal - revealedAmount) * 0.05
      for (let i = 0; i < FRAGMENTS; i++) {
        const s = seeds[i]
        // Drift apart slightly when revealed, but stay inside the drop.
        const drift = 1 + revealedAmount * 0.3
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
      rimGlow.geometry.dispose()
      rimMat.dispose()
      ringGeo.dispose()
      for (const r of rings) r.mat.dispose()
      fragGeo.dispose()
      fragMat.dispose()
      fragments.dispose()
      envMap.dispose()
      pmrem.dispose()
      renderer.dispose()
      renderer.domElement.remove()
    }
  }, [])

  return <div ref={hostRef} className="h-full w-full" />
}
