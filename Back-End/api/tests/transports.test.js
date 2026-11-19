import assert from 'node:assert/strict'
import { test } from 'node:test'
import { createApi } from '../src/app.js'

const origin = 'https://hamtry.example'
const env = { DB: {}, APP_ORIGIN: origin }
const call = (api, path, init) => api.fetch(new Request(origin + path, init), env)

test('REST and GraphQL use the same injected repository', async () => {
  const calls = []
  const api = createApi({
    catalog: () => ({
      search(filters) {
        calls.push(Number(filters.limit))
        return { data: [{ id: 'listing-1', title: 'Room' }], pagination: { nextCursor: null } }
      },
    }),
  })
  const rest = await (await call(api, '/api/v1/listings?limit=5')).json()
  const graphql = await (
    await call(api, '/api/graphql', {
      method: 'POST',
      headers: { Origin: origin, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: '{ listings(limit: 5) { data { id title } pagination { nextCursor } } }',
      }),
    })
  ).json()
  assert.deepEqual(graphql.data.listings, rest)
  assert.deepEqual(calls, [5, 5])
})

test('errors carry stable codes and negotiate a supported language', async () => {
  const api = createApi()
  const mn = await call(api, '/api/unknown')
  const en = await call(api, '/api/unknown', { headers: { 'Accept-Language': 'mn;q=0.2,en-US;q=0.9' } })
  assert.equal(mn.headers.get('Content-Language'), 'mn')
  assert.equal(en.headers.get('Content-Language'), 'en')
  assert.match(en.headers.get('Vary'), /Accept-Language/)
  assert.equal((await mn.json()).error.code, 'NOT_FOUND')
  assert.deepEqual((await en.json()).error, {
    code: 'NOT_FOUND',
    message: 'The requested resource was not found.',
  })
})

test('OpenAPI is available without database bindings', async () => {
  const response = await createApi().request('/api/openapi.json')
  assert.equal(response.status, 200)
  const spec = await response.json()
  assert.ok(spec.paths['/api/graphql'].post)
  assert.ok(spec.paths['/api/v1/listings/{id}/photos'].post.requestBody.content['multipart/form-data'])
})
