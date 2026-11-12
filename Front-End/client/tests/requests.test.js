import test from 'node:test'
import assert from 'node:assert/strict'
import { decideRequest, requestStatus, pendingRequests, meetingsForRequest } from '../src/app/state/dashboard-requests.js'

test('request decisions resolve only pending requests and update the pending count', () => {
  const requests = [{ id: 'one' }, { id: 'two' }, { id: 'three' }]
  assert.equal(pendingRequests(requests).length, 3)
  assert.equal(decideRequest(requests[0], 'accepted'), true)
  assert.equal(decideRequest(requests[1], 'rejected'), true)
  assert.equal(requestStatus(requests[0]), 'accepted')
  assert.equal(requestStatus(requests[1]), 'rejected')
  assert.deepEqual(pendingRequests(requests), [requests[2]])
  assert.equal(decideRequest(requests[0], 'rejected'), false)
  assert.equal(requestStatus(requests[0]), 'accepted')
  assert.equal(decideRequest(requests[2], 'invalid'), false)
  assert.equal(requestStatus(requests[2]), 'pending')
  assert.equal(decideRequest(undefined, 'accepted'), false)
})

test('request details show only meetings belonging to both the person and requested room', () => {
  const request = { person: 'nomin', listingId: 'room-a' }
  const late = { person: 'nomin', listingId: 'room-a', start: new Date(2026, 10, 15) }
  const early = { person: 'nomin', listingId: 'room-a', start: new Date(2026, 10, 13) }
  const meetings = [late, { person: 'anu', listingId: 'room-a', start: early.start }, { person: 'nomin', listingId: 'room-b', start: early.start }, early]
  assert.deepEqual(meetingsForRequest(request, meetings), [early, late])
  assert.equal(meetings[0], late)
  assert.deepEqual(meetingsForRequest({ person: 'unknown', listingId: 'room-a' }, meetings), [])
})