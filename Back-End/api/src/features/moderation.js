import { noContent, notFound, sendData, userId } from '../utils/common.js'
import { jsonBody, reportSchema } from '../utils/validation.js'
import { ERROR, problem } from '../utils/errors.js'

export function registerModeration(v1, requireUser) {
  v1.post('/reports', requireUser, async (c) => {
    const body = await jsonBody(c, reportSchema)
    if (!(await c.get('catalog').isPublished(body.listingId))) return notFound(c)
    await c.env.DB.prepare(
      `
        INSERT INTO reports (id,reporter_id,listing_id,reason,created_at)
        VALUES (?,?,?,?,?)
        ON CONFLICT(reporter_id,listing_id)
        DO UPDATE SET reason=excluded.reason,status=?
      `,
    )
      .bind(crypto.randomUUID(), userId(c), body.listingId, body.reason, Date.now(), 'open')
      .run()
    return sendData(c, { status: 'received' }, 201)
  })
  v1.use('/admin/*', requireUser, async (c, next) =>
    c.get('user').role === 'admin' ? next() : problem(c, 403, ERROR.FORBIDDEN),
  )
  v1.get('/admin/reports', async (c) =>
    c.json({
      data: (
        await c.env.DB.prepare(
          `
            SELECT id,listing_id,reason,status,created_at
            FROM reports
            WHERE status='open'
            ORDER BY created_at LIMIT 100
          `,
        ).all()
      ).results,
    }),
  )
  v1.post('/admin/listings/:id/archive', async (c) => {
    await c.env.DB.batch([
      c.env.DB.prepare("UPDATE listings SET status='archived',updated_at=? WHERE id=?").bind(
        Date.now(),
        c.req.param('id'),
      ),
      c.env.DB.prepare("UPDATE reports SET status='resolved' WHERE listing_id=?").bind(c.req.param('id')),
    ])
    return noContent(c)
  })
}
