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

export function useTheme() {
  const [overrides, setState] = useState<ThemeOverrides>(emptyOverrides)
  const current = useRef(overrides)
  const pending = useRef(false)
  const saved = useRef(overrides)
  const saving = useRef(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [saveStatus, setSaveStatus] = useState('Loading shared theme…')

  const load = useCallback(async () => {
    const before = current.current
    try {
      const response = await fetch('/api/theme', { cache: 'no-store' })
      if (!response.ok) throw new Error(await response.text())
      const next = parseOverrides(await response.json())
      if (pending.current || saving.current || current.current !== before)
        return
      if (JSON.stringify(next) !== JSON.stringify(current.current)) {
        current.current = next
        saved.current = next
        setState(next)
      }
      setReady(true)
      setSaveStatus('Saved across Hamtry. Other pages update automatically.')
    } catch (error) {
      if (!pending.current)
        setSaveStatus(
          `Shared theme unavailable: ${error instanceof Error ? error.message : 'request failed'}`,
        )
    }
  }, [])

  const saveChanges = useCallback(async () => {
    if (saving.current || !pending.current) return
    const next = current.current
    saving.current = true
    setIsSaving(true)
    setSaveStatus('Saving shared theme…')
    try {
      const response = await fetch('/api/theme', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(exportTheme(next)),
      })
      if (!response.ok) throw new Error(await response.text())
      saved.current = next
      pending.current = JSON.stringify(current.current) !== JSON.stringify(next)
      setHasChanges(pending.current)
      setSaveStatus(
        pending.current
          ? 'Unsaved changes. Click Save changes to apply them across Hamtry.'
          : 'Saved across Hamtry. Other pages update automatically.',
      )
    } catch (error) {
      setSaveStatus(
        `Not saved: ${error instanceof Error ? error.message : 'request failed'}. Click Save changes to retry.`,
      )
    } finally {
      saving.current = false
      setIsSaving(false)
    }
  }, [])

  const setOverrides: Dispatch<SetStateAction<ThemeOverrides>> = useCallback(
    (action) => {
      const next =
        typeof action === 'function' ? action(current.current) : action
      current.current = next
      pending.current = JSON.stringify(next) !== JSON.stringify(saved.current)
      setHasChanges(pending.current)
      setState(next)
      setSaveStatus(
        pending.current
          ? 'Unsaved changes. Click Save changes to apply them across Hamtry.'
          : 'No unsaved changes.',
      )
    },
    [],
  )

  const retryLoad = useCallback(() => void load(), [load])

  useEffect(() => {
    const initial = setTimeout(() => void load(), 0)
    const timer = setInterval(() => {
      if (!pending.current && !saving.current) void load()
    }, 2000)
    return () => {
      clearTimeout(initial)
      clearInterval(timer)
    }
  }, [load])

  useEffect(() => {
    const style = document.createElement('style')
    style.dataset.hamtryTheme = 'true'
    style.textContent = themeCss(overrides)
    document.head.appendChild(style)
    return () => style.remove()
  }, [overrides])
  return {
    overrides,
    setOverrides,
    saveStatus,
    ready,
    retryLoad,
    saveChanges,
    hasChanges,
    isSaving,
  }
}
