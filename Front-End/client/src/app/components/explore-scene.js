import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { places, placeById } from '../data/places.js'

// Renderer, frame loop, geometries, materials and DOM markers share one owner.
export function createExploreScene(canvas, markerRoot, onAction) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'low-power' })
  renderer.shadowMap.enabled = true
  renderer.shadowMap.autoUpdate = false
  renderer.shadowMap.needsUpdate = true
  renderer.shadowMap.type = THREE.PCFShadowMap
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.2
  const scene = new THREE.Scene()
  const camera = new THREE.OrthographicCamera(-18, 18, 14, -14, .1, 150)
  const city = new THREE.Group(), room = new THREE.Group()
  scene.add(city, room); room.visible = false
  const controls = new OrbitControls(camera, canvas)
  controls.enablePan = false; controls.enableDamping = false
  controls.minPolarAngle = .55; controls.maxPolarAngle = 1.12
  controls.minAzimuthAngle = -.25; controls.maxAzimuthAngle = 1.4
  controls.minZoom = .85; controls.maxZoom = 1.5
  controls.enableZoom = false
  canvas.style.touchAction = 'pan-y'
  const geometries = new Set(), materials = new Set(), textures = new Set()
  const reusable = new Map(), batches = new Map(), pickables = [], markers = []
  try {
    let mode = 'city', selected = 'cafe', night = false, reduced = false, quality = 'auto'
    let disposed = false, visible = !document.hidden, frame = 0, trip, previousTime = 0, width = 1, height = 1
    const material = (color, options = {}) => {
      const mat = new THREE.MeshStandardMaterial({ color, roughness: .85, ...options })
      materials.add(mat); return mat
    }
    const colors = {
      cream: material('#f4e9d7'), white: material('#fff7e7'), wall: material('#e5ceb2'), wood: material('#b7845b'),
      terracotta: material('#bd7354'), coral: material('#d79676'), pine: material('#365b4b'), mint: material('#87a08c'),
      sage: material('#afbd96'), grass: material('#b5be9b'), road: material('#8e9893'), pavement: material('#dcd5c7'),
      ink: material('#354c47'), glass: material('#719695', { metalness: .15, roughness: .3 }),
      purple: material('#aa9bbb'), blue: material('#729693'), gold: material('#d0ac65'),
      skin: material('#e9b388'), hair: material('#514337'), black: material('#303f3a'),
      bulb: material('#ffe8b8', { emissive: '#ffc970', emissiveIntensity: 0 }),
    }
    function geometry(kind) {
      if (reusable.has(kind)) return reusable.get(kind)
      const geo = kind === 'box' ? new THREE.BoxGeometry(1, 1, 1)
        : kind === 'soft' ? new RoundedBoxGeometry(1, 1, 1, 2, .09)
          : kind === 'sphere' ? new THREE.SphereGeometry(1, 12, 8)
            : kind === 'cone' ? new THREE.ConeGeometry(1, 1, 12)
              : new THREE.CylinderGeometry(1, 1, 1, 16)
      reusable.set(kind, geo); geometries.add(geo); return geo
    }
    function mesh(kind, scale, position, mat, parent = city, action, rotation = [0, 0, 0]) {
      const item = new THREE.Mesh(geometry(kind), mat)
      item.scale.set(...scale); item.position.set(...position); item.rotation.set(...rotation)
      item.castShadow = true; item.receiveShadow = true
      parent.add(item)
      if (action) { item.userData.action = action; pickables.push(item) }
      return item
    }
    const box = (scale, position, mat, parent, action) => mesh('box', scale, position, mat, parent, action)
    const soft = (scale, position, mat, parent, action) => mesh('soft', scale, position, mat, parent, action)
    const cylinder = (radius, h, position, mat, parent, action) => mesh('cylinder', [radius, h, radius], position, mat, parent, action)
    const sphere = (scale, position, mat, parent) => mesh('sphere', scale, position, mat, parent)
    // Static meshes are merged by material once; interactive parts remain separate.
    function bake(parent) {
      batches.clear(); parent.updateMatrixWorld(true)
      const remove = []
      parent.traverse(item => {
        if (!item.isMesh || item.material.map) return
        const action = item.userData.action
        const key = `${item.parent.uuid}:${item.material.uuid}:${action || ''}`
        if (!batches.has(key)) batches.set(key, { material: item.material, geometry: [], owner: item.parent, action })
        const transformed = item.geometry.index ? item.geometry.toNonIndexed() : item.geometry.clone()
        transformed.applyMatrix4(item.matrix)
        batches.get(key).geometry.push(transformed); remove.push(item)
      })
      pickables.splice(0, pickables.length, ...pickables.filter(item => !remove.includes(item)))
      for (const { material: mat, geometry: parts, owner, action } of batches.values()) {
        const merged = mergeGeometries(parts)
        parts.forEach(part => part.dispose())
        if (!merged) throw new Error('Explore geometry batching failed.')
        geometries.add(merged)
        const item = new THREE.Mesh(merged, mat); item.castShadow = true; item.receiveShadow = true; owner.add(item)
        if (action) { item.userData.action = action; pickables.push(item) }
      }
      remove.forEach(item => item.removeFromParent()); batches.clear()
    }
    function tree(x, z, scale = 1, parent = city) {
      cylinder(.11 * scale, 1.1 * scale, [x, .8 * scale, z], colors.wood, parent)
      sphere([.55 * scale, .85 * scale, .55 * scale], [x, 1.6 * scale, z], colors.sage, parent)
      sphere([.45 * scale, .64 * scale, .45 * scale], [x + .32 * scale, 1.45 * scale, z], colors.mint, parent)
    }
    function plant(x, z, parent, scale = 1) {
      cylinder(.22 * scale, .4 * scale, [x, .4 * scale, z], colors.terracotta, parent)
      cylinder(.055 * scale, .8 * scale, [x, .85 * scale, z], colors.pine, parent)
      for (let i = 0; i < 3; i++) sphere([.22 * scale, .48 * scale, .2 * scale], [x + Math.sin(i * 2) * .15 * scale, (1 + i * .14) * scale, z + Math.cos(i * 2) * .15 * scale], colors.mint, parent)
    }
    // A compact illustrative UB neighbourhood: square, apartments and a curved blue tower.
    soft([25, .8, 20], [0, -.65, 0], colors.grass)
    box([25, .06, 3], [0, -.21, 3.7], colors.road)
    box([2.5, .07, 20], [-11, -.2, 0], colors.road)
    box([2.5, .07, 20], [11, -.2, 0], colors.road)
    box([24, .12, 1.05], [0, -.13, 1.67], colors.pavement)
    box([24, .12, 1.05], [0, -.13, 5.65], colors.pavement)
    for (let x = -10; x <= 10; x += 2) box([.65, .015, .045], [x, -.165, 3.7], colors.white)
    for (const x of [-9.1, 9.1]) for (let z = 2.5; z < 5; z += .5) box([1.4, .02, .2], [x, -.15, z], colors.white)
    box([8, .12, 5], [-1.2, -.08, -6], colors.pavement)
    box([3.2, .08, 3.5], [-1.2, .02, -6.2], colors.cream)
    cylinder(.5, .23, [-1.2, .17, -6.2], colors.wall)
    box([.3, 1.25, .3], [-1.2, .91, -6.2], colors.ink)
    sphere([.23, .23, .23], [-1.2, 1.7, -6.2], colors.gold)
    const skyline = new THREE.Group(); city.add(skyline)
    for (const [x, z, h, mat] of [[-8, -6, 4.9, colors.wall], [-5.2, -7.8, 5.7, colors.pavement], [3.7, -7.8, 4.8, colors.pavement], [7, -6.5, 6.1, colors.blue]]) {
      soft([2.2, h, 2], [x, h / 2, z], mat, skyline)
      box([2.3, .2, 2.1], [x, h + .1, z], colors.cream, skyline)
      for (let y = .9; y < h - .2; y += .72) for (const dx of [-.55, .15, .8]) box([.32, .38, .02], [x + dx, y, z + 1.015], colors.glass, skyline)
    }
    // Curved silhouette echoes the city's blue-glass landmark without loading a model.
    const tower = cylinder(1.25, 7.1, [8.6, 3.55, -7.8], colors.glass)
    tower.scale.z = .65
    for (let y = .65; y < 7.1; y += .65) { const band = cylinder(1.28, .035, [8.6, y, -7.8], colors.cream); band.scale.z = .65 }
    mesh('cone', [1.28, 1.3, .84], [8.6, 7.6, -7.8], colors.glass)
    for (const [x, z, scale] of [[-10, -8, 1.6], [-9.8, -.8, 1], [-4.5, -4, .9], [2, -4.5, .8], [10, -.5, 1.2], [-8, 7, 1], [-4, 7.5, 1.3], [3.8, 7.8, 1.1], [8.8, 7, 1.4]]) tree(x, z, scale)
    for (const x of [-6, 4]) {
      box([1.5, .13, .4], [x, .35, 6.2], colors.wood)
      box([1.5, .35, .09], [x, .61, 6.4], colors.wood)
      for (const dx of [-.55, .55]) box([.08, .4, .3], [x + dx, .1, 6.2], colors.ink)
    }
    function labelTexture(text, background = '#f8efda', foreground = '#365b4b') {
      const surface = document.createElement('canvas'); surface.width = 512; surface.height = 128
      const ctx = surface.getContext('2d'); ctx.fillStyle = background; ctx.fillRect(0, 0, 512, 128)
      ctx.fillStyle = foreground; ctx.font = '600 40px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, 256, 64, 470)
      const texture = new THREE.CanvasTexture(surface); texture.colorSpace = THREE.SRGBColorSpace; textures.add(texture)
      const mat = new THREE.MeshBasicMaterial({ map: texture }); materials.add(mat); return mat
    }
    const buildings = {}
    for (const place of places) {
      const x = place.x, action = `place:${place.id}`, mat = material(place.color)
      const building = new THREE.Group(); city.add(building); buildings[place.id] = building
      soft([4.8, 2.7, 3.2], [x, 1.3, -.3], colors.cream, building, action)
      box([5, .28, 3.5], [x, 2.78, -.3], mat, building, action)
      box([5.12, .13, 3.6], [x, 2.98, -.3], colors.cream, building)
      box([4.5, .54, .05], [x, 2.3, 1.35], labelTexture(place.id === 'cafe' ? 'БУЛАН · КАФЕ' : place.id === 'home' ? 'HAMTRY · HOME' : 'ДУРСАМЖ · ГАЛЕРЕЙ'), building, action)
      for (const dx of [-1.6, 1.6]) {
        box([1, 1.25, .04], [x + dx, 1.1, 1.34], colors.glass, building, action)
        for (const offset of [-.5, 0, .5]) box([.055, 1.3, .09], [x + dx + offset, 1.1, 1.38], colors.white, building)
        box([1.12, .055, .08], [x + dx, .48, 1.38], colors.white, building)
      }
      box([.83, 1.7, .08], [x, .82, 1.4], colors.pine, building, action)
      box([.62, 1.1, .02], [x, 1.02, 1.46], colors.glass, building, action)
      cylinder(.04, .22, [x + .26, .74, 1.49], colors.gold, building)
      box([1.2, .12, .5], [x, -.04, 1.65], colors.white, building)
      if (place.id === 'cafe') {
        for (let i = 0; i < 8; i++) { const awning = box([.58, .1, .95], [x - 2.03 + i * .58, 1.93, 1.65], i % 2 ? colors.cream : mat, building); awning.rotation.x = .2 }
        cylinder(.38, .08, [x - 2.8, .7, 1.4], colors.wood, building)
        cylinder(.065, .7, [x - 2.8, .31, 1.4], colors.ink, building)
        for (const z of [.8, 2]) { cylinder(.22, .08, [x - 2.8, .43, z], mat, building); cylinder(.06, .45, [x - 2.8, .15, z], colors.ink, building) }
      }
      if (place.id === 'home') {
        box([3.4, 1.9, 2.6], [x, 3.86, -.45], colors.wall, building, action)
        for (const dx of [-.85, .85]) box([.85, 1.05, .025], [x + dx, 3.9, .865], colors.glass, building, action)
        box([3.7, .23, 2.9], [x, 4.94, -.45], mat, building)
        box([1.8, .1, .62], [x, 3.2, 1.15], colors.pine, building)
      }
      plant(x + 2.5, 1.4, building, .7)
    }
    // Street lamps: emissive globes, without expensive point-light shadows.
    for (const x of [-9.7, -3.5, 3.6, 9.7]) {
      cylinder(.045, 2.4, [x, 1.1, 5.85], colors.pine)
      sphere([.16, .18, .16], [x, 2.42, 5.85], colors.bulb)
    }
    bake(city)
    const car = new THREE.Group(); city.add(car)
    car.position.set(-8.8, 0, 3.3)
    soft([2.15, .5, 1.12], [0, .48, 0], colors.coral, car)
    soft([1.1, .4, 1.02], [-.13, .85, 0], colors.cream, car)
    box([.57, .25, 1.04], [-.15, .87, 0], colors.glass, car)
    soft([1.3, .08, 1.08], [-.13, 1.09, 0], colors.cream, car)
    for (const x of [-.69, .69]) for (const z of [-.55, .55]) {
      mesh('cylinder', [.23, .14, .23], [x, .28, z], colors.black, car, undefined, [Math.PI / 2, 0, 0])
      mesh('cylinder', [.1, .15, .1], [x, .28, z], colors.cream, car, undefined, [Math.PI / 2, 0, 0])
    }
    for (const z of [-.33, .33]) box([.025, .12, .22], [1.08, .55, z], colors.bulb, car)
    sphere([.17, .18, .17], [-.08, 1.25, -.16], colors.skin, car)
    sphere([.18, .11, .18], [-.08, 1.39, -.16], colors.hair, car)
    const character = new THREE.Group(); city.add(character); character.visible = false
    cylinder(.16, .42, [0, .56, 0], colors.pine, character)
    sphere([.19, .2, .19], [0, .97, 0], colors.skin, character)
    sphere([.2, .11, .2], [0, 1.09, 0], colors.hair, character)
    for (const x of [-.1, .1]) box([.12, .35, .14], [x, .18, 0], colors.ink, character)
    bake(car); bake(character)
    // Cutaway interior with a common furniture vocabulary across all three places.
    soft([8.4, .4, 6.4], [0, -.26, 0], colors.wood, room)
    box([8.2, .07, 6.2], [0, -.015, 0], colors.cream, room)
    box([8.4, 3.9, .14], [0, 1.85, -3.15], colors.wall, room)
    box([.14, 3.9, 6.4], [-4.15, 1.85, 0], colors.wall, room)
    box([8.45, .1, .18], [0, 3.86, -3.15], colors.wood, room)
    box([.18, .1, 6.4], [-4.15, 3.86, 0], colors.wood, room)
    // Exit door physically belongs to the back wall and always navigates out.
    box([1.25, 2.65, .14], [2.78, 1.25, -3.02], colors.pine, room, 'door')
    box([.92, 1.45, .08], [2.78, 1.5, -2.91], colors.glass, room, 'door')
    cylinder(.055, .25, [3.16, .95, -2.82], colors.gold, room, 'door')
    box([1.22, .35, .04], [2.78, 3.04, -3.05], labelTexture('ХОТ РУУ'), room, 'door')
    // Window lets evening/daylight visibly change the same room.
    box([.05, 2, 2.6], [-4.05, 2.05, -.5], colors.glass, room, 'lamp')
    for (const z of [-1.83, -.5, .83]) box([.09, 2.14, .06], [-3.98, 2.05, z], colors.cream, room)
    for (const y of [1, 3.1]) box([.09, .06, 2.7], [-3.98, y, -.5], colors.cream, room)
    soft([3.4, .035, 2.6], [-.5, .05, .6], colors.sage, room)
    const sofa = new THREE.Group(); room.add(sofa)
    soft([2.7, .48, 1.05], [-1, .48, -.15], colors.coral, sofa, 'sofa')
    soft([2.8, .85, .2], [-1, .95, -.65], colors.coral, sofa, 'sofa')
    for (const x of [-2.37, .37]) soft([.22, .65, 1.04], [x, .8, -.15], colors.coral, sofa, 'sofa')
    for (const x of [-1.66, -.34]) soft([1.14, .13, .89], [x, .78, -.1], colors.cream, sofa, 'sofa')
    soft([.47, .46, .13], [-1.86, 1.15, -.35], colors.pine, sofa, 'sofa').rotation.z = .15
    cylinder(.78, .13, [-.8, .77, 1.48], colors.wood, room, 'menu')
    cylinder(.18, .73, [-.8, .37, 1.48], colors.pine, room)
    box([.52, .045, .67], [-.8, .88, 1.48], colors.cream, room, 'menu')
    box([.29, .013, .04], [-.8, .907, 1.37], colors.terracotta, room, 'menu')
    cylinder(.1, .16, [-1.24, .92, 1.55], colors.white, room)
    cylinder(.071, .005, [-1.24, 1.008, 1.55], colors.wood, room)
    const shelf = new THREE.Group(); room.add(shelf)
    box([2.5, 2.5, .48], [-1.28, 1.28, -2.82], colors.wood, shelf, 'shelf')
    box([2.28, 2.28, .05], [-1.28, 1.28, -2.53], colors.wall, shelf, 'shelf')
    for (const y of [.3, 1, 1.75, 2.5]) box([2.5, .08, .55], [-1.28, y, -2.56], colors.wood, shelf, 'shelf')
    for (let i = 0; i < 12; i++) {
      const x = -2.24 + (i % 6) * .32, y = (i < 6 ? .68 : 1.42)
      box([.15 + (i % 2) * .06, .45 + (i % 3) * .06, .28], [x, y, -2.42], [colors.pine, colors.coral, colors.purple, colors.cream][i % 4], shelf, 'shelf')
    }
    box([1.7, .13, .85], [2.35, .97, .3], colors.wood, room, 'desk')
    for (const x of [1.7, 3]) for (const z of [.02, .6]) box([.08, .97, .08], [x, .45, z], colors.pine, room)
    box([.65, .42, .04], [2.35, 1.3, .1], colors.ink, room, 'desk')
    box([.68, .035, .42], [2.35, 1.06, .31], colors.pine, room, 'desk')
    soft([.7, .09, .72], [2.35, .6, 1.16], colors.mint, room, 'desk')
    soft([.72, .56, .12], [2.35, .88, 1.5], colors.mint, room, 'desk')
    for (const x of [2.12, 2.58]) box([.065, .57, .065], [x, .26, 1.2], colors.wood, room)
    const lamp = new THREE.Group(); room.add(lamp)
    cylinder(.25, .07, [.78, .05, -1.17], colors.gold, lamp, 'lamp')
    cylinder(.045, 2.2, [.78, 1.14, -1.17], colors.gold, lamp, 'lamp')
    mesh('cone', [.46, .65, .46], [.78, 2.45, -1.17], colors.cream, lamp, 'lamp')
    sphere([.2, .12, .2], [.78, 2.13, -1.17], colors.bulb, lamp).userData.action = 'lamp'
    const art = new THREE.Group(); room.add(art)
    box([1.6, 1.3, .1], [.95, 2.26, -3.01], colors.wood, art, 'art')
    box([1.4, 1.1, .08], [.95, 2.26, -2.92], colors.cream, art, 'art')
    sphere([.36, .36, .02], [1.18, 2.39, -2.865], colors.coral, art)
    box([1.4, .3, .04], [.95, 1.88, -2.855], colors.mint, art)
    plant(-3.42, 2.18, room, 1.2); plant(3.45, -1.9, room, .8)
    bake(room)
    // Shadow budget is a single map; lighting only redraws when an input changes.
    const ambient = new THREE.HemisphereLight('#fff0d5', '#8eaa91', 2.8); scene.add(ambient)
    const sun = new THREE.DirectionalLight('#fff0d0', 3.5)
    sun.position.set(-10, 22, 15); sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    Object.assign(sun.shadow.camera, { left: -18, right: 18, top: 18, bottom: -18, near: .5, far: 60 })
    sun.shadow.normalBias = .07; sun.shadow.bias = -.0003; scene.add(sun)
    const lampLight = new THREE.PointLight('#ffbd70', 0, 9, 2); lampLight.position.set(.78, 2.12, -1.17); room.add(lampLight)
    const selectionMaterial = new THREE.MeshBasicMaterial({ color: '#f0c791', transparent: true, opacity: .7, depthWrite: false })
    materials.add(selectionMaterial)
    const selectionGeometry = new THREE.RingGeometry(.62, .7, 32); geometries.add(selectionGeometry)
    const selection = new THREE.Mesh(selectionGeometry, selectionMaterial)
    selection.rotation.x = -Math.PI / 2; selection.position.set(-7, -.015, 1.9); city.add(selection)
    function addMarker(action, label, point, parent, extra = {}) {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'marker'; button.textContent = label
      const click = () => onAction(action)
      button.addEventListener('click', click); markerRoot.append(button)
      markers.push({ button, click, point: new THREE.Vector3(...point), parent, action, ...extra })
    }
    for (const place of places) addMarker(`place:${place.id}`, place.name, [place.x, place.id === 'home' ? 5.2 : 3.3, -.2], city)
    addMarker('door', 'Хаалгаар орох →', [0, 1.6, 1.45], city, { entrance: true })
    addMarker('door', 'Хот руу →', [2.78, 3.5, -3], room)
    addMarker('lamp', 'Гэрэл', [.78, 2.95, -1.17], room)
    addMarker('shelf', 'Хадгалсан', [-1.3, 2.9, -2.7], room)
    addMarker('menu', 'Хамтрагчид', [-.8, 1.2, 1.48], room, { forPlace: 'cafe' })
    addMarker('sofa', 'Өрөөнүүд', [-1, 1.6, -.4], room, { forPlace: 'home' })
    addMarker('desk', 'Өрөө санал болгох', [2.35, 1.7, .3], room, { forPlace: 'home' })
    addMarker('art', 'Өрөөнүүд', [.95, 3.05, -2.9], room, { forPlace: 'gallery' })
    const projected = new THREE.Vector3()
    function projectMarkers() {
      for (const marker of markers) {
        const show = marker.parent.visible && (!marker.forPlace || marker.forPlace === selected) && (!marker.entrance || character.visible)
        marker.button.hidden = !show
        if (!show) continue
        if (marker.entrance) marker.point.x = placeById(selected).x
        projected.copy(marker.point).applyMatrix4(marker.parent.matrixWorld).project(camera)
        let x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height
        if (width < 680 && marker.parent === city && !marker.entrance) {
          if (marker.action === 'place:cafe') { x -= 8; y -= 35 }
          else if (marker.action === 'place:home') y += 8
          else y += 30
        }
        marker.button.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`
        marker.button.hidden = Math.abs(projected.x) > .98 || Math.abs(projected.y) > .98
        if (marker.action.startsWith('place:')) marker.button.setAttribute('aria-pressed', String(marker.action === `place:${selected}`))
      }
    }
    function draw(updateShadows = false) {
      if (disposed || !visible || renderer.getContext().isContextLost()) return
      if (updateShadows) renderer.shadowMap.needsUpdate = true
      renderer.render(scene, camera); projectMarkers()
    }
    function fit() {
      const aspect = width / height, small = width < 680
      const span = mode === 'city' ? Math.max(14.6, 36 / (2 * aspect)) : Math.max(5.5, (small ? 13 : 11) / (2 * aspect))
      const offset = mode === 'city' ? (small ? 8.5 : width < 1000 ? 2 : 0) : 0
      camera.left = -span * aspect; camera.right = span * aspect; camera.top = span + offset; camera.bottom = -span + offset
      camera.updateProjectionMatrix()
    }
    function resetView() {
      controls.target.set(0, mode === 'city' ? .4 : 1, mode === 'city' ? -.1 : 0)
      camera.position.set(mode === 'city' ? 25 : 12, mode === 'city' ? 28 : 13, mode === 'city' ? 30 : 15)
      camera.zoom = 1; fit(); controls.update(); draw()
    }
    function finishTravel() {
      if (!trip) return
      const current = trip; trip = undefined; cancelAnimationFrame(frame); frame = 0
      car.position.set(current.target, 0, 3.3)
      character.position.set(current.target, 0, 1.87); character.visible = true
      draw(true); current.done()
    }
    function tick(now) {
      frame = 0
      if (!trip || !visible || disposed) return
      const dt = Math.min((now - (previousTime || now)) / 1000, .06); previousTime = now
      trip.elapsed += dt
      const t = Math.min(trip.elapsed / trip.duration, 1), easing = t * t * (3 - 2 * t)
      car.position.x = THREE.MathUtils.lerp(trip.from, trip.target, easing)
      draw(true)
      if (t === 1) finishTravel()
      else frame = requestAnimationFrame(tick)
    }
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2()
    let pointerDown
    function hit(event) {
      const bounds = canvas.getBoundingClientRect()
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1)
      raycaster.setFromCamera(pointer, camera)
      const actions = new Set(['door', 'lamp', ...placeById(selected).actions.map(([action]) => action)])
      return raycaster.intersectObjects(pickables.filter(item => {
        if (!item.parent) return false
        for (let ancestor = item; ancestor; ancestor = ancestor.parent) if (!ancestor.visible) return false
        return mode === 'city' || actions.has(item.userData.action)
      }))[0]?.object.userData.action
    }
    const down = event => { pointerDown = [event.clientX, event.clientY] }
    const up = event => {
      if (!pointerDown || Math.hypot(event.clientX - pointerDown[0], event.clientY - pointerDown[1]) > 7) { pointerDown = undefined; return }
      pointerDown = undefined
      const action = hit(event)
      if (action) onAction(action)
    }
    const hover = event => { if (event.pointerType !== 'touch') canvas.style.cursor = hit(event) ? 'pointer' : 'grab' }
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointermove', hover)
    const controlsChange = () => draw()
    controls.addEventListener('change', controlsChange)
    function applyQuality() {
      const low = quality === 'low' || (quality === 'auto' && (width < 680 || navigator.connection?.saveData))
      const ratio = Math.min(devicePixelRatio || 1, low ? 1 : quality === 'high' ? 2 : 1.5)
      if (renderer.getPixelRatio() !== ratio) renderer.setPixelRatio(ratio)
      renderer.shadowMap.enabled = !low
    }
    resetView()
    return {
      renderer,
      resize(w, h) {
        if (!w || !h || disposed) return
        width = w; height = h; applyQuality(); renderer.setSize(w, h, false); fit(); draw(true)
      },
      update(options) {
        if (disposed) return
        const changedMode = options.mode !== mode, changedPlace = options.place !== selected
        mode = options.mode; selected = options.place; night = options.night; reduced = options.reduced
        city.visible = mode === 'city'; room.visible = mode === 'inside'
        selection.position.x = placeById(selected).x
        quality = options.quality; applyQuality()
        scene.background = new THREE.Color(night ? '#273d3a' : '#f4efe6')
        ambient.intensity = night ? 1.15 : 2.8; sun.intensity = night ? .65 : 3.5
        sun.color.set(night ? '#91afc1' : '#fff0d0')
        lampLight.intensity = night ? 14 : 0; colors.bulb.emissiveIntensity = night ? 2.5 : 0
        if (changedPlace && mode === 'city') character.visible = false
        // Furniture action is visible only where it makes sense; inactive pieces stay decorative.
        sofa.visible = selected !== 'gallery'; art.visible = selected !== 'cafe'
        if (changedMode) { cancelAnimationFrame(frame); frame = 0; trip = undefined; resetView() }
        if (reduced && trip) finishTravel()
        draw(true)
      },
      resetView,
      travelTo(id, done) {
        cancelAnimationFrame(frame); character.visible = false
        const target = placeById(id).x
        car.rotation.y = target < car.position.x ? Math.PI : 0
        trip = { from: car.position.x, target, elapsed: 0, duration: Math.max(1.3, Math.abs(target - car.position.x) / 5), done }
        previousTime = 0
        if (reduced) finishTravel()
        else if (visible) frame = requestAnimationFrame(tick)
      },
      finishTravel,
      cancelTravel() { cancelAnimationFrame(frame); frame = 0; trip = undefined; draw() },
      setVisible(value) {
        visible = value; cancelAnimationFrame(frame); frame = 0; previousTime = 0
        if (visible) { draw(); if (trip) frame = requestAnimationFrame(tick) }
      },
      dispose() {
        if (disposed) return
        disposed = true; cancelAnimationFrame(frame); controls.removeEventListener('change', controlsChange); controls.dispose()
        canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointerup', up); canvas.removeEventListener('pointermove', hover)
        for (const marker of markers) { marker.button.removeEventListener('click', marker.click); marker.button.remove() }
        sun.shadow.dispose(); textures.forEach(texture => texture.dispose()); geometries.forEach(geo => geo.dispose()); materials.forEach(mat => mat.dispose())
        renderer.dispose(); renderer.forceContextLoss()
      },
    }
  } catch (error) {
    // Initialization failure still releases the renderer and partial GPU resources.
    controls.dispose(); markerRoot.replaceChildren()
    scene.traverse(item => item.shadow?.dispose())
    textures.forEach(texture => texture.dispose()); geometries.forEach(geo => geo.dispose()); materials.forEach(mat => mat.dispose())
    renderer.dispose(); renderer.forceContextLoss()
    throw error
  }
}
