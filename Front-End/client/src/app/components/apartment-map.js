import { HamtryElement, emit, listen, onCleanup, required, signal, useEffect } from '@hamtry/library'
import { validLocation } from '../state/model.js'
import css from './apartment-map.css?inline'
const sheet = new CSSStyleSheet(); sheet.replaceSync(css)
export class HamtryApartmentMap extends HamtryElement {
  entries = signal([])
  selected = signal('')
  point = signal(null)
  status = signal('idle')
  get listings() { return this.entries.get() }
  set listings(value) { this.entries.set(value || []) }
  get selectedId() { return this.selected.get() }
  set selectedId(value) { this.selected.set(value || '') }
  get location() { return this.point.get() }
  set location(value) { this.point.set(validLocation(value) ? value : null) }
  render() {
    this.root.adoptedStyleSheets = [sheet]
    this.root.innerHTML = '<div class="map-frame"><div class="map" role="region" aria-label="Орон сууцны газрын зураг"></div><div class="map-tools"><button type="button" class="fit">Бүх байрыг харах ↗</button></div><div class="map-status" role="status"><span></span><button type="button" class="retry" hidden>Дахин ачаалах</button></div></div>'
  }
  setup() {
    const pick = this.hasAttribute('pick-location')
    let active = true, loading = false, controller, timer
    required('.map-tools', this.root).hidden = pick
    onCleanup(() => { active = false; clearTimeout(timer); controller?.dispose(); this.controller = undefined })
    const load = async () => {
      if (loading || controller) return
      loading = true; this.status.set('loading')
      try {
        const module = await import('./map-renderer.js')
        if (!active) return
        const mapSheet = new CSSStyleSheet(); mapSheet.replaceSync(module.mapCss)
        this.root.adoptedStyleSheets = [mapSheet, sheet]
        controller = module.createApartmentMap(required('.map', this.root), {
          pick,
          onSelect: id => { this.selectedId = id; emit(this, 'hamtry-map-select', { id }) },
          onLocation: location => { this.location = location; emit(this, 'hamtry-location-pick', { location }) },
          onReady: () => { clearTimeout(timer); this.status.set('ready'); if (!pick) controller?.fit(this.listings) },
          onError: () => { if (this.status.get() !== 'ready') this.status.set('error') },
        })
        this.controller = controller
        controller.update(this.listings, this.selectedId, this.location)
        timer = setTimeout(() => { if (active && this.status.get() !== 'ready') this.status.set('error') }, 15000)
      } catch { if (active) this.status.set('error') }
      finally { loading = false }
    }
    const intersection = new IntersectionObserver(entries => { if (entries[0].isIntersecting) void load() }, { rootMargin: '100px' })
    intersection.observe(this); onCleanup(() => intersection.disconnect())
    const resize = new ResizeObserver(() => controller?.resize()); resize.observe(this); onCleanup(() => resize.disconnect())
    listen(required('.fit', this.root), 'click', () => controller?.fit(this.listings))
    listen(required('.retry', this.root), 'click', () => {
      clearTimeout(timer); controller?.dispose(); controller = undefined; this.controller = undefined
      required('.map', this.root).replaceChildren(); void load()
    })
    useEffect(() => {
      const items = this.listings, selected = this.selectedId, location = this.location
      controller?.update(items, selected, location)
      const status = this.status.get()
      this.dataset.mapState = status
      required('.map-status', this.root).hidden = status === 'ready'
      required('.map-status span', this.root).textContent = status === 'error' ? pick ? 'Газрын зураг ачаалсангүй. Доорх координатаар байршлаа оруулна уу.' : 'Газрын зураг ачаалсангүй. Зар болон зургуудыг жагсаалтаас үзэж болно.' : 'Газрын зураг ачаалж байна…'
      required('.retry', this.root).hidden = status !== 'error'
    })
  }
}
