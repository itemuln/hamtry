import { notFound, userId } from '../../utils/common.js'
import { ERROR, problem } from '../../utils/errors.js'
import { Hono } from 'hono'
import { z } from 'zod'
import { jsonBody } from '../../utils/validation.js'
import * as service from './service.js'

export const startChatSchema = z.object({ listingId: z.string().uuid() }).strict()
export const chatMessageSchema = z.object({ body: z.string().trim().min(1).max(1000) }).strict()

export function chatController(requireUser) {
  const routes = new Hono()
  routes.use('*', requireUser)
  routes.get('/', async (c) => c.json({ data: await service.getChats(c.env.DB, userId(c)) }))
  routes.post('/', async (c) => {
    const body = await jsonBody(c, startChatSchema)
    const result = await service.startChat(c.env.DB, body.listingId, userId(c))
    if (result.error === 'NOT_FOUND') return notFound(c)
    if (result.error === 'SELF_CHAT') return problem(c, 409, ERROR.SELF_CHAT)
    return c.json(result, 201)
  })
  routes.get('/:id/messages', async (c) => {
    const messages = await service.getMessages(c.env.DB, c.req.param('id'), userId(c))
    return messages ? c.json({ data: messages }) : notFound(c)
  })
  routes.post('/:id/messages', async (c) => {
    const body = await jsonBody(c, chatMessageSchema)
    const message = await service.sendMessage(c.env.DB, c.req.param('id'), userId(c), body.body)
    return message ? c.json({ data: message }, 201) : notFound(c)
  })
  return routes
}
