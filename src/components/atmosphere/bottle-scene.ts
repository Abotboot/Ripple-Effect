import * as THREE from 'three'

export type SpecimenForm = 'all' | 'fibers' | 'fragments'
export type SpecimenMotion = { paused: boolean; reducedMotion: boolean; form: SpecimenForm }
export type BottleScene = {
  update: (uv: boolean, angle: number, motion: SpecimenMotion) => void
  setVisible: (visible: boolean) => void
  scan: () => void
  dispose: () => void
}

// One model in both views. These are editorial optical cues, not a UV response
// model or a material-identification simulation. No images or remote assets.
export function createBottleScene(canvas: HTMLCanvasElement, onFailure: () => void): BottleScene {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor('#111719', 1)
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(30, 1, .1, 30)
  camera.position.set(0, .48, 7.4)
  camera.lookAt(0, .05, 0)
  const bottle = new THREE.Group()
  bottle.rotation.z = -.025
  scene.add(bottle)
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()
  const add = <T extends THREE.Material>(geometry: THREE.BufferGeometry, material: T, y = 0, parent: THREE.Object3D = bottle) => {
    geometries.add(geometry); materials.add(material)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = y
    parent.add(mesh)
    return mesh
  }

  const key = new THREE.DirectionalLight('#fff4e4', 2.5)
  key.position.set(-3, 5, 4)
  const fill = new THREE.DirectionalLight('#bfd2ce', 1)
  fill.position.set(3, 1, -2)
  scene.add(key, fill, new THREE.HemisphereLight('#d9e3df', '#172021', 1.1))

  // Thin molded PET shell, with the grip rings in the surface itself. The base
  // has five shallow lobes rather than separate spheres or detached hoops.
  const profile = new THREE.SplineCurve([
    [0, -1.53], [.27, -1.55], [.46, -1.52], [.54, -1.44],
    [.561, -1.32], [.563, -.95], [.553, -.65], [.547, -.28],
    [.555, .18], [.557, .56], [.535, .82], [.463, 1.02],
    [.35, 1.18], [.233, 1.31], [.204, 1.4], [.204, 1.61],
  ].map(([radius, y]) => new THREE.Vector2(radius, y)))
  const points = profile.getPoints(160).map(point => {
    for (const y of [-1.3, -1.16, -1.02, .34, .49, .64]) {
      point.x -= .009 * Math.exp(-Math.pow((point.y - y) / .021, 2))
    }
    return point
  })
  const bodyGeometry = new THREE.LatheGeometry(points, 96)
  const position = bodyGeometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i), z = position.getZ(i)
    if (y > -1.34 || Math.hypot(x, z) < .2) continue
    const amount = THREE.MathUtils.smoothstep(-y, 1.34, 1.53)
    const lobe = Math.cos(Math.atan2(x, z) * 5)
    position.setXYZ(i, x * (1 + .035 * lobe * amount), y + .023 * (1 + lobe) * amount, z * (1 + .035 * lobe * amount))
  }
  bodyGeometry.computeVertexNormals()
  const optics = { inspection: { value: 0 }, scanY: { value: 2 }, scanStrength: { value: 0 } }
  const pet = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, side: THREE.FrontSide,
    uniforms: optics,
    vertexShader: `
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      varying float height;
      void main() {
        worldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        worldNormal = normalize(mat3(modelMatrix) * normal);
        height = position.y;
        gl_Position = projectionMatrix * viewMatrix * vec4(worldPosition, 1.0);
      }
    `,
    fragmentShader: `
      uniform float inspection;
      uniform float scanY;
      uniform float scanStrength;
      varying vec3 worldPosition;
      varying vec3 worldNormal;
      varying float height;
      void main() {
        vec3 n = normalize(worldNormal);
        vec3 v = normalize(cameraPosition - worldPosition);
        vec3 r = reflect(-v, n);
        float edge = pow(1.0 - max(dot(n, v), 0.0), 2.8);
        vec2 horizontal = normalize(r.xz);
        float left = pow(max(dot(horizontal, normalize(vec2(-0.82, 0.57))), 0.0), 85.0);
        float right = pow(max(dot(horizontal, normalize(vec2(0.93, -0.37))), 0.0), 110.0);
        float top = pow(max(dot(r, normalize(vec3(-0.25, 0.84, 0.42))), 0.0), 55.0);
        float band = exp(-pow((height - scanY) / 0.032, 2.0)) * scanStrength;
        float alpha = (0.012 + edge * 0.46 + left * 0.47 + right * 0.30 + top * 0.25) * (1.0 - inspection * 0.20);
        vec3 ivory = vec3(0.78, 0.82, 0.78);
        vec3 aqua = vec3(0.47, 0.65, 0.62);
        vec3 color = mix(ivory, aqua, clamp(right * 0.65 + edge * 0.23, 0.0, 1.0));
        gl_FragColor = vec4(color, min(0.8, alpha + band * 0.13));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  })
  const shell = add(bodyGeometry, pet)
  shell.renderOrder = 4

  const rimMaterial = new THREE.MeshBasicMaterial({ color: '#c4d8d0', transparent: true, opacity: .24, depthWrite: false })
  const meniscus = add(new THREE.TorusGeometry(.525, .004, 5, 80), rimMaterial, .76)
  meniscus.rotation.x = Math.PI / 2
  const mouth = add(new THREE.TorusGeometry(.219, .013, 8, 64), rimMaterial, 1.38)
  mouth.rotation.x = Math.PI / 2
  const capMaterial = new THREE.MeshStandardMaterial({ color: '#deded4', roughness: .6, metalness: 0 })
  const capGeometry = new THREE.CylinderGeometry(.235, .239, .23, 96, 1)
  const capPositions = capGeometry.getAttribute('position')
  for (let i = 0; i < capPositions.count; i++) {
    const x = capPositions.getX(i), z = capPositions.getZ(i)
    const radius = Math.hypot(x, z)
    if (radius < .22) continue
    const ridge = 1 + .014 * Math.cos(Math.atan2(x, z) * 48)
    capPositions.setX(i, x * ridge); capPositions.setZ(i, z * ridge)
  }
  capGeometry.computeVertexNormals()
  add(capGeometry, capMaterial, 1.58)
  const seal = add(new THREE.CylinderGeometry(.222, .222, .042, 64), capMaterial, 1.435)
  seal.rotation.y = .04

  // A narrow paper band makes rotation legible without hiding most of the water.
  const labelCanvas = document.createElement('canvas')
  labelCanvas.width = 1024; labelCanvas.height = 256
  const labelContext = labelCanvas.getContext('2d')
  if (labelContext) {
    labelContext.fillStyle = '#dbddd3'; labelContext.fillRect(0, 0, 1024, 256)
    labelContext.fillStyle = '#21352f'; labelContext.textAlign = 'center'
    labelContext.font = '500 45px sans-serif'; labelContext.fillText('WATER', 512, 112)
    labelContext.font = '19px sans-serif'; labelContext.fillText('ILLUSTRATED SPECIMEN', 512, 161)
    labelContext.fillStyle = '#80958b'; labelContext.fillRect(194, 48, 2, 162); labelContext.fillRect(830, 48, 2, 162)
  }
  const labelTexture = new THREE.CanvasTexture(labelCanvas)
  labelTexture.colorSpace = THREE.SRGBColorSpace
  labelTexture.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy())
  textures.add(labelTexture)
  const labelMaterial = new THREE.MeshStandardMaterial({ map: labelTexture, roughness: .78, transparent: true, depthWrite: false })
  const label = add(new THREE.CylinderGeometry(.559, .559, .47, 96, 1, true), labelMaterial, -.35)
  label.rotation.y = Math.PI
  label.renderOrder = 3

  // Soft contact shadow; no glowing chamber, floor grid or decorative scale.
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = shadowCanvas.height = 128
  const shadowContext = shadowCanvas.getContext('2d')
  if (shadowContext) {
    const gradient = shadowContext.createRadialGradient(64, 64, 3, 64, 64, 64)
    gradient.addColorStop(0, 'rgba(0,0,0,.65)'); gradient.addColorStop(.45, 'rgba(0,0,0,.27)'); gradient.addColorStop(1, 'rgba(0,0,0,0)')
    shadowContext.fillStyle = gradient; shadowContext.fillRect(0, 0, 128, 128)
  }
  const shadowTexture = new THREE.CanvasTexture(shadowCanvas)
  textures.add(shadowTexture)
  const shadow = add(new THREE.PlaneGeometry(2.1, 1.2), new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }), -1.57, scene)
  shadow.rotation.x = -Math.PI / 2

  type Inclusion = { mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>; base: THREE.Vector3; phase: number; form: 'fibers' | 'fragments' }
  const inclusions: Inclusion[] = []
  const fragmentShape = new THREE.Shape()
  fragmentShape.moveTo(-.8, -.5); fragmentShape.lineTo(-.15, -.75); fragmentShape.lineTo(.7, -.32)
  fragmentShape.lineTo(.52, .5); fragmentShape.lineTo(-.3, .8); fragmentShape.lineTo(-.7, .2); fragmentShape.closePath()
  const fragmentGeometry = new THREE.ExtrudeGeometry(fragmentShape, { depth: .09, bevelEnabled: false })
  geometries.add(fragmentGeometry)
  for (let i = 0; i < 26; i++) {
    const form = i % 3 === 0 ? 'fibers' : 'fragments'
    const material = new THREE.MeshStandardMaterial({ color: form === 'fibers' ? '#bdd8ca' : '#d7d9ca', roughness: .45, metalness: .04, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
    let geometry: THREE.BufferGeometry = fragmentGeometry
    if (form === 'fibers') {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-.014, -.067, 0), new THREE.Vector3(.012, -.02, .007),
        new THREE.Vector3(-.008, .03, -.003), new THREE.Vector3(.021, .069, 0),
      ])
      geometry = new THREE.TubeGeometry(curve, 12, .0042, 5, false)
    }
    const particle = add(geometry, material)
    const azimuth = i * 2.39996
    const radius = .13 + .25 * Math.sqrt(((i * 17) % 26) / 26)
    particle.position.set(Math.sin(azimuth) * radius, -1.27 + ((i * 47) % 193) / 100, Math.cos(azimuth) * radius)
    particle.rotation.set(.3 + i * .23, i * .6, i * .73)
    if (form === 'fragments') particle.scale.setScalar((.018 + (i % 4) * .004) * 1.4)
    particle.renderOrder = 2
    inclusions.push({ mesh: particle, base: particle.position.clone(), phase: i * 1.79, form })
  }

  let disposed = false, visible = false, uv = false, paused = false, reducedMotion = false
  let form: SpecimenForm = 'all'
  let angle = 0, targetAngle = 0, inspection = 0, elapsed = 0, lastFrame = 0
  let scanProgress = 1, frame: number | undefined, renderedFrames = 0
  let width = 0, height = 0
  const cancel = () => { if (frame !== undefined) cancelAnimationFrame(frame); frame = undefined; lastFrame = 0; canvas.dataset.running = 'false' }
  const state = () => {
    canvas.dataset.motion = !visible ? 'offscreen' : reducedMotion ? 'reduced-motion' : paused ? 'paused' : uv ? 'active' : 'idle'
  }
  const render = () => {
    if (disposed || !visible) return
    const bounds = canvas.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    if (width !== bounds.width || height !== bounds.height) {
      width = bounds.width; height = bounds.height
      renderer.setSize(width, height, false)
      camera.aspect = width / height
      camera.position.z = Math.max(7.4, 3.1 / Math.max(camera.aspect, .45))
      camera.updateProjectionMatrix()
    }
    bottle.rotation.y = THREE.MathUtils.degToRad(angle)
    optics.inspection.value = inspection
    const scanY = 1.05 - scanProgress * 2.65
    optics.scanY.value = scanY
    optics.scanStrength.value = scanProgress < 1 ? Math.sin(scanProgress * Math.PI) : 0
    labelMaterial.opacity = 1 - inspection * .94
    rimMaterial.opacity = .24 - inspection * .04
    for (const inclusion of inclusions) {
      const selected = form === 'all' || form === inclusion.form
      const scanned = scanProgress < 1 ? THREE.MathUtils.smoothstep(inclusion.base.y - scanY, -.08, .12) : 1
      inclusion.mesh.visible = inspection > .002 && selected
      inclusion.mesh.material.opacity = inspection * scanned * (.70 + .12 * (inclusion.base.z + .4))
      inclusion.mesh.position.copy(inclusion.base)
      inclusion.mesh.position.x += Math.sin(elapsed * .25 + inclusion.phase) * .009 * inspection
      inclusion.mesh.position.y += Math.sin(elapsed * .19 + inclusion.phase) * .012 * inspection
      inclusion.mesh.rotation.y = inclusion.phase + Math.sin(elapsed * .16 + inclusion.phase) * .12
    }
    renderer.render(scene, camera)
    canvas.dataset.rendered = uv ? 'uv' : 'macro'
    canvas.dataset.renderer = 'webgl'
    canvas.dataset.angle = String(targetAngle)
    canvas.dataset.renderedAngle = angle.toFixed(2)
    canvas.dataset.transition = Math.abs(inspection - Number(uv)) > .002 || scanProgress < 1 ? 'scanning' : 'settled'
    canvas.dataset.inspection = inspection.toFixed(3)
    canvas.dataset.scanProgress = scanProgress.toFixed(3)
    canvas.dataset.form = form
    canvas.dataset.visibleForms = String(inclusions.filter(particle => particle.mesh.visible).length)
    canvas.dataset.renderCount = String(++renderedFrames)
    state()
  }
  const request = () => {
    if (disposed || !visible || frame !== undefined) return
    canvas.dataset.running = 'true'
    frame = requestAnimationFrame(tick)
  }
  const tick = (now: number) => {
    frame = undefined
    if (disposed || !visible) { cancel(); return }
    // 30 GPU frames/second while moving. A paused, reduced-motion or resting
    // macro view has no repeating frame request; controls still draw on demand.
    if (lastFrame && now - lastFrame < 32) { request(); return }
    const dt = lastFrame ? Math.min((now - lastFrame) / 1000, .05) : 1 / 30
    lastFrame = now
    if (!paused && !reducedMotion) {
      elapsed += dt
      inspection = THREE.MathUtils.damp(inspection, Number(uv), 5.5, dt)
      angle = THREE.MathUtils.damp(angle, targetAngle, 12, dt)
      scanProgress = Math.min(1, scanProgress + dt / 1.65)
      if (Math.abs(inspection - Number(uv)) < .002) inspection = Number(uv)
      if (Math.abs(angle - targetAngle) < .03) angle = targetAngle
    }
    try { render() } catch { cancel(); onFailure(); return }
    if (!paused && !reducedMotion && (uv || inspection !== Number(uv) || angle !== targetAngle || scanProgress < 1)) request()
    else { canvas.dataset.running = 'false'; lastFrame = 0 }
  }
  const resize = new ResizeObserver(request)
  resize.observe(canvas)
  renderer.debug.onShaderError = () => { cancel(); onFailure() }
  return {
    update(nextUv, nextAngle, motion) {
      if (disposed) return
      const changedView = nextUv !== uv || nextAngle !== targetAngle || motion.form !== form
      if (nextUv && !uv) scanProgress = motion.paused || motion.reducedMotion ? 1 : 0
      uv = nextUv; targetAngle = nextAngle; form = motion.form
      paused = motion.paused; reducedMotion = motion.reducedMotion
      if (reducedMotion || (paused && changedView)) { inspection = Number(uv); angle = targetAngle; scanProgress = 1 }
      if (paused || reducedMotion) cancel()
      state(); request()
    },
    setVisible(next) {
      if (disposed || next === visible) return
      visible = next
      if (!visible) cancel(); else request()
      state()
    },
    scan() {
      if (disposed || !uv || paused || reducedMotion) return
      scanProgress = 0; request()
    },
    dispose() {
      if (disposed) return
      disposed = true; visible = false; cancel(); resize.disconnect()
      geometries.forEach(geometry => geometry.dispose())
      materials.forEach(material => material.dispose())
      textures.forEach(texture => texture.dispose())
      renderer.dispose(); renderer.forceContextLoss()
      canvas.dataset.disposed = 'true'
    },
  }
}
