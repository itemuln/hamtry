// Browser-оос хамааралгүй хайлтын дүрэм. Тест нь зөвхөн бодит filter/route behavior шалгана.
export const initialFilters = { district: 'all', maxPrice: 0, query: '', pets: false }
export const money = value => new Intl.NumberFormat('mn-MN').format(value) + ' ₮'
export function findListings(items, filters, kind, saved = null) {
  const words = filters.query.trim().toLocaleLowerCase('mn').split(/\s+/).filter(Boolean)
  return items.filter(item => (!kind || item.kind === kind)
    && (!saved || saved.includes(item.id))
    && (filters.district === 'all' || item.district === filters.district)
    && (!filters.maxPrice || item.price <= filters.maxPrice)
    && (!filters.pets || item.pets)
    && words.every(word => `${item.title} ${item.district} ${item.area} ${item.traits.join(' ')}`.toLocaleLowerCase('mn').includes(word)))
}
export function readRoute(hash) {
  const path = hash.replace(/^#\/?/, '') || 'home'
  if (path.startsWith('listing/')) return { page: 'detail', id: path.slice(8) }
  return { page: ['home', 'map', 'rooms', 'roommates', 'saved', 'dashboard'].includes(path) ? path : 'home' }
}
// MapLibre-ийн Mercator зурагт тохирох [уртраг, өргөрөг]. Хоосон input-ийг 0 гэж үзэхгүй.
export const validLocation = point => Array.isArray(point) && point.length === 2 && point.every(Number.isFinite) && Math.abs(point[0]) <= 180 && Math.abs(point[1]) <= 85
function restoreRooms(value) {
  if (!Array.isArray(value)) return []
  let remaining = 12
  const ids = new Set()
  return value.slice(0, 6).filter(room => room && typeof room.id === 'string' && /^room-[\w-]{1,80}$/.test(room.id) && typeof room.name === 'string' && room.name.trim() && Array.isArray(room.photos)).map(room => ({
    id: room.id, name: room.name.trim().slice(0, 60),
    photos: room.photos.filter(photo => {
      if (!remaining || !photo || typeof photo.id !== 'string' || !/^photo-[\w-]{1,80}$/.test(photo.id) || ids.has(photo.id)) return false
      ids.add(photo.id); remaining--; return true
    }).map(photo => ({ id: photo.id, caption: typeof photo.caption === 'string' ? photo.caption.slice(0, 120) : '' })),
  })).filter((room, index, rooms) => room.photos.length && rooms.findIndex(other => other.id === room.id) === index)
}
// Хадгалсан local demo өгөгдлийг DOM-д хэрэглэхээс өмнө хязгаарлаж шалгана.
export function parseDemo(value) {
  const empty = { saved: [], role: 'seeker', published: [] }
  if (!value || value.version !== 1) return empty
  return {
    saved: Array.isArray(value.saved) ? [...new Set(value.saved.filter(id => typeof id === 'string'))].slice(0, 100) : [],
    role: value.role === 'provider' ? 'provider' : 'seeker',
    published: Array.isArray(value.published) ? value.published.filter(item => item && typeof item.id === 'string' && item.id.startsWith('local-') && typeof item.title === 'string' && typeof item.district === 'string' && Number.isFinite(item.price) && item.price > 0 && item.price <= 100000000 && typeof item.description === 'string').slice(0, 20).map(item => ({
      id: item.id.slice(0, 100), title: item.title.slice(0, 100), district: item.district.slice(0, 50), price: item.price, description: item.description.slice(0, 1500),
      location: validLocation(item.location) ? [...item.location] : null,
      // Зөвхөн бидний JPEG thumbnail. Blob болон гаднын src/url нь metadata-д орохгүй.
      cover: typeof item.cover === 'string' && item.cover.length <= 400000 && /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.cover) ? item.cover : '',
      rooms: restoreRooms(item.rooms),
    })) : [],
  }
}
