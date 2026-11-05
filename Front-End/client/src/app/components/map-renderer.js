import { Map as LibreMap, Marker, NavigationControl, Popup, setWorkerUrl } from 'maplibre-gl'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import mapCss from 'maplibre-gl/dist/maplibre-gl.css?inline'
setWorkerUrl(workerUrl)
export { mapCss }

// Base tiles нь OpenFreeMap; attribution-ийг MapLibre native control харуулна.
export function createApartmentMap(container, { pick, onSelect, onLocation, onReady, onError, showListingDetails = false, zoom = 12.5, pitch = 0, bearing = 0 }) {
  const map = new LibreMap({ container, style: 'https://tiles.openfreemap.org/styles/positron', center: [106.917, 47.918], zoom, pitch, bearing, attributionControl: true, cooperativeGestures: true,
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
  const details = showListingDetails ? new Popup({ closeButton: false, closeOnClick: false, offset: 18, className: 'listing-popup' }) : null
  let closeDetailsTimer, boundPopup
  const cancelClose = () => {
    clearTimeout(closeDetailsTimer)
    details?.getElement()?.classList.remove('is-closing')
  }
  const closeDetails = () => {
    clearTimeout(closeDetailsTimer)
    if (!details?.isOpen()) return
    details.getElement()?.classList.add('is-closing')
    closeDetailsTimer = setTimeout(() => details.remove(), 150)
  }
  const showDetails = item => {
    if (!details || !item) return
    cancelClose()
    const card = document.createElement('article'); card.className = 'map-listing-card'
    const title = document.createElement('strong'); title.textContent = item.title
    const meta = document.createElement('span'); meta.textContent = [item.district, item.area, item.size].filter(Boolean).join(' · ')
    const price = document.createElement('b'); price.textContent = `${new Intl.NumberFormat('mn-MN').format(item.price)} ₮ / сар`
    card.append(title, meta, price)
    details.setLngLat(item.location).setDOMContent(card).addTo(map)
    const popup = details.getElement()
    if (popup !== boundPopup) {
      popup.addEventListener('pointerenter', cancelClose)
      popup.addEventListener('pointerleave', () => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) closeDetails() })
      boundPopup = popup
    }
  }
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
          const button = document.createElement('button'); button.type = 'button'; button.className = showListingDetails ? 'home-pin' : 'price-pin'; button.dataset.id = item.id
          button.addEventListener('click', event => { event.stopPropagation(); showDetails(button.listing); onSelect(button.dataset.id) })
          button.addEventListener('pointerenter', () => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) showDetails(button.listing) })
          button.addEventListener('pointerleave', () => { if (matchMedia('(hover: hover) and (pointer: fine)').matches) closeDetails() })
          button.addEventListener('focus', () => showDetails(button.listing))
          button.addEventListener('blur', closeDetails)
          marker = new Marker({ element: button }).setLngLat(item.location).addTo(map); markers.set(item.id, marker)
        }
        const button = marker.getElement(); button.listing = item
        button.replaceChildren()
        if (showListingDetails) {
          const home = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
          home.setAttribute('viewBox', '0 0 24 24'); home.setAttribute('aria-hidden', 'true')
          const shape = document.createElementNS('http://www.w3.org/2000/svg', 'path')
          shape.setAttribute('fill', 'currentColor'); shape.setAttribute('fill-rule', 'evenodd')
          shape.setAttribute('d', 'M12 2 1 11h3v10h6v-7h4v7h6V11h3L12 2Zm1 17h-2v-5h2v5Z')
          home.append(shape)
          button.append(home)
        } else {
          button.textContent = new Intl.NumberFormat('mn-MN').format(item.price / 1000) + ' мян. ₮'
        }
        button.setAttribute('aria-label', `${item.title} — ${item.price.toLocaleString('mn-MN')} төгрөг, дэлгэрэнгүй`)
        button.setAttribute('aria-pressed', String(selected === item.id))
      }
    },
    fit(items) {
      const points = items.map(item => item.location).filter(Boolean)
      if (!points.length) return
      const lng = points.map(point => point[0]), lat = points.map(point => point[1])
      map.fitBounds([[Math.min(...lng), Math.min(...lat)], [Math.max(...lng), Math.max(...lat)]], { padding: 65, maxZoom: 15, pitch: map.getPitch(), bearing: map.getBearing(), duration: reduced() ? 0 : 500 })
    },
    resize() { map.resize() },
    dispose() { clearTimeout(closeDetailsTimer); details?.remove(); markers.forEach(marker => marker.remove()); picker?.remove(); map.remove() },
  }
}
