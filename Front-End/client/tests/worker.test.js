import { testDatabase } from '../../../Back-End/api/tests/d1.js'
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

test('Selfie verification requires a session and never forwards unauthenticated frames', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('must not forward') })
  const DB = testDatabase(); t.after(() => DB.close())
  const authEnv = { ...env, DB, AUTH_SECRET: 'test-only-not-a-real-secret-'.repeat(3), APP_ORIGIN: origin }
  const response = await worker.fetch(request('/api/liveness/sessions', { method: 'POST', body: '{}', headers: { Origin: origin, 'Content-Type': 'application/json' } }), authEnv)
  assert.equal(response.status, 401)
  assert.equal(fetchMock.mock.callCount(), 0)
  assert.equal((await worker.fetch(request('/api/liveness/verify', { method: 'POST', body: 'a'.repeat(1600001), headers: { Origin: origin } }), authEnv)).status, 413)
  assert.equal((await worker.fetch(request('/api/v1/listings', { method: 'POST', body: '{}', headers: { Origin: 'https://other.example' } }), authEnv)).status, 403)
})

test('Selfie proxy reports an upstream failure and rejects redirects', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw new Error('offline') })
  assert.equal((await worker.fetch(request('/api/liveness/health'), env)).status, 503)
  fetchMock.mock.mockImplementation(async () => new Response(null, { status: 302, headers: { Location: 'https://other.example' } }))
  assert.equal((await worker.fetch(request('/api/liveness/health'), env)).status, 502)
})
