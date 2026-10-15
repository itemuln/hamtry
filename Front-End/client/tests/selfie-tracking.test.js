import test from 'node:test'
import assert from 'node:assert/strict'
import { createPoseSequence, facePose } from '../src/app/pages/selfie-tracking.js'

test('no face and multiple faces never pass', () => {
  assert.equal(facePose([], {}, {}).valid, false)
  assert.equal(facePose([[], []], {}, {}).valid, false)
  const sequence = createPoseSequence()
  for (let now = 0; now < 5000; now += 100) assert.equal(sequence.update({ valid: false }, now).step, 0)
})
test('stable front, sustained turn, then front completes automatically', () => {
  const sequence = createPoseSequence()
  let state
  for (let now = 0; now <= 900; now += 100) state = sequence.update({ valid: true, turn: 0 }, now)
  assert.equal(state.step, 1)
  for (let now = 1000; now <= 2000; now += 100) state = sequence.update({ valid: true, turn: 0 }, now)
  assert.equal(state.step, 1)
  for (let now = 2100; now <= 2700; now += 100) state = sequence.update({ valid: true, turn: .3 }, now)
  assert.equal(state.step, 2)
  for (let now = 2800; now <= 3700; now += 100) state = sequence.update({ valid: true, turn: .03 }, now)
  assert.equal(state.complete, true)
})
test('losing the face or a stalled stream resets the hold', () => {
  const sequence = createPoseSequence()
  sequence.update({ valid: true, turn: 0 }, 0)
  sequence.update({ valid: true, turn: 0 }, 400)
  sequence.update({ valid: false }, 500)
  assert.equal(sequence.update({ valid: true, turn: 0 }, 1000).progress, 0)
  assert.equal(sequence.update({ valid: true, turn: 0 }, 3000).step, 0)
})
test('pose coordinates account for object-fit cover cropping', () => {
  const face = Array.from({length: 478}, () => ({x:.5,y:.5}))
  face[10]={x:.5,y:.2};face[152]={x:.5,y:.8};face[33]={x:.4,y:.4};face[263]={x:.6,y:.4}
  assert.equal(facePose([face], {width:720,height:960}, {width:400,height:300}).valid, false)
  assert.equal(facePose([face], {width:720,height:960}, {width:300,height:400}).valid, true)
})
