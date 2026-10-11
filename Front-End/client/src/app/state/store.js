import { signal } from '@hamtry/library'
import { initialFilters, parseDemo, readRoute } from './model.js'
const key = 'hamtry-demo-v1'
export function createAppState() {
  let initial
  try { initial = parseDemo(JSON.parse(localStorage.getItem(key))) }
  catch { initial = parseDemo(null) }
  const state = { route: signal(readRoute(location.hash)), filters: signal({ ...initialFilters }), kind: signal('rooms'), saved: signal(initial.saved), role: signal(initial.role), published: signal(initial.published) }
  // UI үйлдэл хийхэд л бичнэ. Account/backend хадгалалт гэж үзэхгүй.
  state.persist = () => {
    try {
      localStorage.setItem(key, JSON.stringify({ version: 1, saved: state.saved.get(), role: state.role.get(), published: state.published.get() }))
      return true
    } catch { return false }
  }
  state.toggleSaved = id => {
    state.saved.set(ids => ids.includes(id) ? ids.filter(item => item !== id) : [...ids, id])
    return state.persist()
  }
  return state
}
