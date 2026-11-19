import test from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, problem } from '../src/utils/errors.js'
import { Hono } from 'hono'
import { chatController } from '../src/features/chat/controller.js'
import { testDatabase } from './d1.js'

test('chat worker keeps messages between participants and validates writes', async (t) => {
  const DB = testDatabase()
  t.after(() => DB.close())
  const now = new Date().toISOString(),
    listingId = '10000000-0000-4000-8000-000000000000'
  for (const [id, name] of [
    ['owner', 'Эзэмшигч'],
    ['seeker', 'Сонирхогч'],
    ['other', 'Бусад'],
  ]) {
    await DB.prepare('INSERT INTO user (id,name,email,createdAt,updatedAt) VALUES (?,?,?,?,?)')
      .bind(id, name, `${id}@test.invalid`, now, now)
      .run()
  }
  await DB.prepare(
    `INSERT INTO listings (id,owner_id,kind,status,title,description,district,price,available,created_at,updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
  )
    .bind(
      listingId,
      'owner',
      'rooms',
      'published',
      'Өрөө',
      'Туршилтын өрөө',
      'Хан-Уул',
      800000,
      '2026-11-20',
      Date.now(),
      Date.now(),
    )
    .run()
  const app = new Hono()
  app.onError((error, c) => {
    if (error instanceof ApiError) return problem(c, error.status, error.code, error.details)
    throw error
  })
  app.route(
    '/chats',
    chatController(async (c, next) => {
      const id = c.req.header('X-Test-User')
      if (!id) return c.json({ error: { code: 'UNAUTHORIZED' } }, 401)
      c.set('user', { id })
      return next()
    }),
  )
  const call = async (path, user, method = 'GET', body) => {
    const response = await app.fetch(
      new Request(`http://localhost${path}`, {
        method,
        headers: {
          ...(user ? { 'X-Test-User': user } : {}),
          ...(body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      }),
      { DB },
    )
    return { status: response.status, data: await response.json() }
  }
  assert.equal((await call('/chats', null)).status, 401)
  assert.equal((await call('/chats', 'owner', 'POST', { listingId })).status, 409)
  assert.equal(
    (await call('/chats', 'seeker', 'POST', { listingId: '20000000-0000-4000-8000-000000000000' })).status,
    404,
  )
  const created = await call('/chats', 'seeker', 'POST', { listingId })
  assert.equal(created.status, 201)
  const id = created.data.data.id
  assert.equal((await call('/chats', 'seeker', 'POST', { listingId })).data.data.id, id)
  assert.equal((await call('/chats', 'owner')).data.data[0].other_name, 'Сонирхогч')
  assert.equal((await call('/chats', 'other')).data.data.length, 0)
  assert.equal((await call(`/chats/${id}/messages`, 'other')).status, 404)
  assert.equal((await call(`/chats/${id}/messages`, 'seeker', 'POST', { body: '   ' })).status, 422)
  assert.equal(
    (await call(`/chats/${id}/messages`, 'seeker', 'POST', { body: '<script>alert(1)</script>' })).status,
    201,
  )
  assert.equal(
    (await call(`/chats/${id}/messages`, 'owner', 'POST', { body: '  Сайн байна уу  ' })).data.data.body,
    'Сайн байна уу',
  )
  assert.deepEqual(
    (await call(`/chats/${id}/messages`, 'seeker')).data.data.map((message) => message.body),
    ['<script>alert(1)</script>', 'Сайн байна уу'],
  )
  assert.equal((await call(`/chats/${id}/messages`, 'other', 'POST', { body: 'Нууц' })).status, 404)
})
