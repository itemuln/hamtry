import assert from 'node:assert/strict'
import { test } from 'node:test'
import worker from '../server/worker.js'
import { readTheme } from '../server/theme-store.js'
import { exportTheme, themeCss } from '../src/library/design-system/theme.js'

const origin = 'https://hamtry.example'
const request = (path, options) => new Request(origin + path, options)
const env = { LIVENESS_ORIGIN: 'https://inference.example' }

test('Worker preserves the saved theme JSON and CSS, with public writes denied', async () => {
  const theme = await readTheme()
  assert.deepEqual(await (await worker.fetch(request('/api/theme'), env)).json(), exportTheme(theme))
  assert.equal(await (await worker.fetch(request('/hamtry-theme.css'), env)).text(), themeCss(theme))
  assert.equal((await worker.fetch(request('/api/theme', { method: 'PUT', body: '{}' }), env)).status, 403)
})

test('Worker blocks editor aliases and internal backend routes before asset lookup', async () => {
  for (const path of ['/editor', '/editor.html', '/editor/', '/%65ditor.html', '/actuator/health', '/api/missing']) {
    assert.equal((await worker.fetch(request(path), env)).status, 404, path)
  }
  let assetRequest
  const assets = { fetch: async req => { assetRequest = req; return new Response('asset') } }
  assert.equal(await (await worker.fetch(request('/explore.html'), { ...env, ASSETS: assets })).text(), 'asset')
  assert.equal(new URL(assetRequest.url).pathname, '/explore.html')
  await worker.fetch(request('/'), { ...env, ASSETS: assets })
  assert.equal(new URL(assetRequest.url).pathname, '/index.html')
})

test('Selfie proxy forwards bounded JSON to the fixed origin without cookies', async t => {
  let upstream
  let options
  t.mock.method(globalThis, 'fetch', async (url, init) => {
    upstream = url
    options = init
    return Response.json({ session: 'test-session' })
  })
  const response = await worker.fetch(request('/api/liveness/sessions?test=1', {
    method: 'POST', body: '{}', headers: { Cookie: 'private=test', Authorization: 'Bearer private' },
  }), env)
  assert.deepEqual(await response.json(), { session: 'test-session' })
  assert.equal(upstream.href, 'https://inference.example/api/liveness/sessions?test=1')
  assert.deepEqual(options.headers, { 'Content-Type': 'text/plain;charset=UTF-8' })
  assert.equal(options.redirect, 'manual')
  assert.equal(await options.body.text(), '{}')
  assert.equal((await worker.fetch(request('/api/liveness/sessions', { method: 'POST', body: 'a'.repeat(1600001) }), env)).status, 413)
  assert.equal(globalThis.fetch.mock.callCount(), 1)
})

test('Selfie proxy reports an upstream failure and rejects redirects', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  assert.equal((await worker.fetch(request('/api/liveness/health'), env)).status, 503)
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 302, headers: { Location: 'https://other.example' } }))
  assert.equal((await worker.fetch(request('/api/liveness/health'), env)).status, 502)
})
