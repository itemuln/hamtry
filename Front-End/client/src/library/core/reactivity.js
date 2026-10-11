// Одоо ажиллаж буй effect болон нөөцүүдийг эзэмших scope-ийг түр хадгална.
// Callback дуусахад өмнөх утгыг сэргээдэг тул nested effect зөв ажиллана.
let observer
let owner
const queue = new Set()
let scheduled = false
function enqueue(effect) {
  if (effect.disposed) return
  // Set ашигласнаар нэг effect олон set()-ийн дараа нэг удаа ажиллана.
  queue.add(effect)
  if (scheduled) return
  scheduled = true
  queueMicrotask(flushEffects)
}
/** Хүлээгдэж буй effect-үүдийг ажиллуулна. Тестэд шууд шалгах үед хэрэглэнэ. */
export function flushEffects() {
  let rounds = 0
  const errors = []
  try {
    while (queue.size) {
      if (++rounds > 100)
        throw new Error(
          'Reactive effect cycle: an effect keeps updating its own state.',
        )
      const batch = [...queue]
      queue.clear()
      for (const effect of batch) {
        if (!effect.disposed) {
          try {
            effect.run()
          } catch (error) {
            errors.push(error)
          }
        }
      }
    }
  } finally {
    scheduled = false
    queue.clear()
  }
  if (errors.length)
    throw new AggregateError(errors, 'Reactive effects failed.')
}
/** Утга болон тэр утгыг уншсан effect-үүдийг хадгалдаг жижиг төлөвийн объект. */
export function signal(initial) {
  let value = initial
  const subscribers = new Set()
  return {
    get() {
      // Effect ажиллаж байхад get() дуудагдвал уг effect-ийг бүртгэнэ.
      if (observer) {
        subscribers.add(observer)
        observer.dependencies.add(subscribers)
      }
      return value
    },
    set(update) {
      // set(prev => ...) доторх уншилтыг шинэ dependency гэж бүртгэхгүй.
      const next = untrack(() =>
        typeof update === 'function' ? update(value) : update,
      )
      // Утга өөрчлөгдөөгүй бол DOM шинэчлэх нэмэлт ажил үүсгэхгүй.
      if (Object.is(value, next)) return
      value = next
      subscribers.forEach(enqueue)
    },
  }
}
/** React шиг хос буцаана. Гэхдээ эхнийх нь утга биш, count() гэсэн getter. */
export function useState(initial) {
  const state = signal(initial)
  return [state.get, state.set]
}
/** Callback дотор уншсан signal-уудыг тухайн effect-ийн dependency болгохгүй. */
export function untrack(callback) {
  const before = observer
  observer = undefined
  try {
    return callback()
  } finally {
    observer = before
  }
}
/**
 * Синхрон get()/getter уншилтыг автоматаар дагана; dependency array авахгүй.
 * Буцаасан cleanup нь дахин ажиллахын өмнө болон dispose хийхэд дуудагдана.
 */
export function useEffect(callback) {
  const effectOwner = owner
  let cleanup
  let runScope
  const detach = () => {
    // Өмнөх dependency-г арилгаад шинэ ажиллалтаар дахин цуглуулна.
    effect.dependencies.forEach((subscribers) => subscribers.delete(effect))
    effect.dependencies.clear()
  }
  const effect = {
    dependencies: new Set(),
    disposed: false,
    run() {
      detach()
      const previousCleanup = cleanup
      cleanup = undefined
      try {
        if (previousCleanup) untrack(previousCleanup)
      } finally {
        runScope?.dispose()
      }
      // Энэ effect дотор үүсэх effect, listener тусдаа scope-той байна.
      runScope = new Scope()
      const before = observer
      observer = effect
      try {
        cleanup = runScope.run(callback)
      } finally {
        observer = before
      }
    },
  }
  const dispose = () => {
    if (effect.disposed) return
    effect.disposed = true
    queue.delete(effect)
    detach()
    const previousCleanup = cleanup
    cleanup = undefined
    try {
      if (previousCleanup) untrack(previousCleanup)
    } finally {
      runScope?.dispose()
    }
  }
  effectOwner?.add(dispose)
  try {
    effect.run()
  } catch (error) {
    dispose()
    throw error
  }
  return dispose
}
/** Компонентын effect, listener, timer зэрэг нөөцийн cleanup-уудыг эзэмшинэ. */
export class Scope {
  cleanups = new Set()
  disposed = false
  run(callback) {
    if (this.disposed) throw new Error('Cannot use a disposed component scope.')
    return runInScope(this, callback)
  }
  add(cleanup) {
    if (this.disposed)
      throw new Error('Cannot register cleanup on a disposed component scope.')
    this.cleanups.add(cleanup)
  }
  dispose() {
    if (this.disposed) return
    this.disposed = true
    const errors = []
    // Нэг cleanup алдаа өгсөн ч бусад нөөцийг цэвэрлэж дуусгана.
    for (const cleanup of [...this.cleanups].reverse()) {
      try {
        cleanup()
      } catch (error) {
        errors.push(error)
      }
    }
    this.cleanups.clear()
    if (errors.length)
      throw new AggregateError(errors, 'Component cleanup failed.')
  }
}
function runInScope(scope, callback) {
  const before = owner
  owner = scope
  try {
    return callback()
  } finally {
    owner = before
  }
}
/** Одоогийн scope дуусахад ажиллах цэвэрлэгээний функцийг бүртгэнэ. */
export function onCleanup(cleanup) {
  if (!owner) throw new Error('onCleanup must run inside a component scope.')
  owner.add(cleanup)
}
/** setup үеэр нэг удаа ажиллаж, timer/observer/canvas-ийн cleanup буцааж болно. */
export function onMount(callback) {
  if (!owner) throw new Error('onMount must run inside a component scope.')
  const cleanup = untrack(callback)
  if (cleanup) onCleanup(cleanup)
}
