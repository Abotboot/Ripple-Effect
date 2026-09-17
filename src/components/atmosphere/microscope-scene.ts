import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { gsap } from 'gsap'

/** Local procedural compound microscope. No remote model, tracking or measured sample. */
export function createMicroscopeScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true })
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5))
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.15
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFSoftShadowMap
  const scene = new THREE.Scene()
  scene.background = new THREE.Color('#080e11')
  const camera = new THREE.PerspectiveCamera(36, 1, .015, 60)
  const target = new THREE.Vector3(0, 1.55, 0)
  const room = new RoomEnvironment()
  const pmrem = new THREE.PMREMGenerator(renderer)
  const environment = pmrem.fromScene(room, .06)
  scene.environment = environment.texture
  room.dispose(); pmrem.dispose()
  const model = new THREE.Group()
  scene.add(model)
  const ivory = new THREE.MeshPhysicalMaterial({ color: '#c4ccc9', roughness: .3, metalness: .25, clearcoat: .5 })
  const black = new THREE.MeshStandardMaterial({ color: '#141b21', metalness: .55, roughness: .36 })
  const rubber = new THREE.MeshStandardMaterial({ color: '#080b0d', roughness: .85 })
  const steel = new THREE.MeshStandardMaterial({ color: '#aebbc0', metalness: .95, roughness: .21 })
  const brass = new THREE.MeshStandardMaterial({ color: '#ac914f', metalness: .8, roughness: .26 })
  const glass = new THREE.MeshPhysicalMaterial({ color: '#e1ffff', transmission: .96, roughness: .04, thickness: .045, ior: 1.5 })
  const lens = new THREE.MeshPhysicalMaterial({ color: '#173544', metalness: .25, roughness: .09, clearcoat: 1 })
  const water = new THREE.MeshPhysicalMaterial({ color: '#e6ffff', transmission: 1, roughness: .01, thickness: .32, ior: 1.333, clearcoat: 1 })
  function mesh(g: THREE.BufferGeometry, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D = model) {
    const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = true; parent.add(o); return o
  }
  const box = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number) => mesh(new RoundedBoxGeometry(w, h, d, 3, Math.min(.07, h / 4)), m, x, y, z)
  const cylinder = (r: number, h: number, m: THREE.Material, x: number, y: number, z: number, parent?: THREE.Object3D) => mesh(new THREE.CylinderGeometry(r, r, h, 64), m, x, y, z, parent)
  // Cast base, rubber feet, upright and sloped structural arm.
  box(1.8, .25, 2.1, ivory, 0, .22, -.05)
  for (const x of [-.65, .65]) for (const z of [-.8, .7]) cylinder(.14, .13, rubber, x, .065, z)
  box(.72, 1.3, .6, ivory, 0, 1.0, -.67)
  const arm = box(.63, 1.58, .57, ivory, 0, 1.98, -.62); arm.rotation.x = -.27
  box(.77, .45, .9, ivory, 0, 2.56, -.27)
  // Mechanical stage with a real aperture through the metal plate.
  const plate = new THREE.Shape(); plate.moveTo(-.77,-.57);plate.lineTo(.77,-.57);plate.lineTo(.77,.57);plate.lineTo(-.77,.57);plate.closePath()
  const hole = new THREE.Path();hole.absarc(0,.15,.16,0,Math.PI*2,true);plate.holes.push(hole)
  const stage=mesh(new THREE.ExtrudeGeometry(plate,{depth:.12,bevelEnabled:true,bevelThickness:.015,bevelSize:.015,bevelSegments:2}),black,0,1.27,.14);stage.rotation.x=-Math.PI/2
  cylinder(.24,.18,black,0,1.05,0)
  cylinder(.18,.08,steel,0,.92,0)
  const lamp = new THREE.MeshStandardMaterial({ color:'#e9f9ed', emissive:'#c6e8dd', emissiveIntensity:2 })
  cylinder(.28,.06,black,0,.4,0);cylinder(.2,.016,lamp,0,.441,0)
  const transmitted = new THREE.PointLight('#cdefff',1.7,2);transmitted.position.set(0,.7,0);model.add(transmitted)
  // Slide, cover slip and spring clips.
  box(1.25,.025,.44,glass,0,1.41,.25)
  box(.34,.012,.32,glass,.25,1.432,.25)
  for(const x of [-.52,.52]) { box(.08,.028,.53,steel,x,1.45,.2);cylinder(.055,.04,steel,x,1.445,-.08) }
  // Coarse/fine focus knobs and mechanical-stage adjustment.
  for(const side of [-1,1]) {
    const knob=cylinder(.24,.16,rubber,side*.49,1.62,-.66);knob.rotation.z=Math.PI/2
    const fine=cylinder(.12,.22,black,side*.59,1.62,-.66);fine.rotation.z=Math.PI/2
    for(let i=0;i<32;i++){const a=i/32*Math.PI*2;const rib=box(.17,.025,.018,black,side*.49,1.62+Math.sin(a)*.238,-.66+Math.cos(a)*.238);rib.rotation.x=-a}
  }
  cylinder(.09,.32,black,.68,1.05,.3)
  // Revolving nosepiece with three individual objective barrels.
  cylinder(.28,.13,steel,0,2.31,.08)
  for(let i=0;i<3;i++) {
    const a=i/3*Math.PI*2, x=Math.sin(a)*.19, z=.08+Math.cos(a)*.19
    const h=[.53,.39,.3][i]
    cylinder(.09,h,steel,x,2.21-h/2,z)
    cylinder(.094,.055,i===0?brass:black,x,2.17-h*.55,z)
    cylinder(.065,.08,black,x,2.17-h,z)
    cylinder(.05,.01,lens,x,2.125-h,z)
  }
  // Inclined monocular head, optical tube, ribbed eyecup and recessed ocular glass.
  const tube = new THREE.Group();tube.position.set(0,2.67,-.08);tube.rotation.x=.55;model.add(tube)
  cylinder(.26,.35,ivory,0,.07,0,tube)
  cylinder(.15,.66,black,0,.51,0,tube)
  cylinder(.18,.16,steel,0,.87,0,tube)
  cylinder(.205,.13,rubber,0,1.0,0,tube)
  const eyecup=mesh(new THREE.TorusGeometry(.168,.045,16,64),rubber,0,1.09,0,tube);eyecup.rotation.x=Math.PI/2
  cylinder(.14,.01,lens,0,1.085,0,tube)
  for(let i=0;i<8;i++) {const ridge=mesh(new THREE.TorusGeometry(.153,.008,6,48),black,0,.63+i*.023,0,tube);ridge.rotation.x=Math.PI/2}
  // Small manufacturer-free instrument plaque.
  const labelCanvas=document.createElement('canvas');labelCanvas.width=512;labelCanvas.height=128
  const context=labelCanvas.getContext('2d')!;context.fillStyle='#283739';context.fillRect(0,0,512,128);context.fillStyle='#bccdc8';context.font='24px monospace';context.fillText('RIPPLE / OPTICAL STUDY',24,55);context.font='17px monospace';context.fillText('01   COMPOUND MICROSCOPE',24,93)
  const labelTexture=new THREE.CanvasTexture(labelCanvas);labelTexture.colorSpace=THREE.SRGBColorSpace
  mesh(new THREE.PlaneGeometry(.75,.185),new THREE.MeshStandardMaterial({map:labelTexture,roughness:.5}),0,.24,1.008)
  const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#10191c',roughness:.46,metalness:.28}),0,-.005,0,scene);floor.rotation.x=-Math.PI/2
  const key=new THREE.DirectionalLight('#e5efff',3.3);key.position.set(3,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-4;key.shadow.camera.right=4;key.shadow.camera.top=5;key.shadow.camera.bottom=-3;key.shadow.normalBias=.025;scene.add(key)
  const rim=new THREE.DirectionalLight('#90d7ce',2);rim.position.set(-4,3,-4);scene.add(rim)
  // Drop lands on the exposed right side of the slide, not through an objective.
  const drop=mesh(new THREE.SphereGeometry(.105,40,32),water,.32,3.1,.36);drop.scale.set(.75,1.4,.75)
  const wet=mesh(new THREE.SphereGeometry(.19,40,20),water,.32,1.462,.36);wet.scale.set(1,.12,1);wet.visible=false
  const splash=mesh(new THREE.TorusGeometry(.14,.011,8,64),water,.32,1.464,.36);splash.rotation.x=Math.PI/2;splash.visible=false
  model.updateMatrixWorld(true)
  const ocular=tube.localToWorld(new THREE.Vector3(0,1.1,0))
  const axis=new THREE.Vector3(0,1,0).transformDirection(tube.matrixWorld)
  let timeline: gsap.core.Timeline | null=null, disposed=false
  function render(){if(!disposed){camera.lookAt(target);renderer.render(scene,camera)}}
  function resize(){const r=canvas.getBoundingClientRect();renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();if(!timeline){target.set(camera.aspect<.9?0:-1.15,1.45,0);camera.position.set(5.1,4.2,7.6);if(camera.aspect<.8)camera.position.multiplyScalar(1.12)}render()}
  const observer=new ResizeObserver(resize);observer.observe(canvas);resize()
  canvas.dataset.phase='ready';canvas.dataset.renderer='webgl'
  function play(done:()=>void){
    if(timeline||disposed)return
    timeline=gsap.timeline({onUpdate:render,onComplete:done})
      .call(()=>{canvas.dataset.phase='droplet'})
      .to(drop.position,{y:1.56,duration:1.15,ease:'power2.in'},.15)
      .to(drop.scale,{y:.35,x:1.5,z:1.5,duration:.13},1.28)
      .call(()=>{drop.visible=false;wet.visible=true;splash.visible=true;canvas.dataset.phase='landed'},[],1.41)
      .to(splash.scale,{x:2.7,y:2.7,z:2.7,duration:.55,ease:'power2.out'},1.41)
      .call(()=>{splash.visible=false},[],1.96)
      .call(()=>{canvas.dataset.phase='approach'},[],2.1)
      .to(camera.position,{x:ocular.x+axis.x*2.1,y:ocular.y+axis.y*2.1,z:ocular.z+axis.z*2.1,duration:2,ease:'power2.inOut'},2.1)
      .to(target,{x:ocular.x,y:ocular.y,z:ocular.z,duration:1.6,ease:'power2.inOut'},2.1)
      .to(camera,{fov:42,duration:1.4,ease:'power2.inOut',onUpdate:()=>camera.updateProjectionMatrix()},4.1)
      .call(()=>{canvas.dataset.phase='entering'},[],4.1)
      .to(camera.position,{x:ocular.x+axis.x*.045,y:ocular.y+axis.y*.045,z:ocular.z+axis.z*.045,duration:1.4,ease:'power3.in'},4.1)
      .to(canvas,{opacity:0,duration:.45},5.1)
  }
  return { play, dispose(){disposed=true;timeline?.kill();observer.disconnect();const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m))}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());labelTexture.dispose();environment.dispose();renderer.dispose()} }
}
