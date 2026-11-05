import { HamtryElement, createMotion, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import { listings } from '../data/listings.js'
import { money, validLocation } from '../state/model.js'
import { createAppState } from '../state/store.js'
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
      </aside><section class="map-stage" aria-label="Улаанбаатарын интерактив газрын зураг"><div class="map-canvas"></div><div class="map-toolbar"><div class="map-settings">
        <button class="map-settings-toggle" type="button" aria-label="Газрын зургийн харагдац: 3D" aria-expanded="false" aria-controls="map-settings-menu"><span class="map-current-icon"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg></span><span class="map-current-label">3D</span><svg class="map-dropdown-chevron" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="m7 10 5 5 5-5"/></svg></button>
        <div class="map-settings-menu" id="map-settings-menu" role="group" aria-label="Газрын зургийн тохиргоо" hidden>
          <div class="map-modes" role="group" aria-label="Газрын зургийн харагдац">
            <button type="button" data-mode="flat" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3Z"/><path d="M9 3v15M15 6v15"/></svg><span>2D зураг</span></button>
            <button type="button" data-mode="city" aria-pressed="true"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="m12 2 9 5v10l-9 5-9-5V7Z"/><path d="m3 7 9 5 9-5M12 12v10"/></svg><span>3D хот</span></button>
            <button type="button" data-mode="globe" aria-pressed="false"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><ellipse cx="12" cy="12" rx="4" ry="9"/><path d="M3 12h18"/></svg><span>Дэлхий</span></button>
          </div>
          <div class="map-settings-extras"><label><input class="buildings" type="checkbox" checked>3D барилгууд</label><button class="reset" type="button">Улаанбаатар руу буцах</button></div>
        </div></div></div><p class="map-status" role="status">Газрын зураг ачаалж байна…</p><div class="room-preview" hidden><button class="close-preview" type="button" aria-label="Дэлгэрэнгүй хаах">×</button><h2></h2><p class="room-meta"></p><strong class="room-price"></strong><p class="room-description"></p><a class="room-link">Зарын дэлгэрэнгүй үзэх →</a></div></section></main></div>`
  }
  setup() {
    const $ = selector => required(selector, this.root)
    const motion = createMotion()
    let items = []
    const status = $('.map-status'), container = $('.map-canvas'), rooms = $('.map-rooms')
    let active = true, mapScene, selected, itemKey = '', mode = 'city', buildings = true, loaded = false, previewClosing = false
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
      if (loaded) {
        setMode('city', false)
        mapScene.map.flyTo({ center: item.location, zoom: 16.2, pitch: 58, bearing: -20, duration: reduced() ? 0 : 1200 })
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
      const nextKey = items.map(item => `${item.id}:${item.location.join(',')}`).join('|')
      if (loaded && this.hasAttribute('embedded') && itemKey !== nextKey) mapScene.fit(items)
      itemKey = nextKey
    })
    useEffect(() => { selected = this.selectedId; mapScene?.update(items, selected) })
    const setMode = (next, move = true) => {
      mode = next
      for (const button of this.root.querySelectorAll('[data-mode]')) button.setAttribute('aria-pressed', String(button.dataset.mode === mode))
      const currentLabel = mode === 'city' ? '3D' : mode === 'flat' ? '2D' : 'Дэлхий'
      $('.map-current-label').textContent = currentLabel
      $('.map-settings-toggle').setAttribute('aria-label', `Газрын зургийн харагдац: ${currentLabel}`)
      $('.map-current-icon').replaceChildren(required(`[data-mode="${mode}"] svg`, this.root).cloneNode(true))
      if (!loaded) return
      const map = mapScene.map
      map.stop(); map.setProjection({ type: mode === 'globe' ? 'globe' : 'mercator' })
      if (move) map.flyTo({ center: [106.917, 47.918], zoom: mode === 'globe' ? 1.8 : 15.5, pitch: mode === 'city' ? 58 : 0, bearing: mode === 'city' ? -20 : 0, duration: reduced() ? 0 : 1200 })
      map.setLayoutProperty('hamtry-buildings', 'visibility', buildings && mode !== 'flat' ? 'visible' : 'none')
    }
    const settings = $('.map-settings'), settingsToggle = $('.map-settings-toggle'), settingsMenu = $('.map-settings-menu')
    const showSettings = open => {
      if ((settingsToggle.getAttribute('aria-expanded') === 'true') === open) return
      settingsToggle.setAttribute('aria-expanded', String(open))
      settingsMenu.hidden = false
      settingsMenu.inert = !open
      motion.play(settingsMenu, {
        opacity: open ? [0, 1] : [1, 0],
        transform: open ? ['translateY(-6px) scale(.98)', 'none'] : ['none', 'translateY(-4px) scale(.99)'],
      }, { duration: open ? 200 : 130, onComplete: () => { settingsMenu.hidden = !open } })
    }
    listen(settingsToggle, 'click', () => showSettings(settingsToggle.getAttribute('aria-expanded') !== 'true'))
    listen(settings, 'focusout', event => { if (!settings.contains(event.relatedTarget)) showSettings(false) })
    listen(settings, 'keydown', event => {
      if (event.key === 'Escape') { event.stopPropagation(); showSettings(false); settingsToggle.focus() }
    })
    listen(document, 'pointerdown', event => { if (!event.composedPath().includes(settings)) showSettings(false) })
    onCleanup(() => { settingsMenu.hidden = true; settingsMenu.inert = false; settingsToggle.setAttribute('aria-expanded', 'false') })
    for (const button of this.root.querySelectorAll('[data-mode]')) listen(button, 'click', () => { setMode(button.dataset.mode); showSettings(false); settingsToggle.focus() })
    listen($('.buildings'), 'change', event => { buildings = event.target.checked; setMode(mode, false) })
    listen($('.reset'), 'click', () => setMode('city'))
    this.fit = entries => { if (loaded) { setMode('city', false); mapScene.fit(entries) } }
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
    onCleanup(() => { active = false; observer.disconnect(); mapScene?.dispose(); mapScene = undefined })
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
    let started = false
    const visibility = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && !started) { started = true; void load() }
    })
    visibility.observe(this)
    onCleanup(() => visibility.disconnect())
  }
}
