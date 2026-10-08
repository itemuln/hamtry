import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  emptyOverrides,
  exportTheme,
  parseOverrides,
  themeCss,
  type ThemeOverrides,
} from './theme'

const storageKey = 'hamtry.theme.v1'
function loadTheme() {
  try {
    const saved = localStorage.getItem(storageKey)
    return saved ? parseOverrides(JSON.parse(saved)) : emptyOverrides()
  } catch {
    return emptyOverrides()
  }
}
export function useTheme() {
  const [overrides, setState] = useState<ThemeOverrides>(loadTheme)
  const current = useRef(overrides)
  const [storageError, setStorageError] = useState('')
  const setOverrides: Dispatch<SetStateAction<ThemeOverrides>> = useCallback(
    (action) => {
      const next =
        typeof action === 'function' ? action(current.current) : action
      current.current = next
      try {
        localStorage.setItem(storageKey, JSON.stringify(exportTheme(next)))
        setStorageError('')
      } catch {
        setStorageError(
          'Changes are live, but browser storage is unavailable. Export your theme to keep it.',
        )
      }
      setState(next)
    },
    [],
  )
  useEffect(() => {
    const style = document.createElement('style')
    style.dataset.hamtryTheme = 'true'
    style.textContent = themeCss(overrides)
    document.head.appendChild(style)
    return () => style.remove()
  }, [overrides])
  return { overrides, setOverrides, storageError }
}
