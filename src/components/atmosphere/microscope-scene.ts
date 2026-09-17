import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { gsap } from 'gsap'

export interface RevealCoords {
  x: number
  y: number
}

/**
 * Procedural compound laboratory microscope.
 * Built to accurate scientific proportions with high-contrast materials:
 * warm-ivory enamel, matte charcoal stage, brushed steel barrels, and optical glass.
 */
export function createMicroscopeScene(
  canvas: HTMLCanvasElement,
  options?: {
    onReveal?: (coords: RevealCoords) => void
  }
) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
    powerPreference: 'high-performance',
  })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.18
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap

  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#080e11')

  // Camera tuned so instrument fills ~70-75% of stage height with breathing room
  const camera = new THREE.PerspectiveCamera(34, 1, 0.015, 60)
  const target = new THREE.Vector3(0, 1.52, 0)

  const room = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(room, 0.06)
  scene.environment = environment.texture
  room.dispose()
  pmrem.dispose()

  const model = new THREE.Group()
  scene.add(model)

  // Calibrated materials
  const ivory = new THREE.MeshPhysicalMaterial({
    color: '#d6dedb',
    roughness: 0.28,
    metalness: 0.15,
    clearcoat: 0.45,
  })
  const black = new THREE.MeshStandardMaterial({
    color: '#131a1f',
    metalness: 0.55,
    roughness: 0.38,
  })
  const rubber = new THREE.MeshStandardMaterial({
    color: '#090c0e',
    roughness: 0.88,
  })
  const steel = new THREE.MeshStandardMaterial({
    color: '#b2c0c5',
    metalness: 0.94,
    roughness: 0.2,
  })
  const brass = new THREE.MeshStandardMaterial({
    color: '#b59c55',
    metalness: 0.82,
    roughness: 0.25,
  })
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#e8ffff',
    transmission: 0.96,
    roughness: 0.03,
    thickness: 0.04,
    ior: 1.5,
  })
  const lens = new THREE.MeshPhysicalMaterial({
    color: '#123040',
    metalness: 0.25,
    roughness: 0.08,
    clearcoat: 1,
  })
  const water = new THREE.MeshPhysicalMaterial({
    color: '#ebffff',
    transmission: 0.99,
    roughness: 0.01,
    thickness: 0.15,
    ior: 1.333,
    clearcoat: 1,
  })

  function mesh(
    g: THREE.BufferGeometry,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = model
  ) {
    const o = new THREE.Mesh(g, m)
    o.position.set(x, y, z)
    o.castShadow = true
    o.receiveShadow = true
    parent.add(o)
    return o
  }

  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) =>
    mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(0.07, h / 4)), m, x, y, z)
  const cylinder = (r: number, h: number, m: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) =>
    mesh(new THREE.CylinderGeometry(r, r, h, 48), m, x, y, z, parent)

  // 1. Cast solid horseshoe base & anti-vibration rubber feet
  box(1.75, 0.24, 2.05, ivory, 0, 0.22, -0.05)
  for (const x of [-0.62, 0.62]) {
    for (const z of [-0.78, 0.68]) {
      cylinder(0.13, 0.12, rubber, x, 0.06, z)
    }
  }

  // 2. Main structural pillar & sloped ergonomic arm
  box(0.7, 1.28, 0.58, ivory, 0, 0.98, -0.66)
  const arm = box(0.62, 1.55, 0.55, ivory, 0, 1.95, -0.61)
  arm.rotation.x = -0.27
  box(0.75, 0.44, 0.88, ivory, 0, 2.54, -0.27)

  // 3. Mechanical stage with aperture
  const plate = new THREE.Shape()
  plate.moveTo(-0.76, -0.56)
  plate.lineTo(0.76, -0.56)
  plate.lineTo(0.76, 0.56)
  plate.lineTo(-0.76, 0.56)
  plate.closePath()
  const hole = new THREE.Path()
  hole.absarc(0, 0.14, 0.15, 0, Math.PI * 2, true)
  plate.holes.push(hole)
  const stage = mesh(
    new THREE.ExtrudeGeometry(plate, {
      depth: 0.11,
      bevelEnabled: true,
      bevelThickness: 0.015,
      bevelSize: 0.015,
      bevelSegments: 2,
    }),
    black,
    0,
    1.27,
    0.14
  )
  stage.rotation.x = -Math.PI / 2

  cylinder(0.23, 0.18, black, 0, 1.05, 0)
  cylinder(0.17, 0.08, steel, 0, 0.92, 0)

  // Substage Abbe condenser & field diaphragm lamp
  const lamp = new THREE.MeshStandardMaterial({ color: '#edfbf0', emissive: '#c4e8de', emissiveIntensity: 2.2 })
  cylinder(0.27, 0.06, black, 0, 0.4, 0)
  cylinder(0.19, 0.016, lamp, 0, 0.441, 0)
  const transmitted = new THREE.PointLight('#cfeeff', 1.8, 2.2)
  transmitted.position.set(0, 0.72, 0)
  model.add(transmitted)

  // 4. Glass specimen slide (1.25 units wide x 0.44 units deep)
  box(1.25, 0.024, 0.44, glass, 0, 1.41, 0.24)
  // Coverslip placed on left side so right side is completely exposed for the droplet
  box(0.32, 0.01, 0.32, glass, -0.24, 1.43, 0.24)
  // Stage specimen clips on far edges
  for (const x of [-0.52, 0.52]) {
    box(0.08, 0.026, 0.52, steel, x, 1.448, 0.2)
    cylinder(0.052, 0.04, steel, x, 1.445, -0.08)
  }

  // 5. Coarse and fine coaxial focus knobs
  for (const side of [-1, 1]) {
    const knob = cylinder(0.23, 0.16, rubber, side * 0.48, 1.62, -0.66)
    knob.rotation.z = Math.PI / 2
    const fine = cylinder(0.12, 0.22, black, side * 0.58, 1.62, -0.66)
    fine.rotation.z = Math.PI / 2
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2
      const rib = box(0.17, 0.024, 0.018, black, side * 0.48, 1.62 + Math.sin(a) * 0.232, -0.66 + Math.cos(a) * 0.232)
      rib.rotation.x = -a
    }
  }

  // 6. Revolving nosepiece & objective turret
  cylinder(0.28, 0.13, steel, 0, 2.31, 0.08)
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2
    const x = Math.sin(a) * 0.19
    const z = 0.08 + Math.cos(a) * 0.19
    const h = [0.52, 0.38, 0.29][i]
    cylinder(0.088, h, steel, x, 2.21 - h / 2, z)
    cylinder(0.092, 0.052, i === 0 ? brass : black, x, 2.17 - h * 0.55, z)
    cylinder(0.064, 0.08, black, x, 2.17 - h, z)
    cylinder(0.048, 0.01, lens, x, 2.125 - h, z)
  }

  // 7. Inclined monocular observation tube & ocular eyepiece
  const tube = new THREE.Group()
  tube.position.set(0, 2.66, -0.08)
  tube.rotation.x = 0.54
  model.add(tube)

  cylinder(0.25, 0.34, ivory, 0, 0.07, 0, tube)
  cylinder(0.148, 0.65, black, 0, 0.51, 0, tube)
  cylinder(0.176, 0.16, steel, 0, 0.86, 0, tube)
  cylinder(0.2, 0.13, rubber, 0, 0.99, 0, tube)
  const eyecup = mesh(new THREE.TorusGeometry(0.165, 0.044, 16, 64), rubber, 0, 1.08, 0, tube)
  eyecup.rotation.x = Math.PI / 2
  cylinder(0.138, 0.01, lens, 0, 1.075, 0, tube)
  for (let i = 0; i < 8; i++) {
    const ridge = mesh(new THREE.TorusGeometry(0.15, 0.008, 6, 48), black, 0, 0.62 + i * 0.023, 0, tube)
    ridge.rotation.x = Math.PI / 2
  }

  // Scientific instrument plaque
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 512
  labelCanvas.height = 128
  const context = labelCanvas.getContext('2d')!
  context.fillStyle = '#263436'
  context.fillRect(0, 0, 512, 128)
  context.fillStyle = '#b7cac5'
  context.font = '22px monospace'
  context.fillText('RIPPLE / OPTICAL STUDY', 28, 54)
  context.font = '16px monospace'
  context.fillText('01   COMPOUND MICROSCOPE', 28, 92)
  const labelTexture = new THREE.CanvasTexture(labelCanvas)
  labelTexture.colorSpace = THREE.SRGBColorSpace
  mesh(new THREE.PlaneGeometry(0.74, 0.18), new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.5 }), 0, 0.24, 1.006)

  // Ground contact plane & lighting
  mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: '#091013', roughness: 0.44, metalness: 0.3 }), 0, -0.005, 0, scene).rotation.x = -Math.PI / 2

  const key = new THREE.DirectionalLight('#e6f0ff', 3.4)
  key.position.set(3.2, 6.8, 4.8)
  key.castShadow = true
  key.shadow.mapSize.set(1024, 1024)
  key.shadow.camera.left = -3.5
  key.shadow.camera.right = 3.5
  key.shadow.camera.top = 4.5
  key.shadow.camera.bottom = -2.5
  key.shadow.normalBias = 0.025
  scene.add(key)

  const rim = new THREE.DirectionalLight('#8ee0d4', 2.1)
  rim.position.set(-3.8, 3.2, -3.8)
  scene.add(rim)

  // 8. Droplet: Brief B3 requires radius ~0.035 units (diameter ~5.6% of 1.25 slide width)
  const DROP_TARGET_X = 0.28
  const DROP_TARGET_Z = 0.24
  const SLIDE_Y = 1.43

  const drop = mesh(new THREE.SphereGeometry(0.035, 32, 24), water, DROP_TARGET_X, 2.5, DROP_TARGET_Z)
  drop.scale.set(0.85, 1.2, 0.85)

  // Small settling wet patch
  const wet = mesh(new THREE.SphereGeometry(0.05, 32, 16), water, DROP_TARGET_X, SLIDE_Y + 0.005, DROP_TARGET_Z)
  wet.scale.set(1, 0.1, 1)
  wet.visible = false

  // Tiny delicate impact ripple
  const splash = mesh(new THREE.TorusGeometry(0.042, 0.0035, 8, 48), water, DROP_TARGET_X, SLIDE_Y + 0.006, DROP_TARGET_Z)
  splash.rotation.x = Math.PI / 2
  splash.visible = false

  model.updateMatrixWorld(true)
  const ocular = tube.localToWorld(new THREE.Vector3(0, 1.1, 0))
  const axis = new THREE.Vector3(0, 1, 0).transformDirection(tube.matrixWorld)

  let timeline: gsap.core.Timeline | null = null
  let disposed = false

  function render() {
    if (!disposed) {
      camera.lookAt(target)
      renderer.render(scene, camera)
    }
  }

  function resize() {
    const r = canvas.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) return
    renderer.setSize(r.width, r.height, false)
    camera.aspect = r.width / r.height
    camera.updateProjectionMatrix()

    if (!timeline) {
      // Desktop: 38/62 split, microscope positioned cleanly in right 60%
      // Mobile: centered
      const isMobile = camera.aspect < 0.95
      if (isMobile) {
        target.set(0, 1.48, 0)
        camera.position.set(3.4, 3.1, 5.2)
      } else {
        target.set(-0.65, 1.48, 0)
        camera.position.set(3.8, 3.2, 5.4)
      }
    }
    render()
  }

  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()

  canvas.dataset.phase = 'ready'
  canvas.dataset.renderer = 'webgl'

  function getProjectedOcularCoords(): RevealCoords {
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()
    const vec = ocular.clone().project(camera)
    return {
      x: (vec.x + 1) / 2,
      y: (1 - vec.y) / 2,
    }
  }

  function play(done: () => void) {
    if (timeline || disposed) return

    timeline = gsap.timeline({
      onUpdate: render,
      onComplete: () => {
        canvas.dataset.phase = 'complete'
        done()
      },
    })

    // Phase 1: Droplet fall with gravity acceleration
    timeline
      .call(() => { canvas.dataset.phase = 'droplet' })
      .to(drop.position, { y: SLIDE_Y + 0.035, duration: 0.85, ease: 'power2.in' }, 0.1)
      // Brief impact squash
      .to(drop.scale, { x: 1.4, y: 0.35, z: 1.4, duration: 0.09 }, 0.95)
      .call(() => {
        drop.visible = false
        wet.visible = true
        splash.visible = true
        canvas.dataset.phase = 'landed'
      }, [], 1.04)
      // Subtle ripple expands gently
      .to(splash.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.45, ease: 'power2.out' }, 1.04)
      .to(splash.material, { opacity: 0, duration: 0.35 }, 1.15)
      .call(() => { splash.visible = false }, [], 1.5)

      // Phase 2: Camera approaches the eyepiece optics
      .call(() => { canvas.dataset.phase = 'approach' }, [], 1.45)
      .to(
        camera.position,
        {
          x: ocular.x + axis.x * 1.6,
          y: ocular.y + axis.y * 1.6,
          z: ocular.z + axis.z * 1.6,
          duration: 1.4,
          ease: 'power2.inOut',
        },
        1.45
      )
      .to(
        target,
        {
          x: ocular.x,
          y: ocular.y,
          z: ocular.z,
          duration: 1.3,
          ease: 'power2.inOut',
        },
        1.45
      )

      // Phase 3: Camera enters optical field, triggers circular reveal handoff
      .call(() => {
        canvas.dataset.phase = 'reveal'
        const coords = getProjectedOcularCoords()
        options?.onReveal?.(coords)
      }, [], 2.85)
      .to(
        camera.position,
        {
          x: ocular.x + axis.x * 0.05,
          y: ocular.y + axis.y * 0.05,
          z: ocular.z + axis.z * 0.05,
          duration: 0.85,
          ease: 'power3.in',
        },
        2.85
      )
      .to(
        camera,
        {
          fov: 44,
          duration: 0.85,
          ease: 'power2.in',
          onUpdate: () => camera.updateProjectionMatrix(),
        },
        2.85
      )
      // Fade canvas as optical iris expands
      .to(canvas, { opacity: 0, duration: 0.35, ease: 'power1.out' }, 3.4)
  }

  function dispose() {
    disposed = true
    timeline?.kill()
    observer.disconnect()
    const geometries = new Set<THREE.BufferGeometry>()
    const materials = new Set<THREE.Material>()
    scene.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        geometries.add(o.geometry)
        ;(Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => materials.add(m))
      }
    })
    geometries.forEach((g) => g.dispose())
    materials.forEach((m) => m.dispose())
    labelTexture.dispose()
    environment.dispose()
    renderer.dispose()
  }

  return { play, dispose }
}
