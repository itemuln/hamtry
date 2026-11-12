// Зарын цэг барилгын гадна хүрээнд багтаж, доторх хоосон талбайд ороогүйг шалгана.
export function containsLocation(geometry, point) {
  const inRing = ring => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [x, y] = ring[i], [px, py] = ring[j]
      if ((y > point[1]) !== (py > point[1]) && point[0] < (px - x) * (point[1] - y) / (py - y) + x) inside = !inside
    }
    return inside
  }
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : []
  return polygons.some(([outer, ...holes]) => inRing(outer) && !holes.some(inRing))
}

export function listingFootprints(buildings, items, { includeUnlisted = false } = {}) {
  const features = [], seen = new Set()
  for (const building of buildings) {
    if (building.properties.hide_3d === true) continue
    // Нэг MultiPolygon-д хотын олон тусдаа барилга багтдаг тул хэсэг бүрийг шалгана.
    const polygons = building.geometry.type === 'Polygon' ? [building.geometry.coordinates] : building.geometry.type === 'MultiPolygon' ? building.geometry.coordinates : []
    for (const coordinates of polygons) {
      const geometry = { type: 'Polygon', coordinates }
      const ids = items.filter(item => containsLocation(geometry, item.location)).map(item => item.id)
      if (!ids.length && !includeUnlisted) continue
      const geometryKey = JSON.stringify(geometry)
      if (seen.has(geometryKey)) continue
      seen.add(geometryKey)
      // GeoJSON tile-ийн тоон id нь өөр барилгын feature-state-тай холилдохгүй.
      features.push({ type: 'Feature', id: features.length, geometry, properties: {
        listingIds: ids,
        listed: ids.length > 0,
        height: Math.max(6, Number(building.properties.render_height) || 6) + .15,
        base: Math.max(0, Number(building.properties.render_min_height) || 0),
      } })
    }
  }
  return { type: 'FeatureCollection', features }
}

// Барилга бүр тусдаа feature тул нэг барилгын hover хөршүүдэд нөлөөлөхгүй.
export function createListingBuildings(map, host, onSelect) {
  const source = 'hamtry-listing-buildings'
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const hover = matchMedia('(hover: hover) and (pointer: fine)')
  let items = [], selected, hovered, hoveredBuilding, enabled = true, data = { type: 'FeatureCollection', features: [] }, key = ''
  let refreshFrame = 0, animationFrame = 0
  const values = new Map(), targets = new Map()
  map.addSource(source, { type: 'geojson', data })
  map.addLayer({ id: source, source, type: 'fill-extrusion', minzoom: 14, paint: {
    'fill-extrusion-color': '#294b40',
    'fill-extrusion-height': ['get', 'height'],
    'fill-extrusion-base': ['get', 'base'],
    'fill-extrusion-opacity': 1,
    'fill-extrusion-vertical-gradient': true,
  } })
  const palette = () => {
    const style = getComputedStyle(host.host)
    const primary = style.getPropertyValue('--brand-primary').trim()
    const accent = style.getPropertyValue('--brand-accent-lime').trim()
    const neutral = style.getPropertyValue('--border-default').trim()
    const ground = style.getPropertyValue('--surface-base').trim()
    map.setPaintProperty(source, 'fill-extrusion-color', ['interpolate', ['linear'], ['coalesce', ['feature-state', 'emphasis'], 0], 0, ['case', ['get', 'listed'], primary, neutral], 1, accent])
    for (const layer of map.getStyle().layers) {
      if (layer.type === 'background') map.setPaintProperty(layer.id, 'background-color', ground)
    }
  }
  palette()
  const paint = () => {
    cancelAnimationFrame(animationFrame)
    animationFrame = 0
    const changes = [...targets].filter(([id, target]) => (values.get(id) || 0) !== target)
    if (!changes.length) return
    const starts = new Map(values), start = performance.now()
    const frame = now => {
      const progress = reduced.matches ? 1 : Math.min(1, (now - start) / 180)
      // Өнгө 180ms-д зөөлөрнө; давтан hover өмнөх утгаас үргэлжилнэ.
      for (const [id, target] of changes) {
        const value = (starts.get(id) || 0) + (target - (starts.get(id) || 0)) * progress
        values.set(id, value)
        map.setFeatureState({ source, id }, { emphasis: value })
      }
      animationFrame = progress < 1 ? requestAnimationFrame(frame) : 0
    }
    frame(start)
  }
  const emphasize = () => {
    targets.clear()
    for (const feature of data.features) targets.set(feature.id, feature.id === hoveredBuilding || feature.properties.listingIds.includes(hovered || selected) ? 1 : 0)
    paint()
  }
  const refresh = () => {
    refreshFrame = 0
    const next = listingFootprints(map.querySourceFeatures('hamtry-buildings', { sourceLayer: 'building' }), items, { includeUnlisted: true })
    const nextKey = JSON.stringify(next)
    if (key === nextKey) return
    key = nextKey; data = next
    hoveredBuilding = undefined
    values.clear()
    map.removeFeatureState({ source })
    map.getSource(source).setData(data)
    emphasize()
  }
  const schedule = event => {
    if (event?.sourceId && event.sourceId !== 'hamtry-buildings') return
    if (!refreshFrame) refreshFrame = requestAnimationFrame(refresh)
  }
  const setHovered = id => {
    if (hovered === id && hoveredBuilding === undefined) return
    hovered = id
    hoveredBuilding = undefined
    emphasize()
  }
  const move = event => {
    if (!hover.matches || !enabled) return
    const feature = event.features?.[0]
    const entry = data.features.find(item => item.id === feature?.id)
    if (hoveredBuilding !== entry?.id || hovered !== undefined) {
      hoveredBuilding = entry?.id
      hovered = undefined
      emphasize()
    }
    map.getCanvas().style.cursor = entry?.properties.listingIds.length ? 'pointer' : ''
  }
  const leave = () => { setHovered(undefined); map.getCanvas().style.cursor = '' }
  const click = event => {
    const entry = data.features.find(item => item.id === event.features?.[0]?.id)
    if (enabled && entry?.properties.listingIds.length) onSelect(entry.properties.listingIds.includes(selected) ? selected : entry.properties.listingIds[0])
  }
  const markerHover = event => {
    if (event.type === 'pointerover' && !hover.matches) return
    const id = event.target.closest?.('[data-id]')?.dataset.id
    if (id) setHovered(id)
  }
  const markerLeave = event => {
    if (!event.relatedTarget?.closest?.('[data-id]')) leave()
  }
  map.on('sourcedata', schedule); map.on('moveend', schedule)
  map.on('mousemove', source, move); map.on('mouseleave', source, leave); map.on('click', source, click)
  host.addEventListener('pointerover', markerHover); host.addEventListener('pointerout', markerLeave)
  host.addEventListener('focusin', markerHover); host.addEventListener('focusout', markerLeave)
  window.addEventListener('hamtry-theme-change', palette)
  reduced.addEventListener('change', emphasize)
  return {
    update(next, id) { items = next; selected = id; if (!items.some(item => item.id === hovered)) hovered = undefined; schedule(); emphasize() },
    setMode(city) { enabled = city; leave(); map.setLayoutProperty(source, 'visibility', city ? 'visible' : 'none') },
    dispose() {
      cancelAnimationFrame(refreshFrame); cancelAnimationFrame(animationFrame)
      map.off('sourcedata', schedule); map.off('moveend', schedule)
      map.off('mousemove', source, move); map.off('mouseleave', source, leave); map.off('click', source, click)
      host.removeEventListener('pointerover', markerHover); host.removeEventListener('pointerout', markerLeave)
      host.removeEventListener('focusin', markerHover); host.removeEventListener('focusout', markerLeave)
      window.removeEventListener('hamtry-theme-change', palette); reduced.removeEventListener('change', emphasize)
      map.getCanvas().style.cursor = ''
      map.removeLayer(source); map.removeSource(source)
    },
  }
}
