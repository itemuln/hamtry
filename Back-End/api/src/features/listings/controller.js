import { noContent, notFound, sendData, userId } from '../../utils/common.js'
import { Hono } from 'hono'
import { jsonBody } from '../../utils/validation.js'
import { listingSchema, roomSchema } from './schema.js'

export const listingRoutes = new Hono()
listingRoutes.get('/', async (c) => c.json(await c.get('catalog').search(c.req.query())))
listingRoutes.get('/:id', async (c) => {
  const data = await c.get('catalog').get(c.req.param('id'))
  return data ? sendData(c, data) : notFound(c)
})
export function registerListingWrites(app, requireUser) {
  const id = (c) => c.req.param('id')
  app.get('/me/listings', requireUser, async (c) => sendData(c, await c.get('catalog').listOwned(userId(c))))
  app.post('/listings', requireUser, async (c) => {
    const body = await jsonBody(c, listingSchema)
    return sendData(c, await c.get('catalog').create(userId(c), body), 201)
  })
  app.put('/listings/:id', requireUser, async (c) => {
    const body = await jsonBody(c, listingSchema)
    return sendData(c, await c.get('catalog').update(userId(c), id(c), body))
  })
  app.post('/listings/:id/rooms', requireUser, async (c) => {
    const body = await jsonBody(c, roomSchema)
    return sendData(c, await c.get('catalog').addRoom(userId(c), id(c), body), 201)
  })
  app.post('/listings/:id/publish', requireUser, async (c) =>
    sendData(c, await c.get('catalog').publish(userId(c), id(c))),
  )
  app.delete('/listings/:id', requireUser, async (c) => {
    await c.get('catalog').archive(userId(c), id(c))
    return noContent(c)
  })
}
