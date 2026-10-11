import test from 'node:test'
import assert from 'node:assert/strict'
import { findListings, initialFilters, parseDemo, readRoute } from '../src/app/state/model.js'
const fixtures = [
  { id: 'r1', kind: 'rooms', title: 'Гэрэлтэй өрөө', district: 'Хан-Уул', area: '120 мянгат', price: 700000, traits: ['Амьтан зөвшөөрнө'], pets: true },
  { id: 'r2', kind: 'rooms', title: 'Тайван өрөө', district: 'Сүхбаатар', area: '11-р хороолол', price: 950000, traits: ['Тавилгатай'], pets: false },
  { id: 'p1', kind: 'roommates', title: 'Номин', district: 'Хан-Уул', area: '120 мянгат', price: 600000, traits: ['Цэвэрч'], pets: false },
]
test('search combines kind, district, budget, pets and all query words', () => {
  const filter = { district: 'Хан-Уул', maxPrice: 700000, query: ' ГЭРЭЛТЭЙ   амьтан ', pets: true }
  assert.deepEqual(findListings(fixtures, filter, 'rooms').map(item => item.id), ['r1'])
  assert.equal(findListings(fixtures, { ...filter, maxPrice: 699999 }, 'rooms').length, 0)
  assert.equal(findListings(fixtures, { ...filter, query: 'Гэрэлтэй үгүй' }, 'rooms').length, 0)
})
test('saved results include both listing types and empty saved means no results', () => {
  assert.deepEqual(findListings(fixtures, initialFilters, null, ['r2', 'p1']).map(item => item.id), ['r2', 'p1'])
  assert.deepEqual(findListings(fixtures, initialFilters, null, []), [])
  assert.equal(findListings(fixtures, initialFilters, 'roommates').length, 1)
})
test('hash routes resolve detail, product pages and unknown routes', () => {
  assert.deepEqual(readRoute('#listing/room-2'), { page: 'detail', id: 'room-2' })
  for (const page of ['home', 'rooms', 'roommates', 'saved', 'dashboard']) assert.deepEqual(readRoute(`#/${page}`), { page })
  assert.deepEqual(readRoute('#unknown'), { page: 'home' })
  assert.deepEqual(readRoute(''), { page: 'home' })
})
test('local demo restore rejects malformed records and bounds user content', () => {
  const valid = { id: 'local-1', title: 'А'.repeat(200), district: 'Хан-Уул', price: 880000, description: 'Ө'.repeat(2000), image: 'untrusted-image', kind: 'admin' }
  const restored = parseDemo({ version: 1, role: 'admin', saved: ['r1', null, 'r1', 2], published: [null, {}, { ...valid, price: -1 }, { ...valid, id: 'server-1' }, valid] })
  assert.equal(restored.role, 'seeker')
  assert.deepEqual(restored.saved, ['r1'])
  assert.equal(restored.published.length, 1)
  assert.equal(restored.published[0].title.length, 100)
  assert.equal(restored.published[0].description.length, 1500)
  assert.equal(restored.published[0].image, undefined)
  assert.equal(restored.published[0].kind, undefined)
  assert.deepEqual(parseDemo({ version: 2, saved: ['r1'] }), { role: 'seeker', saved: [], published: [] })
})
