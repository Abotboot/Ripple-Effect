import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

// On-demand product render: no animation loop, physics engine or remote assets.
export function createBottleScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = .9
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#0a151a')
  const camera = new THREE.PerspectiveCamera(31, 1, .1, 50)
  camera.position.set(3.2, 1.3, 7.3)
  camera.lookAt(0, .1, 0)
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const environment = pmrem.fromScene(room, .04)
  scene.environment = environment.texture
  room.dispose()
  pmrem.dispose()
  const bottle = new THREE.Group()
  bottle.rotation.z = -.09
  scene.add(bottle)
  const textures: THREE.Texture[] = []
  const geometries: THREE.BufferGeometry[] = []
  const materials: THREE.Material[] = []
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, y = 0) {
    geometries.push(geometry)
    if (!materials.includes(material)) materials.push(material)
    const object = new THREE.Mesh(geometry, material)
    object.position.y = y
    bottle.add(object)
    return object
  }
  const pet = new THREE.MeshPhysicalMaterial({ color: '#e5fbff', metalness: 0, roughness: .095, transmission: .96, thickness: .065, ior: 1.47, clearcoat: 1, clearcoatRoughness: .08, envMapIntensity: 1.6, side: THREE.FrontSide })
  const profile = [[0,-1.65],[.36,-1.65],[.52,-1.58],[.57,-1.45],[.58,-1.3],[.57,-.8],[.57,.5],[.56,.87],[.51,1.03],[.38,1.2],[.25,1.32],[.225,1.45],[.225,1.66]]
  const body = mesh(new THREE.LatheGeometry(profile.map(([r,y])=>new THREE.Vector2(r,y)),96),pet)
  const water = mesh(new THREE.CylinderGeometry(.525,.525,2.35,80),new THREE.MeshPhysicalMaterial({ color:'#f2fffc',roughness:.025,transmission:1,thickness:.65,ior:1.333 }),-.31)
  const meniscus = mesh(new THREE.TorusGeometry(.515,.012,8,80),pet,.87)
  meniscus.rotation.x = Math.PI/2
  for (const y of [-1.42,-1.23,-1.04,.42,.61,.80]) {
    const rib=mesh(new THREE.TorusGeometry(.563,.024,12,96),pet,y)
    rib.rotation.x=Math.PI/2
  }
  for (let i=0;i<5;i++) {
    const foot=mesh(new THREE.SphereGeometry(.20,24,16),pet,-1.53)
    foot.scale.set(1,.53,1)
    foot.position.x=Math.sin(i*Math.PI*2/5)*.33
    foot.position.z=Math.cos(i*Math.PI*2/5)*.33
  }
  const capMaterial=new THREE.MeshStandardMaterial({color:'#e5e9e3',roughness:.32,metalness:.05})
  mesh(new THREE.CylinderGeometry(.27,.27,.30,80),capMaterial,1.64)
  for(let i=0;i<48;i++) {
    const ridge=mesh(new THREE.BoxGeometry(.014,.25,.018),capMaterial,1.64)
    const a=i*Math.PI*2/48
    ridge.position.x=Math.sin(a)*.271;ridge.position.z=Math.cos(a)*.271;ridge.rotation.y=a
  }
  const seal=mesh(new THREE.TorusGeometry(.239,.027,10,80),capMaterial,1.43)
  seal.rotation.x=Math.PI/2
  const labelCanvas=document.createElement('canvas')
  labelCanvas.width=1536;labelCanvas.height=512
  const c=labelCanvas.getContext('2d')!
  c.fillStyle='#eeeae0';c.fillRect(0,0,1536,512)
  c.fillStyle='#174d40';c.fillRect(0,0,1536,13);c.fillRect(0,499,1536,13)
  c.textAlign='center';c.fillStyle='#173e35'
  c.font='22px monospace';c.fillText('R I P P L E   /   S T U D I O',768,98)
  c.font='112px Georgia';c.fillText('Still water.',768,257)
  c.font='24px monospace';c.fillText('SPECIMEN 001   /   PET',768,333)
  c.font='18px monospace';c.fillText('OPTICAL STUDY   ·   NOT A COMMERCIAL PRODUCT',768,404)
  for(let i=0;i<35;i++){c.fillRect(80+i*4,190,1+i%3,124)}
  c.textAlign='left';c.font='17px monospace'
  ;['CLARITY ≠ PURITY','RESEARCH VISUALIZATION','500 mL / ILLUSTRATION'].forEach((s,i)=>c.fillText(s,1110,190+i*40))
  const labelTexture=new THREE.CanvasTexture(labelCanvas)
  labelTexture.colorSpace=THREE.SRGBColorSpace;labelTexture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());textures.push(labelTexture)
  const label=mesh(new THREE.CylinderGeometry(.584,.584,1.04,96,1,true),new THREE.MeshStandardMaterial({map:labelTexture,roughness:.5,metalness:.03}),-.23)
  label.rotation.y=-2.73
  const particles=new THREE.Group();bottle.add(particles)
  const uvMaterial=new THREE.MeshBasicMaterial({color:'#ff498e'})
  materials.push(uvMaterial)
  const particleGeometry=new THREE.SphereGeometry(.014,8,6);geometries.push(particleGeometry)
  for(let i=0;i<95;i++) {
    const particle=new THREE.Mesh(particleGeometry,uvMaterial)
    const a=i*2.39996,r=.45*Math.sqrt((i+.5)/95)
    particle.position.set(Math.sin(a)*r,-1.3+(i*71%220)/100,Math.cos(a)*r)
    particles.add(particle)
  }
  const wire=new THREE.LineSegments(new THREE.WireframeGeometry(body.geometry),new THREE.LineBasicMaterial({color:'#59d3c4',transparent:true,opacity:.12}))
  geometries.push(wire.geometry);materials.push(wire.material);bottle.add(wire)
  const key=new THREE.DirectionalLight('#ffffff',1.5);key.position.set(-3,4,5);scene.add(key)
  const rim=new THREE.DirectionalLight('#83ffe0',2);rim.position.set(4,2,-3);scene.add(rim)
  scene.add(new THREE.AmbientLight('#c4e2ef',.8))
  let uv=false,angle=0
  function draw() {
    const {width,height}=canvas.getBoundingClientRect()
    if(!width||!height)return
    renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix()
    bottle.rotation.y=angle*Math.PI/180
    body.visible=!uv;water.visible=!uv;label.visible=!uv;wire.visible=uv;particles.visible=uv
    renderer.render(scene,camera)
    canvas.dataset.rendered=uv?'uv':'macro';canvas.dataset.angle=String(angle);canvas.dataset.renderer='webgl'
  }
  const observer=new ResizeObserver(draw);observer.observe(canvas)
  return {
    update(nextUv:boolean,nextAngle:number){uv=nextUv;angle=nextAngle;draw()},
    dispose(){observer.disconnect();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());environment.dispose();renderer.dispose();renderer.forceContextLoss()},
  }
}
