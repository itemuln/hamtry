import { useRef, useState } from 'react'
import {
  emptyOverrides,
  exportTheme,
  parseOverrides,
  resolvedColor,
  themeCss,
  themeTokens,
  tokenValue,
  type ThemeMode,
} from './theme'
import { useTheme } from './useTheme'
import './theme-editor.css'

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const link = document.createElement('a')
  link.href = url
  link.download = name
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function ThemeEditor({
  overrides,
  setOverrides,
  storageError,
}: ReturnType<typeof useTheme>) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('colors')
  const [mode, setMode] = useState<ThemeMode>('base')
  const [message, setMessage] = useState('')
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
        onClick={() => dialog.current?.showModal()}
      >
        Edit variables
      </button>
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
          Edit once. Every component updates. Changes stay in this browser;
          export them for your component library.
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
              <option value="tablet">Tablet ≤ 1024px</option>
              <option value="mobile">Mobile ≤ 640px</option>
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
          <div className="theme-export">
            <button
              type="button"
              onClick={() =>
                download('hamtry-theme.css', themeCss(overrides), 'text/css')
              }
            >
              Export CSS
            </button>
            <button
              type="button"
              onClick={() =>
                download(
                  'hamtry-theme.json',
                  JSON.stringify(exportTheme(overrides), null, 2),
                  'application/json',
                )
              }
            >
              Export JSON
            </button>
            <label className="theme-import">
              Import JSON
              <input
                type="file"
                accept=".json,application/json"
                onChange={async (event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  try {
                    setOverrides(parseOverrides(JSON.parse(await file.text())))
                    setMessage('Theme imported.')
                  } catch (error) {
                    setMessage(
                      error instanceof Error
                        ? error.message
                        : 'Could not import theme.',
                    )
                  }
                  event.target.value = ''
                }}
              />
            </label>
          </div>
          <button
            className="theme-reset"
            type="button"
            onClick={() => {
              setOverrides(emptyOverrides())
              setMessage('Original Hamtry palette restored.')
            }}
          >
            Reset all variables
          </button>
          <p role="status">
            {storageError || message || 'Saved automatically in this browser.'}
          </p>
        </footer>
      </dialog>
    </>
  )
}
