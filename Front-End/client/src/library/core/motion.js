import { waapi } from 'animejs/waapi'
import { onCleanup } from './reactivity.js'

// WAAPI нь compositor дээр transform/opacity-г хөдөлгөнө; өөрийн RAF loop үүсгэхгүй.
// Компонент салгах, хөдөлгөөн багасгах, tab нуухад animation-уудыг цэвэрлэнэ.
export function createMotion() {
  const preference = matchMedia('(prefers-reduced-motion: reduce)')
  const running = new Map()
  const restore = (target, entry) => {
    for (const [name, value, priority] of entry.styles) {
      if (value) target.style.setProperty(name, value, priority)
      else target.style.removeProperty(name)
    }
  }
  const stop = target => {
    const entry = running.get(target)
    if (!entry) return
    running.delete(target)
    entry.animation.revert()
    restore(target, entry)
  }
  const settle = () => {
    for (const [target, entry] of [...running]) {
      stop(target)
      entry.onComplete?.()
    }
  }
  const onVisibility = () => { if (document.hidden) settle() }
  preference.addEventListener('change', settle)
  document.addEventListener('visibilitychange', onVisibility)
  onCleanup(() => {
    preference.removeEventListener('change', settle)
    document.removeEventListener('visibilitychange', onVisibility)
    for (const target of [...running.keys()]) stop(target)
  })
  return {
    get reduced() { return preference.matches || document.hidden },
    stop,
    play(target, keyframes, { duration = 240, delay = 0, onComplete } = {}) {
      stop(target)
      if (preference.matches || document.hidden || !target.isConnected || !duration) {
        onComplete?.()
        return
      }
      const styles = Object.keys(keyframes).map(name => [name, target.style.getPropertyValue(name), target.style.getPropertyPriority(name)])
      const entry = { animation: null, onComplete, styles }
      entry.animation = waapi.animate(target, {
        ...keyframes,
        duration,
        delay,
        ease: 'cubic-bezier(.16,1,.3,1)',
        persist: false,
        onComplete: () => {
          if (running.get(target) !== entry) return
          running.delete(target)
          entry.animation.revert()
          restore(target, entry)
          onComplete?.()
        },
      })
      running.set(target, entry)
    },
  }
}
