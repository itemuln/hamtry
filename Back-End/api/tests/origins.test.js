import assert from 'node:assert/strict'
import { test } from 'node:test'
import { api } from '../src/app.js'
import { testDatabase } from './d1.js'

const secret = 'test-only-origin-secret-'.repeat(3)
const send = (url, origin, env) => api.fetch(new Request(`${url}/api/auth/sign-up/email`, {
  method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: '{}',
}), env)

test('signup accepts both deployed hosts and rejects foreign origins at both guards', async t => {
  const DB = testDatabase(); t.after(() => DB.close())
  const env = { DB, AUTH_SECRET: secret, APP_ORIGIN: 'https://hamtry.site', TRUSTED_ORIGINS: 'https://hamtry.23b1num3285.workers.dev' }
  for (const origin of [env.APP_ORIGIN, env.TRUSTED_ORIGINS]) {
    // An incomplete signup must reach body validation, rather than fail origin validation.
    const response = await send(origin, origin, env)
    assert.equal(response.status, 400)
    assert.notEqual((await response.json()).code, 'INVALID_ORIGIN')
  }
  for (const origin of ['https://other.example', 'https://hamtry.site.other.example', 'http://localhost:5173']) {
    assert.equal((await send(env.APP_ORIGIN, origin, env)).status, 403)
  }
})

test('local signup accepts both frontend loopback names through the API proxy', async t => {
  const DB = testDatabase(); t.after(() => DB.close())
  const env = { DB, AUTH_SECRET: secret, APP_ORIGIN: 'http://localhost:5173', TRUSTED_ORIGINS: 'http://127.0.0.1:5173, http://127.0.0.1:8787' }
  for (const origin of [env.APP_ORIGIN, 'http://127.0.0.1:5173']) {
    assert.equal((await send('http://127.0.0.1:8787', origin, env)).status, 400)
  }
})
