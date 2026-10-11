import test from 'node:test'
import assert from 'node:assert/strict'
import {
  Scope,
  signal,
  useState,
  useEffect,
  flushEffects,
  onCleanup,
  onMount,
  untrack,
} from '../src/library/core/reactivity.js'
test('state supports functional updates, equality checks, and independent instances', () => {
  const [a, setA] = useState(0)
  const [b] = useState(0)
  let runs = 0
  const dispose = useEffect(() => {
    a()
    runs++
  })
  setA((value) => value + 5)
  setA(5)
  setA((value) => value + 5)
  assert.equal(a(), 10)
  assert.equal(b(), 0)
  assert.equal(runs, 1)
  flushEffects()
  assert.equal(runs, 2)
  setA(10)
  flushEffects()
  assert.equal(runs, 2)
  dispose()
})
test('signal equality follows Object.is including NaN', () => {
  const state = signal(NaN)
  let runs = 0
  const dispose = useEffect(() => {
    state.get()
    runs++
  })
  state.set(NaN)
  flushEffects()
  assert.equal(runs, 1)
  state.set(-0)
  flushEffects()
  state.set(0)
  flushEffects()
  assert.equal(runs, 3)
  dispose()
})
test('effects replace conditional dependencies and ignore untracked reads', () => {
  const chooseA = signal(true),
    a = signal(1),
    b = signal(2),
    ignored = signal(3)
  let runs = 0
  const dispose = useEffect(() => {
    if (chooseA.get()) a.get()
    else b.get()
    untrack(() => ignored.get())
    runs++
  })
  b.set(5)
  ignored.set(6)
  flushEffects()
  assert.equal(runs, 1)
  chooseA.set(false)
  flushEffects()
  assert.equal(runs, 2)
  a.set(6)
  flushEffects()
  assert.equal(runs, 2)
  b.set(7)
  flushEffects()
  assert.equal(runs, 3)
  dispose()
})
test('scope cleans effects, pending updates, and mounted resources exactly once', () => {
  const scope = new Scope(),
    state = signal(0)
  const events = []
  scope.run(() => {
    onMount(() => {
      events.push('mount')
      return () => events.push('unmount')
    })
    useEffect(() => {
      events.push(`effect:${state.get()}`)
      return () => events.push('cleanup')
    })
  })
  state.set(1)
  flushEffects()
  state.set(2)
  scope.dispose()
  scope.dispose()
  flushEffects()
  assert.deepEqual(events, [
    'mount',
    'effect:0',
    'cleanup',
    'effect:1',
    'cleanup',
    'unmount',
  ])
  assert.throws(() => scope.run(() => {}), /disposed/)
  assert.throws(() => onCleanup(() => {}), /scope/)
})
test('nested effects are disposed when the outer effect reruns', () => {
  const outer = signal(0),
    inner = signal(0)
  let runs = 0
  const dispose = useEffect(() => {
    outer.get()
    useEffect(() => {
      inner.get()
      runs++
    })
  })
  outer.set(1)
  flushEffects()
  assert.equal(runs, 2)
  inner.set(1)
  flushEffects()
  assert.equal(runs, 3)
  dispose()
  inner.set(2)
  flushEffects()
  assert.equal(runs, 3)
})
test('one failed resource cleanup does not leave other resources active', () => {
  const scope = new Scope()
  let cleaned = false
  scope.run(() => {
    onCleanup(() => {
      cleaned = true
    })
    onCleanup(() => {
      throw new Error('failure')
    })
  })
  assert.throws(() => scope.dispose(), AggregateError)
  assert.equal(cleaned, true)
})
test('throwing effects restore tracking and do not block other scheduled effects', () => {
  const state = signal(0)
  let other = 0
  const fail = useEffect(() => {
    if (state.get()) throw new Error('failure')
  })
  const dispose = useEffect(() => {
    other = state.get()
  })
  state.set(1)
  assert.throws(flushEffects, AggregateError)
  assert.equal(other, 1)
  fail()
  dispose()
  assert.throws(
    () =>
      useEffect(() => {
        throw new Error('initial failure')
      }),
    /initial failure/,
  )
  assert.equal(signal(5).get(), 5)
})
test('writes automatically batch in a microtask', async () => {
  const state = signal(0)
  const values = []
  const dispose = useEffect(() => {
    values.push(state.get())
  })
  state.set(1)
  state.set(2)
  assert.deepEqual(values, [0])
  await Promise.resolve()
  assert.deepEqual(values, [0, 2])
  dispose()
})
test('self-updating effects fail with an actionable cycle error', () => {
  const state = signal(0)
  const dispose = useEffect(() => state.set(state.get() + 1))
  assert.throws(flushEffects, /Reactive effect cycle/)
  dispose()
})
test('effect-owned resources clean up even when returned cleanup throws', () => {
  const state = signal(0)
  let cleaned = false
  const dispose = useEffect(() => {
    state.get()
    onCleanup(() => {
      cleaned = true
    })
    return () => {
      throw new Error('cleanup failure')
    }
  })
  state.set(1)
  assert.throws(flushEffects, AggregateError)
  assert.equal(cleaned, true)
  dispose()
})
