import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  emptyOverrides,
  exportTheme,
  parseOverrides,
  themeCss,
} from '../src/design-system/theme.ts'

test('theme uses scalable units and rejects unsafe values', () => {
  const overrides = emptyOverrides()
  overrides.base['radius/md'] = '1.25rem'
  assert.deepEqual(parseOverrides(exportTheme(overrides)), overrides)
  assert.match(themeCss(overrides), /--radius-md: 1.25rem/)
  assert.match(themeCss(overrides), /max-width: 64em/)
  assert.doesNotMatch(themeCss(overrides), /\dpx/)
  for (const value of ['20px', 'url(unsafe)', '-1rem', '10001rem']) {
    overrides.base['radius/md'] = value
    assert.throws(() => parseOverrides(exportTheme(overrides)), /Invalid value/)
  }
})

test('shared store persists edits and serves the same CSS to every consumer', async (t) => {
  const folder = await mkdtemp(join(tmpdir(), 'hamtry-theme-'))
  process.env.HAMTRY_THEME_FILE = join(folder, 'theme.json')
  const { themeRoute } = await import('../theme-store.ts')
  const server = createServer((req, res) => {
    void themeRoute(req, res)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    )
    await rm(folder, { recursive: true, force: true })
    delete process.env.HAMTRY_THEME_FILE
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const url = `http://127.0.0.1:${address.port}`
  const overrides = emptyOverrides()
  overrides.base['brand/primary'] = '#123456'
  overrides.mobile['type/body/md'] = '1.125rem'
  const response = await fetch(url + '/api/theme', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(exportTheme(overrides)),
  })
  assert.equal(response.status, 200)
  assert.deepEqual(
    JSON.parse(await readFile(process.env.HAMTRY_THEME_FILE!, 'utf8'))
      .overrides,
    overrides,
  )
  const theme = await (await fetch(url + '/api/theme')).json()
  assert.deepEqual(theme.overrides, overrides)
  const css = await fetch(url + '/hamtry-theme.css')
  assert.equal(css.headers.get('Cache-Control'), 'no-store')
  assert.equal(await css.text(), themeCss(overrides))
  overrides.base['brand/primary'] = 'url(unsafe)'
  assert.equal(
    (
      await fetch(url + '/api/theme', {
        method: 'PUT',
        body: JSON.stringify(exportTheme(overrides)),
      })
    ).status,
    400,
  )
  assert.deepEqual(
    (await (await fetch(url + '/api/theme')).json()).overrides,
    theme.overrides,
  )
  assert.equal(
    (
      await fetch(url + '/api/theme', {
        method: 'PUT',
        headers: { Origin: 'https://other.example' },
        body: '{}',
      })
    ).status,
    403,
  )
})
