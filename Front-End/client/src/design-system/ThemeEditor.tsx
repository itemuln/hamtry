import { useRef, useState } from 'react'
import {
  emptyOverrides,
  resolvedColor,
  themeTokens,
  tokenValue,
  type ThemeMode,
} from './theme'
import { useTheme } from './useTheme'
import './theme-editor.css'

export function ThemeEditor({
  overrides,
  setOverrides,
  saveStatus,
  ready,
  retryLoad,
  saveChanges,
  hasChanges,
  isSaving,
}: ReturnType<typeof useTheme>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('colors')
  const [mode, setMode] = useState<ThemeMode>('base')
  const categories = [
    'colors',
    'spacing',
    'radius',
    'type',
    'line-height',
    'size',
    'layout',
    'border',
    'elevation',
    'icon',
  ]
  const tokens = themeTokens.filter(
    (token) =>
      (category === 'colors'
        ? token.color
        : !token.color && token.name.startsWith(category + '/')) &&
      token.name.includes(search.toLowerCase()) &&
      (mode === 'base' || token.defaults[mode] !== undefined),
  )
  function change(name: string, value: string) {
    setOverrides((current) => ({
      ...current,
      [mode]: { ...current[mode], [name]: value },
    }))
  }
  return (
    <>
      <button
        className="theme-launch"
        type="button"
        disabled={!ready}
        onClick={() => dialog.current?.showModal()}
      >
        Edit variables
      </button>
      {!ready && saveStatus.startsWith('Shared theme unavailable:') && (
        <button type="button" onClick={retryLoad}>
          Retry loading shared theme
        </button>
      )}
      <dialog
        ref={dialog}
        className="theme-editor"
        aria-labelledby="theme-title"
      >
        <header>
          <div>
            <span>HAMTRY / LIVE THEME</span>
            <h2 id="theme-title">Shared variables</h2>
          </div>
          <button
            type="button"
            aria-label="Close variable editor"
            onClick={() => dialog.current?.close()}
          >
            ×
          </button>
        </header>
        <p className="theme-intro">
          Preview your edits here, then click Save changes to apply them across
          Hamtry. Dimensions use rem and scale with the reader’s text size.
        </p>
        <div className="theme-filters">
          <label>
            Variable group
            <select
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setMode('base')
              }}
            >
              {categories.map((name) => (
                <option key={name}>{name}</option>
              ))}
            </select>
          </label>
          <label>
            Responsive values
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as ThemeMode)}
            >
              <option value="base">Shared / desktop</option>
              <option value="tablet">Tablet ≤ 64em</option>
              <option value="mobile">Mobile ≤ 40em</option>
            </select>
          </label>
          <label className="theme-search">
            Search variables
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="e.g. brand/primary"
            />
          </label>
        </div>
        <div className="theme-token-list">
          {tokens.length === 0 && <p>No variables in this group and mode.</p>}
          {tokens.map((token) => {
            const value = tokenValue(token, mode, overrides)
            const changed = overrides[mode][token.name] !== undefined
            return (
              <div className="theme-token" key={token.name}>
                <label htmlFor={`edit-${token.css}`}>
                  <strong>{token.name}</strong>
                  <small>
                    {token.css}
                    {value.startsWith('var(')
                      ? ` · linked to ${value.slice(4, -1)}`
                      : ''}
                  </small>
                </label>
                <div className="theme-value">
                  {token.color ? (
                    <>
                      <input
                        id={`edit-${token.css}`}
                        type="color"
                        value={resolvedColor(token, overrides)}
                        onChange={(event) =>
                          change(token.name, event.target.value)
                        }
                        aria-label={token.name}
                      />
                      <span>
                        {resolvedColor(token, overrides).toUpperCase()}
                      </span>
                    </>
                  ) : (
                    <>
                      <input
                        id={`edit-${token.css}`}
                        type="number"
                        aria-label={token.name}
                        min="0"
                        max="10000"
                        step="any"
                        value={Number.parseFloat(value)}
                        onChange={(event) => {
                          const number = event.target.valueAsNumber
                          if (
                            Number.isFinite(number) &&
                            number >= 0 &&
                            number <= 10000
                          )
                            change(token.name, `${number}${token.unit}`)
                        }}
                      />
                      <span>{token.unit || 'value'}</span>
                    </>
                  )}
                  <button
                    disabled={!changed}
                    type="button"
                    aria-label={`Reset ${token.name}`}
                    onClick={() =>
                      setOverrides((current) => {
                        const next = { ...current[mode] }
                        delete next[token.name]
                        return { ...current, [mode]: next }
                      })
                    }
                  >
                    ↺
                  </button>
                </div>
              </div>
            )
          })}
        </div>
        <footer>
          <button
            className="theme-save"
            type="button"
            disabled={!hasChanges || isSaving}
            onClick={() => void saveChanges()}
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
          <button
            className="theme-reset"
            type="button"
            disabled={isSaving}
            onClick={() => setOverrides(emptyOverrides())}
          >
            Reset all variables
          </button>
          <p role="status">{saveStatus}</p>
        </footer>
      </dialog>
    </>
  )
}
