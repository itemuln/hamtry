import test from 'node:test'
import assert from 'node:assert/strict'
import { meetingError } from '../src/app/state/meeting-model.js'
import { requestedListing } from '../src/app/state/dashboard-requests.js'

const demoListings = [{id:'sample-narnii'}, {id:'sample-khan-uul'}]
const requests = [{person:'nomin',listingId:'sample-narnii'},{person:'temuulen',listingId:'sample-khan-uul'},{person:'anu',listingId:'sample-narnii'}]
const findRequestedListing = (person, listings) => requestedListing(person, listings, requests)

const now = new Date(2026, 10, 12, 9).getTime()
const date = (hour, minute = 0) => new Date(2026, 10, 12, hour, minute)
const meeting = (hour, minute = 0, duration = 30) => ({ start: date(hour, minute), duration })

test('meeting must start in the future with a valid duration', () => {
  assert.ok(meetingError(meeting(8), [], now))
  assert.ok(meetingError(meeting(9), [], now))
  assert.ok(meetingError({ start: new Date('invalid'), duration: 30 }, [], now))
  assert.ok(meetingError(meeting(10, 0, 0), [], now))
  assert.equal(meetingError(meeting(10), [], now), '')
})

test('meeting rejects partial, contained and enveloping time conflicts', () => {
  const scheduled = [meeting(10, 0, 60)]
  for (const candidate of [meeting(9, 45), meeting(10, 15), meeting(10, 45)]) {
    assert.ok(meetingError(candidate, scheduled, now))
  }
})

test('a longer meeting cannot contain an existing appointment', () => {
  assert.ok(meetingError(meeting(9, 45, 60), [meeting(10)], now))
})

test('adjacent slots are available and legacy appointments last thirty minutes', () => {
  assert.equal(meetingError(meeting(9, 30), [meeting(10)], now), '')
  assert.equal(meetingError(meeting(10, 30), [{ start: date(10) }], now), '')
  assert.ok(meetingError(meeting(10, 15), [{ start: date(10) }], now))
})
test('contact determines the requested listing regardless of listing order', () => {
  const listings = [...demoListings].reverse()
  assert.equal(findRequestedListing('nomin', listings).id, 'sample-narnii')
  assert.equal(findRequestedListing('temuulen', listings).id, 'sample-khan-uul')
  assert.equal(findRequestedListing('anu', listings).id, 'sample-narnii')
})

test('missing request or removed listing never substitutes another room', () => {
  assert.equal(findRequestedListing('unknown', demoListings), undefined)
  assert.equal(findRequestedListing('temuulen', demoListings.filter(item => item.id !== 'sample-khan-uul')), undefined)
  assert.equal(findRequestedListing('nomin', [{ id: 'local-new-room', title: 'Шинэ зар' }]), undefined)
})