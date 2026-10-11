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
  return { page: ['home', 'rooms', 'roommates', 'saved', 'dashboard'].includes(path) ? path : 'home' }
}
// Хадгалсан local demo өгөгдлийг DOM-д хэрэглэхээс өмнө хязгаарлаж шалгана.
export function parseDemo(value) {
  const empty = { saved: [], role: 'seeker', published: [] }
  if (!value || value.version !== 1) return empty
  return {
    saved: Array.isArray(value.saved) ? [...new Set(value.saved.filter(id => typeof id === 'string'))].slice(0, 100) : [],
    role: value.role === 'provider' ? 'provider' : 'seeker',
    published: Array.isArray(value.published) ? value.published.filter(item => item && typeof item.id === 'string' && item.id.startsWith('local-') && typeof item.title === 'string' && typeof item.district === 'string' && Number.isFinite(item.price) && item.price > 0 && item.price <= 100000000 && typeof item.description === 'string').slice(0, 20).map(item => ({ id: item.id.slice(0, 100), title: item.title.slice(0, 100), district: item.district.slice(0, 50), price: item.price, description: item.description.slice(0, 1500) })) : [],
  }
}
