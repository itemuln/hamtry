import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { runInNewContext } from 'node:vm'
import { test } from 'node:test'

test('shared theme loads once and refreshes only on explicit save notifications', async () => {
  const listeners = new Map(), styles = [], events = []
  let requests = 0
  const source = (await readFile(new URL('../public/hamtry-theme.js', import.meta.url), 'utf8'))
    .replace('import.meta.url', JSON.stringify('https://hamtry.site/hamtry-theme.js'))
  await runInNewContext(`(async () => { ${source} })()`, {
    URL,
    document: { createElement: () => ({ dataset: {} }), head: { append: style => styles.push(style) } },
    window: { addEventListener: (type, callback) => listeners.set(type, callback), dispatchEvent: event => events.push(event.type) },
    CustomEvent: class { constructor(type) { this.type = type } },
    fetch: async () => { requests++; return { ok: true, text: async () => `:root{--test:${requests}}` } },
    setInterval: () => { throw new Error('Theme must not poll') },
  })
  assert.equal(requests, 1)
  listeners.get('storage')({ key: 'unrelated-setting' })
  assert.equal(requests, 1)
  listeners.get('storage')({ key: 'hamtry-theme-saved' })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(requests, 2)
  assert.equal(styles.length, 1)
  assert.equal(styles[0].textContent, ':root{--test:2}')
  assert.equal(events.filter(type => type === 'hamtry-theme-change').length, 2)
})
