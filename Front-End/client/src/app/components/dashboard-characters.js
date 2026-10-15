import * as THREE from 'three'

// Same sphere/cylinder/box character vocabulary as explore-scene.js.
// Render once per person using one WebGL context; reuse the portrait across the dashboard.
export function renderCharacters(host, people) {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true })
  renderer.setSize(160, 200)
  const css = getComputedStyle(host)
  const color = token => new THREE.Color(css.getPropertyValue(token).trim())
  try {
    for (const person of people) {
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(32, .8, .1, 20)
      camera.position.set(1.2, 1.2, 3.1); camera.lookAt(0, .65, 0)
      scene.add(new THREE.HemisphereLight(color('--surface-elevated'), color('--brand-primary'), 2.5))
      const light = new THREE.DirectionalLight(color('--surface-elevated'), 3)
      light.position.set(-2, 4, 5); scene.add(light)
      const skin = color('--brand-accent-lime').lerp(color('--surface-elevated'), .35)
      const materials = [], geometries = []
      const part = (geometry, position, tint, scale = [1, 1, 1]) => {
        const material = new THREE.MeshStandardMaterial({ color: tint, roughness: .8 })
        materials.push(material); geometries.push(geometry)
        const mesh = new THREE.Mesh(geometry, material)
        mesh.position.set(...position); mesh.scale.set(...scale); scene.add(mesh)
        return mesh
      }
      try {
        part(new THREE.CylinderGeometry(.18, .22, .4, 20), [0, .59, 0], color(person.shirt))
        part(new THREE.SphereGeometry(.21, 24, 16), [0, .99, 0], skin, [1, 1.12, 1])
        part(new THREE.SphereGeometry(.22, 24, 16), [0, 1.12, -.025], color('--text-primary'), [1, .55 + person.hair * .15, 1])
        if (person.hair !== 1) part(new THREE.SphereGeometry(.16, 20, 12), [.16, 1.08, -.12], color('--text-primary'))
        for (const x of [-.09, .09]) {
          part(new THREE.BoxGeometry(.13, .34, .15), [x, .23, 0], color('--brand-primary'))
          part(new THREE.SphereGeometry(.08, 16, 12), [x, .08, .045], color('--text-primary'), [1, .5, 1.6])
          part(new THREE.SphereGeometry(.019, 12, 8), [x * .75, 1.01, .195], color('--text-primary'))
          const arm = part(new THREE.CylinderGeometry(.055, .05, .31, 12), [x * 2.7, .59, 0], color(person.shirt))
          arm.rotation.z = x > 0 ? .22 : -.22
          part(new THREE.SphereGeometry(.055, 12, 8), [x * 3, .42, 0], skin)
        }
        renderer.render(scene, camera)
        const src = renderer.domElement.toDataURL('image/png')
        host.querySelectorAll(`[data-person="${person.id}"]`).forEach(node => {
          const image = document.createElement('img'); image.src = src; image.alt = ''; image.width = 160; image.height = 200
          node.replaceChildren(image)
        })
      } finally {
        geometries.forEach(geometry => geometry.dispose()); materials.forEach(material => material.dispose())
      }
    }
  } finally { renderer.dispose(); renderer.forceContextLoss() }
}
