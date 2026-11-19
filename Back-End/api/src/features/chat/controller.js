import { Hono } from 'hono'
import { z } from 'zod'
import { jsonBody } from '../../validation.js'
import * as service from './service.js'

const startSchema = z.object({ listingId: z.string().uuid() }).strict()
const messageSchema = z.object({ body: z.string().trim().min(1).max(1000) }).strict()
const missing = c => c.json({ error: { code: 'NOT_FOUND', message: 'Чат олдсонгүй.' } }, 404)

export function chatController(requireUser) {
  const routes = new Hono()
  routes.use('*', requireUser)
  routes.get('/', async c => c.json({ data: await service.getChats(c.env.DB, c.get('user').id) }))
  routes.post('/', async c => {
    const body = await jsonBody(c, startSchema); if (body.response) return body.response
    const result = await service.startChat(c.env.DB, body.data.listingId, c.get('user').id)
    if (result.error === 'NOT_FOUND') return missing(c)
    if (result.error === 'SELF_CHAT') return c.json({ error: { code: 'SELF_CHAT', message: 'Өөрийн зар руу мессеж бичих боломжгүй.' } }, 409)
    return c.json(result, 201)
  })
  routes.get('/:id/messages', async c => {
    const messages = await service.getMessages(c.env.DB, c.req.param('id'), c.get('user').id)
    return messages ? c.json({ data: messages }) : missing(c)
  })
  routes.post('/:id/messages', async c => {
    const body = await jsonBody(c, messageSchema); if (body.response) return body.response
    const message = await service.sendMessage(c.env.DB, c.req.param('id'), c.get('user').id, body.data.body)
    return message ? c.json({ data: message }, 201) : missing(c)
  })
  return routes
}
