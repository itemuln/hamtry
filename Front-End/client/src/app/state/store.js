import { signal } from '@hamtry/library'
import { initialFilters, parseDemo, readRoute } from './model.js'
const key = 'hamtry-demo-v1'
export function createAppState() {
  let initial
  try { initial = parseDemo(JSON.parse(localStorage.getItem(key))) }
  catch { initial = parseDemo(null) }
  const state = { backend: signal(false), connection: signal('loading'), detail: signal(null), detailError: signal(null), user: signal(null), catalog: signal(null), remoteSaved: signal([]), nextCursor: signal(null), loading: signal(false), route: signal(readRoute(location.hash)), filters: signal({ ...initialFilters }), kind: signal('rooms'), saved: signal(initial.saved.filter(id => !/^(room|person)-\d+$/.test(id))), role: signal(initial.role), published: signal([]) }
  // UI үйлдэл хийхэд л бичнэ. Account/backend хадгалалт гэж үзэхгүй.
  state.persist = () => {
    if (state.backend.get()) return true
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
