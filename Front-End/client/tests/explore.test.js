import test from 'node:test'
import assert from 'node:assert/strict'
import { readExploreRoute } from '../src/app/data/places.js'

test('Explore deep links restore the destination and inside/city navigation', () => {
  assert.deepEqual(readExploreRoute('#inside/gallery'), { mode: 'inside', place: 'gallery' })
  assert.deepEqual(readExploreRoute('#city/home'), { mode: 'city', place: 'home' })
})

test('Unknown or malformed Explore routes return to the initial city selection', () => {
  for (const hash of ['', '#inside/missing', '#outside/home', '#inside/cafe/extra', '#inside/<script>']) {
    assert.deepEqual(readExploreRoute(hash), { mode: 'city', place: 'cafe' })
  }
})
