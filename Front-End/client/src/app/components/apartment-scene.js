import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

// Scene зөвхөн өөрийн geometry/material/context-ийг эзэмшинэ. Remove үед бүгдийг чөлөөлнө.
export function createApartmentScene(canvas, host, onSelect) {
  const context = canvas.getContext('webgl2', { antialias: true, alpha: true })
  if (!context) throw new Error('WebGL2 unavailable')
  const renderer = new THREE.WebGLRenderer({ canvas, context, antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(32, 1, .1, 100)
  camera.position.set(8, 8.5, 10)
  const controls = new OrbitControls(camera, canvas)
  controls.target.set(0, .65, 0)
  controls.enableZoom = false
  controls.enablePan = false
  controls.minPolarAngle = Math.PI / 6
  controls.maxPolarAngle = Math.PI * .42
  controls.minAzimuthAngle = -.9
  controls.maxAzimuthAngle = Math.PI * .8
  controls.update()
  canvas.style.touchAction = 'pan-y'
  const model = new THREE.Group()
  scene.add(model)
  const geometries = new Set(), materials = new Set(), themed = []
  let frame = 0, disposed = false, motion = false, speed = .18, selected = 'living', time = 0, lastTime = 0
  const palette = () => {
    const css = getComputedStyle(host)
    const color = token => new THREE.Color(css.getPropertyValue(token).trim())
    return { paper: color('--text-inverse').lerp(color('--surface-base'), .12), lime: color('--brand-accent-lime'), pink: color('--brand-accent-pink'), ink: color('--brand-primary'), muted: color('--text-secondary') }
  }
  const swatch = (name, colors) => name === 'wood' ? colors.paper.clone().lerp(colors.pink, .25) : colors[name]
  function material(name, extra = {}) {
    const mat = new THREE.MeshStandardMaterial({ color: swatch(name, palette()), roughness: .7, ...extra })
    materials.add(mat); themed.push({ mat, name }); return mat
  }
  const paper = material('paper'), wood = material('wood'), pink = material('pink'), lime = material('lime'), ink = material('ink'), muted = material('muted')
  const glass = new THREE.MeshPhysicalMaterial({ color: palette().paper, roughness: .1, metalness: .05, transmission: .4, thickness: .12, transparent: true, opacity: .55 })
  materials.add(glass); themed.push({ mat: glass, name: 'paper' })
  function box(size, position, mat, radius = .025, parent = model) {
    const geometry = new RoundedBoxGeometry(...size, 2, Math.min(radius, Math.min(...size) / 3))
    geometries.add(geometry)
    const mesh = new THREE.Mesh(geometry, mat)
    mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true
    parent.add(mesh); return mesh
  }
  function cylinder(radius, height, position, mat, parent = model) {
    const geo = new THREE.CylinderGeometry(radius, radius * .9, height, 16)
    geometries.add(geo)
    const mesh = new THREE.Mesh(geo, mat); mesh.position.set(...position); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh
  }
  box([6.4, .22, 4.8], [0, 0, 0], wood, .08)
  box([6.25, .035, 4.65], [0, .14, 0], paper)
  // Арын ханатай, урд тал нь нээлттэй cutaway: доторх орон зай харагдана.
  box([6.4, 1.8, .13], [0, 1.0, -2.35], paper)
  box([.13, 1.8, 4.8], [-3.15, 1.0, 0], paper)
  box([.1, 1.25, 2.25], [-.85, .76, -1.2], paper)
  box([6.1, .09, .08], [0, 1.93, -2.35], wood)
  box([.08, .09, 4.5], [-3.15, 1.93, 0], wood)
  // Хувийн өрөө: ор, зөөлөн хөнжил, шүүгээ, bedside гэрэл.
  box([1.65, .32, 2.2], [-2, .34, -.65], wood, .07)
  box([1.62, .22, 2.12], [-2, .59, -.65], paper, .11)
  box([1.64, .08, 1.38], [-2, .73, -.3], pink, .03)
  box([.61, .15, .4], [-2.42, .8, -1.38], paper, .08)
  box([.61, .15, .4], [-1.61, .8, -1.38], paper, .08)
  box([1.77, 1, .11], [-2, .7, -1.8], lime, .05)
  box([.4, .48, .5], [-1, .4, -1.6], wood)
  cylinder(.11, .22, [-1, .75, -1.6], paper)
  box([1.6, .08, .65], [-2.0, .82, -2.04], wood)
  box([.6, .05, .3], [-2.0, .88, -2.04], muted)
  box([.5, .48, .045], [-2.0, 1.15, -2.16], ink)
  // Зочны хэсэг: хивс, буйдан, ширээ, жижиг ном.
  box([2.7, .025, 2.3], [.85, .17, .82], lime)
  box([2.25, .4, .85], [.8, .4, .25], pink, .12)
  box([2.3, .58, .2], [.8, .73, -.18], pink, .07)
  box([.18, .46, .87], [-.33, .56, .25], pink, .05)
  box([.18, .46, .87], [1.93, .56, .25], pink, .05)
  box([.93, .14, .65], [.29, .69, .25], paper, .08)
  box([.93, .14, .65], [1.28, .69, .25], paper, .08)
  cylinder(.55, .1, [.85, .62, 1.4], wood)
  cylinder(.2, .4, [.85, .36, 1.4], paper)
  box([.24, .06, .35], [.98, .71, 1.39], ink)
  cylinder(.07, .13, [.57, .76, 1.4], pink)
  // Гал тогоо болон хоолны ширээ.
  box([2.9, .78, .55], [1.35, .56, -1.96], wood)
  box([3, .08, .66], [1.35, .99, -1.96], paper)
  box([.58, .022, .43], [2.15, 1.04, -1.96], ink)
  for (const x of [2.04, 2.27]) for (const z of [-1.84, -2.07]) cylinder(.068, .025, [x, 1.063, z], muted)
  box([.49, .04, .33], [.5, 1.05, -1.99], muted)
  for (const x of [.2, 1.0, 1.8, 2.6]) box([.024, .48, .055], [x, .7, -1.65], ink)
  box([1.45, .07, .85], [2.03, .78, -.65], wood, .04)
  for (const x of [1.53, 2.53]) for (const z of [-.95, -.35]) box([.06, .57, .06], [x, .46, z], ink)
  for (const z of [-1.28, .02]) {
    box([.53, .065, .52], [2.05, .52, z], pink, .04)
    box([.53, .48, .07], [2.05, .77, z + (z < -1 ? -.22 : .22)], pink, .04)
    for (const x of [1.86, 2.24]) box([.04, .32, .04], [x, .32, z], ink)
  }
  // Цонхны нарийн хүрээ, transparent шил.
  box([.07, 1.2, 1.75], [-3.04, 1.12, -.1], glass)
  for (const z of [-.97, -.1, .77]) box([.055, 1.24, .04], [-2.98, 1.12, z], ink)
  for (const y of [.52, 1.74]) box([.055, .04, 1.8], [-2.98, y, -.1], ink)
  function plant(x, z, scale = 1) {
    cylinder(.14 * scale, .24 * scale, [x, .28, z], paper)
    const geo = new THREE.SphereGeometry(.23 * scale, 12, 10); geometries.add(geo)
    const leaf = new THREE.Mesh(geo, lime); leaf.scale.set(.8, 1.7, .8); leaf.position.set(x, .68 * scale, z); leaf.castShadow = true; model.add(leaf)
  }
  plant(2.75, 1.85, 1.5); plant(-2.75, 1.86, 1); plant(.95, -2.02, .5)
  const zoneDefinitions = { bedroom: [[2.15, 3.9], [-2, .21, -.25]], living: [[2.8, 2.3], [.7, .21, 1.0]], kitchen: [[2.6, 1.6], [1.67, .21, -1.25]] }
  const zones = Object.entries(zoneDefinitions).map(([id, [size, position]]) => {
    const geo = new THREE.PlaneGeometry(...size); geometries.add(geo)
    const mat = new THREE.MeshBasicMaterial({ color: palette().lime, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }); materials.add(mat)
    const plane = new THREE.Mesh(geo, mat); plane.rotation.x = -Math.PI / 2; plane.position.set(...position); plane.userData.space = id; model.add(plane); return plane
  })
  const ambient = new THREE.HemisphereLight(palette().paper, palette().ink, 2.4); scene.add(ambient)
  const light = new THREE.DirectionalLight(palette().paper, 4.1)
  light.position.set(2, 8, 5); light.castShadow = true
  light.shadow.mapSize.set(1024, 1024); light.shadow.camera.left = -5; light.shadow.camera.right = 5; light.shadow.camera.top = 5; light.shadow.camera.bottom = -5; light.shadow.normalBias = .035; scene.add(light)
  const shadowGeo = new THREE.PlaneGeometry(30, 30); geometries.add(shadowGeo)
  const shadowMat = new THREE.ShadowMaterial({ opacity: .2 }); materials.add(shadowMat)
  const shadow = new THREE.Mesh(shadowGeo, shadowMat); shadow.rotation.x = -Math.PI / 2; shadow.position.y = -.16; shadow.receiveShadow = true; scene.add(shadow)
  function draw() { if (!disposed && !renderer.getContext().isContextLost()) renderer.render(scene, camera) }
  function tick(now) {
    frame = 0
    if (!motion || disposed) return
    const delta = Math.min((now - (lastTime || now)) / 1000, .04)
    lastTime = now; time += delta * speed
    model.position.y = Math.sin(time * 2) * .055
    model.rotation.y = Math.sin(time) * .065
    draw(); frame = requestAnimationFrame(tick)
  }
  const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
  let down
  const pointerDown = event => { down = [event.clientX, event.clientY] }
  const pointerUp = event => {
    if (!down || Math.hypot(event.clientX - down[0], event.clientY - down[1]) > 8) return
    const bounds = canvas.getBoundingClientRect()
    pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
    raycaster.setFromCamera(pointer, camera)
    const hit = raycaster.intersectObjects(zones)[0]
    if (hit) onSelect(hit.object.userData.space)
  }
  canvas.addEventListener('pointerdown', pointerDown); canvas.addEventListener('pointerup', pointerUp); controls.addEventListener('change', draw)
  return {
    renderer,
    resize(width, height) {
      if (!width || !height) return
      renderer.setSize(width, height, false); camera.aspect = width / height; camera.updateProjectionMatrix(); draw()
    },
    update({ running, rotationSpeed, space }) {
      motion = running; speed = rotationSpeed; selected = space
      zones.forEach(zone => { zone.material.opacity = zone.userData.space === selected ? .18 : 0 })
      if (!motion) { cancelAnimationFrame(frame); frame = 0; lastTime = 0 }
      else if (!frame) frame = requestAnimationFrame(tick)
      draw()
    },
    recolor() {
      const colors = palette(); themed.forEach(({ mat, name }) => mat.color.copy(swatch(name, colors)))
      ambient.color.copy(colors.paper); ambient.groundColor.copy(colors.ink); light.color.copy(colors.paper)
      zones.forEach(zone => zone.material.color.copy(colors.lime)); draw()
    },
    dispose() {
      disposed = true; cancelAnimationFrame(frame); controls.dispose()
      canvas.removeEventListener('pointerdown', pointerDown); canvas.removeEventListener('pointerup', pointerUp)
      light.shadow.dispose(); geometries.forEach(geometry => geometry.dispose()); materials.forEach(mat => mat.dispose())
      renderer.dispose(); renderer.forceContextLoss()
    },
  }
}
