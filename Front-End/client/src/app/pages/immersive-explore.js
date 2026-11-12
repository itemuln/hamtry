import { HamtryElement, createMotion, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import { listings } from '../data/listings.js'
import { money, validLocation } from '../state/model.js'
import { createAppState } from '../state/store.js'
import { createListingBuildings } from '../components/listing-buildings.js'
import css from '../immersive-explore.css?inline'
const sheet = new CSSStyleSheet(); sheet.replaceSync(css)

// ImmersiveMap-ийн globe → хот → marker урсгалын веб хувилбар. Swift/Metal код импортлохгүй.
export class HamtryImmersiveExplore extends HamtryElement {
  app = createAppState()
  entries = signal(null)
  selection = signal('')
  get listings() { return this.entries.get() }
  set listings(value) { this.entries.set(value || []) }
  get selectedId() { return this.selection.get() }
  set selectedId(value) { this.selection.set(value || '') }
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = `<div class="immersive-shell">
      <header><a class="brand" href="/">hamtry.</a><nav aria-label="Үндсэн цэс"><a href="/#rooms">Өрөөнүүд</a><a href="/#roommates">Хамтрагчид</a></nav></header>
      <main><aside class="explore-panel"><h1>Хот дотроос<br>орон зайгаа ол.</h1><p>Улаанбаатарыг ойроос харж, өрөөний байршлуудтай танилцаарай.</p>

        <h2>Өрөөнүүд <span class="count"></span></h2><p class="sample-note">Хичээлийн жишээ зарууд · бодит хаяг биш</p><div class="map-rooms" role="group" aria-label="Өрөөний байршил сонгох"></div>
        <p class="reference">ImmersiveMap-ийн зарчимд тулгуурласан веб хувилбар. <a href="https://github.com/artembobkin/ImmersiveMap" target="_blank" rel="noopener noreferrer">Эх төсөл ↗</a></p>
      </aside><section class="map-stage" aria-label="Улаанбаатарын интерактив газрын зураг"><div class="map-canvas"></div><div class="map-toolbar"><div class="map-modes" role="group" aria-label="Газрын зургийн харагдац"><button type="button" data-mode="city" aria-pressed="true">3D</button><button type="button" data-mode="flat" aria-pressed="false">2D</button></div></div><p class="building-legend"><span aria-hidden="true"></span>Зартай барилга <small>Зааж эсвэл дарж үзээрэй</small></p><p class="map-status" role="status">Газрын зураг ачаалж байна…</p><div class="room-preview" hidden><button class="close-preview" type="button" aria-label="Дэлгэрэнгүй хаах">×</button><h2></h2><p class="room-meta"></p><strong class="room-price"></strong><p class="room-description"></p><a class="room-link">Зарын дэлгэрэнгүй үзэх →</a></div></section></main></div>`
  }
  setup() {
    const $ = selector => required(selector, this.root)
    const motion = createMotion()
    let items = []
    const status = $('.map-status'), container = $('.map-canvas'), rooms = $('.map-rooms')
    let active = true, mapScene, buildings, selected, itemKey = '', mode = 'city', loaded = false, previewClosing = false, pendingFocus = ''
    const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
    // Reconnect үед хуучин marker DOM болон canvas-ийг үлдээхгүй.
    container.replaceChildren(); rooms.replaceChildren(); $('.room-preview').hidden = true
    status.hidden = false; status.textContent = 'Газрын зураг ачаалж байна…'
    $('.count').textContent = `(${items.length})`
    const select = id => {
      const item = items.find(item => item.id === id)
      if (!item) return
      const reveal = $('.room-preview').hidden || selected !== id || previewClosing
      previewClosing = false
      selected = id; this.selectedId = id
      for (const node of rooms.children) node.setAttribute('aria-pressed', String(node.dataset.id === id))
      $('.room-preview').hidden = false
      $('.room-preview h2').textContent = item.title
      $('.room-meta').textContent = [item.district, item.area, item.size].filter(Boolean).join(' · ')
      $('.room-price').textContent = `${money(item.price)} / сар`
      $('.room-description').textContent = item.description
      $('.room-link').href = `/#listing/${encodeURIComponent(item.id)}`
      if (reveal) motion.play($('.room-preview'), { opacity: [.6, 1], transform: ['translateY(12px)', 'none'] }, { duration: 240 })
      mapScene?.update(items, id)
      buildings?.update(items, id)
      if (loaded) {
        setMode(mode, false)
        mapScene.map.flyTo({ center: item.location, zoom: 16.2, pitch: mode === 'flat' ? 0 : 58, bearing: mode === 'flat' ? 0 : -20, duration: reduced() ? 0 : 1200 })
      }
    }
    listen(rooms, 'click', event => {
      const button = event.target.closest('[data-id]')
      if (button) select(button.dataset.id)
    })
    useEffect(() => {
      items = (this.listings ?? [...listings.filter(item => item.kind === 'rooms'), ...this.app.published.get()]).filter(item => validLocation(item.location))
      $('.count').textContent = `(${items.length})`
      rooms.replaceChildren()
      for (const item of items) {
        const button = document.createElement('button'); button.type = 'button'; button.dataset.id = item.id; button.setAttribute('aria-pressed', String(item.id === selected))
        const title = document.createElement('strong'); title.textContent = item.title
        const meta = document.createElement('span'); meta.textContent = `${item.district} · ${money(item.price)}`
        button.append(title, meta); rooms.append(button)
      }
      if (!items.length) rooms.textContent = 'Байршилтай зар алга. Хайлтын нөхцөлөө өөрчилж үзээрэй.'
      if (!items.some(item => item.id === selected)) { selected = undefined; $('.room-preview').hidden = true }
      mapScene?.update(items, selected)
      buildings?.update(items, selected)
      const nextKey = items.map(item => `${item.id}:${item.location.join(',')}`).join('|')
      if (loaded && this.hasAttribute('embedded') && itemKey !== nextKey) mapScene.fit(items)
      itemKey = nextKey
    })
    useEffect(() => { selected = this.selectedId; mapScene?.update(items, selected); buildings?.update(items, selected) })
    const setMode = (next, move = true) => {
      mode = next
      for (const button of this.root.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode))
      $('.building-legend').hidden = mode !== 'city'
      if (!loaded) return
      const map = mapScene.map
      buildings?.setMode(mode === 'city')
      map.resize()
      map.stop(); map.setProjection({ type: 'mercator' })
      if (move) map.flyTo({ center: [106.917, 47.918], zoom: 15.5, pitch: mode === 'city' ? 58 : 0, bearing: mode === 'city' ? -20 : 0, duration: reduced() ? 0 : 1200 })
      map.setLayoutProperty('hamtry-satellite', 'visibility', mode === 'flat' ? 'visible' : 'none')
      map.setLayoutProperty('hamtry-buildings', 'visibility', mode === 'city' ? 'visible' : 'none')
    }
    setMode('city', false)
    for (const button of this.root.querySelectorAll('[data-mode]')) listen(button, 'click', () => setMode(button.dataset.mode))
    this.focusListing = id => {
      pendingFocus = id
      if (loaded) select(id)
    }
    onCleanup(() => { this.focusListing = undefined })
    this.fit = entries => { if (loaded) { setMode(mode, false); mapScene.fit(entries) } }
    onCleanup(() => { this.fit = undefined })
    const closePreview = () => {
      const preview = $('.room-preview')
      if (preview.hidden || previewClosing) return
      previewClosing = true
      motion.play(preview, { opacity: [1, 0], transform: ['none', 'translateY(6px)'] }, {
        duration: 130,
        onComplete: () => { previewClosing = false; preview.hidden = true; container.querySelector(`[data-id="${selected}"]`)?.focus() },
      })
    }
    listen($('.close-preview'), 'click', closePreview)
    listen(this.root, 'keydown', event => { if (event.key === 'Escape' && !$('.room-preview').hidden) closePreview() })
    const observer = new ResizeObserver(() => mapScene?.resize()); observer.observe(container)
    onCleanup(() => { active = false; observer.disconnect(); buildings?.dispose(); buildings = undefined; mapScene?.dispose(); mapScene = undefined })
    let timer
    onCleanup(() => clearTimeout(timer))
    const load = async () => {
      timer = setTimeout(() => { if (active && !loaded) { status.hidden = false; status.textContent = 'Зураг удаан ачаалж байна. Өрөөний жагсаалт ажиллаж байна.' } }, 12000)
      try {
        const { createApartmentMap, mapCss } = await import('../components/map-renderer.js')
        if (!active) return
        const mapSheet = new CSSStyleSheet(); mapSheet.replaceSync(mapCss)
        this.root.adoptedStyleSheets = [mapSheet, sheet]
        mapScene = createApartmentMap(container, { zoom: 15.5, pitch: 58, bearing: -20, onSelect: select, onLocation() {}, onReady: () => {
          if (!active) return
          const map = mapScene.map
          map.addSource('hamtry-buildings', { type: 'vector', url: 'https://tiles.openfreemap.org/planet' })
          const before = map.getStyle().layers.find(layer => layer.type === 'symbol' && layer.layout?.['text-field'])?.id
          map.addLayer({ id: 'hamtry-buildings', source: 'hamtry-buildings', 'source-layer': 'building', type: 'fill-extrusion', minzoom: 14, filter: ['!=', ['get', 'hide_3d'], true], paint: {
            // Өнгийн metadata байвал хэрэглэнэ; байхгүй фасадыг байгалийн дулаан өнгөөр ялгана.
            'fill-extrusion-color': ['to-color', ['get', 'colour'], ['get', 'color'], ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 6], 0, ['to-color', '#d9c7af'], 20, ['to-color', '#c5b19a'], 50, ['to-color', '#a9bcc3'], 100, ['to-color', '#8fa9b8']]],
            'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
            'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
            // Эх source-ийн tile-ийг ачаална; тусгаарласан feature давхарга барилгуудыг зурна.
            'fill-extrusion-opacity': 0,
            'fill-extrusion-vertical-gradient': true,
          } }, before)
          // Дагуулын зураг зөвхөн 2D горимд харагдана.
          map.addSource('hamtry-satellite', {
            type: 'raster',
            tiles: ['https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
            tileSize: 256, maxzoom: 19,
            attribution: 'Imagery © <a href="https://www.esri.com/">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community',
          })
          map.addLayer({ id: 'hamtry-satellite', type: 'raster', source: 'hamtry-satellite', layout: { visibility: 'none' }, paint: { 'raster-saturation': 0, 'raster-fade-duration': 0 } }, 'hamtry-buildings')
          map.setLight({ anchor: 'map', color: '#fff1db', intensity: .45, position: [1.5, 210, 40] })
          buildings = createListingBuildings(map, this.root, select)
          buildings.update(items, selected)
          loaded = true; clearTimeout(timer); status.hidden = true
          mapScene.update(items, selected); setMode(mode)
          if (pendingFocus) select(pendingFocus)
        }, onError: () => {
          if (!active) return
          status.hidden = false; status.textContent = 'Зарим зургийн өгөгдөл ачаалагдсангүй. Интернэтээ шалгана уу. Өрөөг жагсаалтаас сонгож болно.'
        } })
        mapScene.update(items, selected)
      } catch {
        buildings?.dispose(); buildings = undefined
        mapScene?.dispose(); mapScene = undefined
        if (active) { status.hidden = false; status.textContent = 'Газрын зураг боломжгүй. Өрөөнүүдийг жагсаалтаас сонгож үзээрэй.' }
      }
    }
    let started = false
    const visibility = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) { started = true; void load() }
    })
    visibility.observe(this)
    onCleanup(() => visibility.disconnect())
  }
}
