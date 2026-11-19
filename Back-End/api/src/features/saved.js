import { noContent, notFound, sendData, userId } from '../utils/common.js'
import { ERROR, problem } from '../utils/errors.js'

export function registerSaved(v1, requireUser) {
  v1.get('/saved', requireUser, async (c) => {
    return sendData(c, await c.get('catalog').listSaved(userId(c)))
  })
  v1.put('/saved/:id', requireUser, async (c) => {
    if (!(await c.get('catalog').isPublished(c.req.param('id')))) return notFound(c)
    const count = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM saved_listings WHERE user_id=?')
      .bind(userId(c))
      .first()
    if (count.count >= 100) return problem(c, 409, ERROR.SAVED_LIMIT)
    await c.env.DB.prepare(
      'INSERT INTO saved_listings (user_id,listing_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING',
    )
      .bind(userId(c), c.req.param('id'), Date.now())
      .run()
    return noContent(c)
  })
  v1.delete('/saved/:id', requireUser, async (c) => {
    await c.env.DB.prepare('DELETE FROM saved_listings WHERE user_id=? AND listing_id=?')
      .bind(userId(c), c.req.param('id'))
      .run()
    return noContent(c)
  })
}
