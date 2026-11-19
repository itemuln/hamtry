import assert from 'node:assert/strict'
import { test } from 'node:test'
import { listingsService } from '../src/features/listings/index.js'
import { ERROR } from '../src/utils/errors.js'

test('publishing stops before writing when the listing is outside the owner scope', async () => {
  const service = listingsService({
    owned: async (ownerId, listingId) => {
      assert.equal(ownerId, 'owner-1')
      assert.equal(listingId, 'listing-1')
      return null
    },
    publish: () => assert.fail('An unowned listing must never be published'),
  })
  await assert.rejects(service.publish('owner-1', 'listing-1'), { code: ERROR.NOT_FOUND })
})

test('publishing reports an incomplete draft when the repository rejects the state transition', async () => {
  const service = listingsService({
    owned: async () => ({ id: 'listing-1', status: 'draft' }),
    publish: async () => false,
  })
  await assert.rejects(service.publish('owner-1', 'listing-1'), { code: ERROR.INCOMPLETE_DRAFT })
})
