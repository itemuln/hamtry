import test from 'node:test'
import assert from 'node:assert/strict'
import { containsLocation, listingFootprints } from '../src/app/components/listing-buildings.js'

const outer = [[0, 0], [4, 0], [4, 4], [0, 4], [0, 0]]
const hole = [[1, 1], [2, 1], [2, 2], [1, 2], [1, 1]]
const geometry = { type: 'Polygon', coordinates: [outer, hole] }

test('Building matching excludes courtyards and nearby unrelated properties', () => {
  assert.equal(containsLocation(geometry, [3, 3]), true)
  assert.equal(containsLocation(geometry, [1.5, 1.5]), false)
  assert.equal(containsLocation(geometry, [4.01, 3]), false)
  assert.equal(containsLocation({ type: 'MultiPolygon', coordinates: [[outer, hole]] }, [3, 3]), true)
})

test('Tile duplicates share one footprint, multiple listings remain selectable and filters clear it', () => {
  const building = { geometry, properties: { render_height: 25, render_min_height: 3 } }
  const items = [{ id: 'a', location: [3, 3] }, { id: 'b', location: [3.5, 3] }, { id: 'outside', location: [5, 5] }]
  const result = listingFootprints([building, building], items)
  assert.equal(result.features.length, 1)
  assert.equal(result.features[0].id, 0)
  assert.deepEqual(result.features[0].properties.listingIds, ['a', 'b'])
  assert.equal(result.features[0].properties.height, 25.15)
  assert.equal(result.features[0].properties.base, 3)
  assert.equal(listingFootprints([building], []).features.length, 0)
  assert.equal(listingFootprints([{ ...building, properties: { hide_3d: true } }], items).features.length, 0)
})

test('Merged vector MultiPolygons highlight only the building containing a listing', () => {
  const other = outer.map(([x, y]) => [x + 10, y + 10])
  const building = { geometry: { type: 'MultiPolygon', coordinates: [[outer], [other]] }, properties: {} }
  const result = listingFootprints([building], [{ id: 'a', location: [3, 3] }])
  assert.equal(result.features.length, 1)
  assert.deepEqual(result.features[0].geometry, { type: 'Polygon', coordinates: [outer] })
  assert.equal(containsLocation(result.features[0].geometry, [13, 13]), false)
  const all = listingFootprints([building, building], [{ id: 'a', location: [3, 3] }], { includeUnlisted: true })
  assert.equal(all.features.length, 2)
  assert.deepEqual(all.features.map(feature => feature.id), [0, 1])
  assert.deepEqual(all.features.map(feature => feature.properties.listed), [true, false])
  assert.deepEqual(all.features[1].properties.listingIds, [])
  assert.equal(listingFootprints([building], [], { includeUnlisted: true }).features.length, 2)
})
