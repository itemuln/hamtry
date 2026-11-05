import { HamtryElement, listen, onCleanup, required } from '@hamtry/library'
import { listings } from '../data/listings.js'
import { money, validLocation } from '../state/model.js'
import { createAppState } from '../state/store.js'
import css from '../immersive-explore.css?inline'
const sheet = new CSSStyleSheet(); sheet.replaceSync(css)

// ImmersiveMap-ийн globe → хот → marker урсгалын веб хувилбар. Swift/Metal код импортлохгүй.
export class HamtryImmersiveExplore extends HamtryElement {
  app = createAppState()
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `<div class="immersive-shell">
      <header><a class="brand" href="/">hamtry.</a><nav aria-label="Үндсэн цэс"><a href="/#rooms">Өрөөнүүд</a><a href="/#roommates">Хамтрагчид</a><a href="/explore.html?view=classic">Өмнөх 3D хот</a></nav></header>
      <main><aside class="explore-panel"><h1>Хот дотроос<br>орон зайгаа ол.</h1><p>Улаанбаатарыг ойроос харж, өрөөний байршлуудтай танилцаарай.</p>
        <div class="map-modes" role="group" aria-label="Газрын зургийн харагдац"><button type="button" data-mode="city" aria-pressed="true">3D хот</button><button type="button" data-mode="flat" aria-pressed="false">2D зураг</button><button type="button" data-mode="globe" aria-pressed="false">Дэлхий</button></div>
        <h2>Өрөөнүүд <span class="count"></span></h2><p class="sample-note">Хичээлийн жишээ зарууд · бодит хаяг биш</p><div class="map-rooms" role="group" aria-label="Өрөөний байршил сонгох"></div>
        <p class="reference">ImmersiveMap-ийн зарчимд тулгуурласан веб хувилбар. <a href="https://github.com/artembobkin/ImmersiveMap" target="_blank" rel="noopener noreferrer">Эх төсөл ↗</a></p>
      </aside><section class="map-stage" aria-label="Улаанбаатарын интерактив газрын зураг"><div class="map-canvas"></div><div class="map-toolbar"><button class="reset" type="button">Улаанбаатар</button><label><input class="buildings" type="checkbox" checked>3D барилгууд</label></div><p class="map-status" role="status">Газрын зураг ачаалж байна…</p><div class="room-preview" hidden><button class="close-preview" type="button" aria-label="Дэлгэрэнгүй хаах">×</button><h2></h2><p class="room-meta"></p><strong class="room-price"></strong><p class="room-description"></p><a class="room-link">Зарын дэлгэрэнгүй үзэх →</a></div></section></main></div>`
  }
  setup() {
    const $ = selector => required(selector, this.root)
    const items = [...listings.filter(item => item.kind === 'rooms'), ...this.app.published.get()].filter(item => validLocation(item.location))
    const status = $('.map-status'), container = $('.map-canvas'), rooms = $('.map-rooms')
    let active = true, mapScene, selected, mode = 'city', buildings = true, loaded = false
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reconnect үед хуучин marker DOM болон canvas-ийг үлдээхгүй.
    container.replaceChildren(); rooms.replaceChildren(); $('.room-preview').hidden = true
    status.hidden = false; status.textContent = 'Газрын зураг ачаалж байна…'
    $('.count').textContent = `(${items.length})`
    const select = id => {
      const item = items.find(item => item.id === id)
      if (!item) return
      selected = id
      for (const node of rooms.children) node.setAttribute('aria-pressed', String(node.dataset.id === id))
      $('.room-preview').hidden = false
      $('.room-preview h2').textContent = item.title
      $('.room-meta').textContent = [item.district, item.area, item.size].filter(Boolean).join(' · ')
      $('.room-price').textContent = `${money(item.price)} / сар`
      $('.room-description').textContent = item.description
      $('.room-link').href = `/#listing/${encodeURIComponent(item.id)}`
      mapScene?.update(items, id)
      if (loaded) {
        setMode('city', false)
        mapScene.map.flyTo({ center: item.location, zoom: 16.2, pitch: 58, bearing: -20, duration: reduced() ? 0 : 1200 })
      }
    }
    for (const item of items) {
      const button = document.createElement('button'); button.type = 'button'; button.dataset.id = item.id; button.setAttribute('aria-pressed', 'false')
      const title = document.createElement('strong'); title.textContent = item.title
      const meta = document.createElement('span'); meta.textContent = `${item.district} · ${money(item.price)}`
      button.append(title, meta); rooms.append(button)
      listen(button, 'click', () => select(item.id))
    }
    if (!items.length) rooms.textContent = 'Байршилтай зар алга. Өрөөнүүд цэснээс үзээрэй.'
    const setMode = (next, move = true) => {
      mode = next
      for (const button of this.root.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode))
      if (!loaded) return
      const map = mapScene.map
      map.stop(); map.setProjection({ type: mode === 'globe' ? 'globe' : 'mercator' })
      if (move) map.flyTo({ center: [106.917, 47.918], zoom: mode === 'globe' ? 1.8 : 15.5, pitch: mode === 'city' ? 58 : 0, bearing: mode === 'city' ? -20 : 0, duration: reduced() ? 0 : 1200 })
      map.setLayoutProperty('hamtry-buildings', 'visibility', buildings && mode !== 'flat' ? 'visible' : 'none')
    }
    for (const button of this.root.querySelectorAll('[data-mode]')) listen(button, 'click', () => setMode(button.dataset.mode))
    listen($('.buildings'), 'change', event => { buildings = event.target.checked; setMode(mode, false) })
    listen($('.reset'), 'click', () => setMode('city'))
    listen($('.close-preview'), 'click', () => { $('.room-preview').hidden = true; rooms.querySelector(`[data-id="${selected}"]`)?.focus() })
    listen(this.root, 'keydown', event => { if (event.key === 'Escape' && !$('.room-preview').hidden) { $('.room-preview').hidden = true; rooms.querySelector(`[data-id="${selected}"]`)?.focus() } })
    const observer = new ResizeObserver(() => mapScene?.resize()); observer.observe(container)
    onCleanup(() => { active = false; observer.disconnect(); mapScene?.dispose(); mapScene = undefined })
    const timer = setTimeout(() => { if (active && !loaded) { status.hidden = false; status.textContent = 'Зураг удаан ачаалж байна. Өрөөний жагсаалт ажиллаж байна.' } }, 12000)
    onCleanup(() => clearTimeout(timer))
    const load = async () => {
      try {
        const { createApartmentMap, mapCss } = await import('../components/map-renderer.js')
        if (!active) return
        const mapSheet = new CSSStyleSheet(); mapSheet.replaceSync(mapCss)
        this.root.adoptedStyleSheets = [mapSheet, sheet]
        mapScene = createApartmentMap(container, { onSelect: select, onLocation() {}, onReady: () => {
          if (!active) return
          const map = mapScene.map
          map.addSource('hamtry-buildings', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
          const before = map.getStyle().layers.find(layer => layer.type === 'symbol' && layer.layout?.['text-field'])?.id
          map.addLayer({ id: 'hamtry-buildings', source: 'hamtry-buildings', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 14, filter: ['!=', ['get', 'hide_3d'], true], paint: {
            'fill-extrusion-color': '#b9c4c9',
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            'fill-extrusion-opacity': .9,
          } }, before)
          loaded = true; clearTimeout(timer); status.hidden = true
          mapScene.update(items, selected); setMode(mode)
        }, onError: () => {
          if (!active) return
          status.hidden = false; status.textContent = 'Зарим зургийн өгөгдөл ачаалагдсангүй. Интернэтээ шалгана уу. Өрөөг жагсаалтаас сонгож болно.'
        } })
        mapScene.update(items, selected)
      } catch {
        mapScene?.dispose(); mapScene = undefined
        if (active) { status.hidden = false; status.textContent = 'Газрын зураг боломжгүй. Өрөөнүүдийг жагсаалтаас сонгож үзээрэй.' }
      }
    }
    void load()
  }
}
