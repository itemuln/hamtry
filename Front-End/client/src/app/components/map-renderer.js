import { Map as LibreMap, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapCss from 'maplibre-gl/dist/maplibre-gl.css?inline'
setWorkerUrl(workerUrl)
export { mapCss }

// Base tiles нь OpenFreeMap; attribution-ийг MapLibre native control харуулна.
export function createApartmentMap(container, { pick, onSelect, onLocation, onReady, onError }) {
  const map = new LibreMap({ container, style: 'https://tiles.openfreemap.org/styles/positron', center: [106.917, 47.918], zoom: 12.5, attributionControl: true, cooperativeGestures: true,
    locale: {
      'Map.Title': 'Газрын зураг', 'NavigationControl.ZoomIn': 'Газрын зураг томруулах', 'NavigationControl.ZoomOut': 'Газрын зураг жижигрүүлэх',
      'AttributionControl.ToggleAttribution': 'Газрын зургийн эх сурвалж',
      'CooperativeGesturesHandler.MacHelpText': '⌘ дарж байгаад гүйлгэж томруулна',
      'CooperativeGesturesHandler.WindowsHelpText': 'Ctrl дарж байгаад гүйлгэж томруулна',
      'CooperativeGesturesHandler.MobileHelpText': 'Хоёр хуруугаар газрын зургийг хөдөлгөнө',
    },
  })
  map.addControl(new NavigationControl({ showCompass: false }), 'top-right')
  map.on('load', onReady)
  map.on('error', onError)
  const markers = new globalThis.Map()
  let picker
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches
  if (pick) {
    const node = document.createElement('button'); node.type = 'button'; node.className = 'location-pin'; node.textContent = '⌂'; node.setAttribute('aria-label', 'Сонгосон байрны байршил. Чирж өөрчилж болно.')
    picker = new Marker({ element: node, draggable: true }).setLngLat([106.917, 47.918]).addTo(map)
    picker.on('dragend', () => { const p = picker.getLngLat(); onLocation([p.lng, p.lat]) })
    map.on('click', event => { const point = [event.lngLat.lng, event.lngLat.lat]; picker.setLngLat(point); onLocation(point) })
  }
  return {
    map,
    update(items, selected, location) {
      if (pick) { if (location) picker.setLngLat(location); return }
      for (const [id, marker] of markers) if (!items.some(item => item.id === id)) { marker.remove(); markers.delete(id) }
      for (const item of items) {
        if (!item.location) continue
        let marker = markers.get(item.id)
        if (!marker) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'price-pin'; button.dataset.id = item.id
          button.addEventListener('click', event => { event.stopPropagation(); onSelect(item.id) })
          marker = new Marker({ element: button }).setLngLat(item.location).addTo(map); markers.set(item.id, marker)
        }
        const button = marker.getElement(); button.textContent = new Intl.NumberFormat('mn-MN').format(item.price / 1000) + ' мян. ₮'
        button.setAttribute('aria-label', `${item.title} — ${item.price.toLocaleString('mn-MN')} төгрөг, дэлгэрэнгүй`)
        button.setAttribute('aria-pressed', String(selected === item.id))
      }
    },
    fit(items) {
      const points = items.map(item => item.location).filter(Boolean)
      if (!points.length) return
      const lng = points.map(point => point[0]), lat = points.map(point => point[1])
      map.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]], { padding: 65, maxZoom: 15, duration: reduced() ? 0 : 500 })
    },
    resize() { map.resize() },
    dispose() { markers.forEach(marker => marker.remove()); picker?.remove(); map.remove() },
  }
}
