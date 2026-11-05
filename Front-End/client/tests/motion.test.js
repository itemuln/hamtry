import test from 'node:test'
import assert from 'node:assert/strict'
import { waapi } from 'animejs/waapi'
import { Scope } from '../src/library/core/reactivity.js'
import { createMotion } from '../src/library/core/motion.js'

// Lifecycle-ийг native animation backend-ээс тусад нь шалгана.
function fixture(t, reduced = false) {
  const preference = new EventTarget(); preference.matches = reduced
  const document = new EventTarget(); document.hidden = false
  const originalDocument = globalThis.document, originalMatchMedia = globalThis.matchMedia
  const originalAnimate = waapi.animate, animations = []
  globalThis.document = document
  globalThis.matchMedia = () => preference
  waapi.animate = (target, options) => {
    const animation = { target, options, reverts: 0, revert() { this.reverts++ } }
    animations.push(animation)
    return animation
  }
  const scope = new Scope()
  const motion = scope.run(() => createMotion())
  t.after(() => {
    scope.dispose()
    waapi.animate = originalAnimate
    if (originalDocument === undefined) delete globalThis.document; else globalThis.document = originalDocument
    if (originalMatchMedia === undefined) delete globalThis.matchMedia; else globalThis.matchMedia = originalMatchMedia
  })
  const values = new Map()
  const style = {
    getPropertyValue: name => values.get(name) || '',
    getPropertyPriority: () => '',
    setProperty: (name, value) => values.set(name, value),
    removeProperty: name => values.delete(name),
  }
  return { motion, animations, scope, preference, document, target: { isConnected: true, style } }
}

test('reopening an exiting surface cancels its stale close callback', t => {
  const { motion, animations, target } = fixture(t)
  let closes = 0, opens = 0
  motion.play(target, { opacity: [1, 0] }, { onComplete: () => closes++ })
  motion.play(target, { opacity: [0, 1] }, { onComplete: () => opens++ })
  animations[0].options.onComplete()
  assert.equal(closes, 0)
  assert.equal(animations[0].reverts, 1)
  animations[1].options.onComplete()
  animations[1].options.onComplete()
  assert.equal(opens, 1)
  assert.equal(animations[1].reverts, 1)
})

test('reduced motion settles UI state without starting an animation', t => {
  const { motion, animations, target } = fixture(t, true)
  let closed = false
  motion.play(target, { opacity: [1, 0] }, { onComplete: () => { closed = true } })
  assert.equal(closed, true)
  assert.equal(animations.length, 0)
})

test('changing the motion preference during exit finishes the close exactly once', t => {
  const { motion, animations, preference, target } = fixture(t)
  let closes = 0
  motion.play(target, { opacity: [1, 0] }, { onComplete: () => closes++ })
  preference.matches = true; preference.dispatchEvent(new Event('change'))
  animations[0].options.onComplete()
  assert.equal(closes, 1)
  assert.equal(animations[0].reverts, 1)
})

test('hidden tabs finish pending state changes and skip new animations', t => {
  const { motion, animations, document, target } = fixture(t)
  let completed = 0
  motion.play(target, { opacity: [1, 0] }, { onComplete: () => completed++ })
  document.hidden = true; document.dispatchEvent(new Event('visibilitychange'))
  motion.play(target, { opacity: [0, 1] }, { onComplete: () => completed++ })
  assert.equal(completed, 2)
  assert.equal(animations.length, 1)
  assert.equal(animations[0].reverts, 1)
})

test('disposing the owning component releases animations without late UI callbacks', t => {
  const { motion, animations, scope, preference, target } = fixture(t)
  let completed = 0
  motion.play(target, { opacity: [0, 1] }, { onComplete: () => completed++ })
  scope.dispose()
  preference.dispatchEvent(new Event('change'))
  animations[0].options.onComplete()
  assert.equal(animations[0].reverts, 1)
  assert.equal(completed, 0)
})

test('completion restores animated styles without undoing a repositioned panel', t => {
  const { motion, animations, target } = fixture(t)
  target.style.setProperty('opacity', '.8')
  target.style.setProperty('top', '12px')
  motion.play(target, { opacity: [0, 1], transform: ['translateY(8px)', 'none'] })
  target.style.setProperty('opacity', '1')
  target.style.setProperty('transform', 'none')
  target.style.setProperty('top', '32px')
  animations[0].options.onComplete()
  assert.equal(target.style.getPropertyValue('opacity'), '.8')
  assert.equal(target.style.getPropertyValue('transform'), '')
  assert.equal(target.style.getPropertyValue('top'), '32px')
})
