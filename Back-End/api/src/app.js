import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { requestId } from 'hono/request-id'
import { createAuth } from './auth.js'
import { listingRoutes, registerListingWrites, hydrate, missing } from './features/listings.js'
import { registerMedia } from './features/media.js'
import { profileSchema, jsonBody } from './validation.js'
import { z } from 'zod'
import { registerLiveness } from './features/liveness.js'

export const api = new Hono()
export const authFor = c => c.get('auth') || (() => { const auth = createAuth(c.env, new URL(c.req.url).origin); c.set('auth', auth); return auth })()
export const requireUser = async (c, next) => {
  const session = await authFor(c).api.getSession({ headers: c.req.raw.headers })
  if (!session) return c.json({ error: { code: 'UNAUTHORIZED', message: 'Эхлээд нэвтэрнэ үү.' } }, 401)
  c.set('user', session.user); return next()
}
api.use('*', requestId())
api.use('*', async (c, next) => {
  c.header('Cache-Control', 'no-store'); c.header('X-Content-Type-Options', 'nosniff')
  if (!c.env.DB && c.req.path !== '/api/liveness/health') return c.json({ error: { code: 'DATABASE_UNAVAILABLE', message: 'Өгөгдлийн сан тохируулагдаагүй байна.' } }, 503)
  if (!['GET','HEAD','OPTIONS'].includes(c.req.method)) {
    const allowed = [new URL(c.req.url).origin, c.env.APP_ORIGIN, c.env.DEV_ORIGIN].filter(Boolean)
    if (!allowed.includes(c.req.header('Origin'))) return c.json({ error: { code: 'INVALID_ORIGIN', message: 'Хүсэлтийн эх сурвалж буруу байна.' } }, 403)
  }
  await next()
})
api.use('*', (c, next) => bodyLimit({ maxSize: /^\/api\/v1\/listings\/[^/]+\/photos$/.test(c.req.path) ? 30 * 1024 * 1024 : c.req.path === '/api/liveness/verify' ? 1600000 : 32768, onError: c => c.json({ error: { code: 'BODY_TOO_LARGE', message: 'Илгээсэн мэдээлэл хэт том байна.' } }, 413) })(c, next))
api.get('/api/v1/health', async c => {
  await c.env.DB.prepare('SELECT 1').first()
  return c.json({ status: 'ready', service: 'hamtry-api', auth: Boolean(c.env.AUTH_SECRET?.length >= 32), media: Boolean(c.env.PHOTOS) })
})
api.all('/api/auth/*', c => authFor(c).handler(c.req.raw))
const v1 = new Hono()
v1.route('/listings', listingRoutes)
registerListingWrites(v1, requireUser)
registerMedia(v1, requireUser, authFor)
v1.get('/me', requireUser, async c => {
  const user = c.get('user'), profile = await c.env.DB.prepare('SELECT bio,occupation FROM profiles WHERE user_id=?').bind(user.id).first()
  return c.json({ data: { id: user.id, name: user.name, email: user.email, emailVerified: user.emailVerified, bio: profile?.bio || '', occupation: profile?.occupation || '' } })
})
v1.patch('/me', requireUser, async c => {
  const body = await jsonBody(c, profileSchema); if (body.response) return body.response
  const user = c.get('user'), now = Date.now()
  await c.env.DB.batch([
    c.env.DB.prepare('UPDATE user SET name=?,updatedAt=? WHERE id=?').bind(body.data.name, new Date(now).toISOString(), user.id),
    c.env.DB.prepare('INSERT INTO profiles (user_id,bio,occupation,updated_at) VALUES (?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET bio=excluded.bio,occupation=excluded.occupation,updated_at=excluded.updated_at').bind(user.id, body.data.bio, body.data.occupation, now),
  ])
  return c.json({ data: body.data })
})
v1.get('/saved', requireUser, async c => {
  const rows = await c.env.DB.prepare("SELECT l.*,u.name AS owner_name FROM saved_listings s JOIN listings l ON l.id=s.listing_id JOIN user u ON u.id=l.owner_id WHERE s.user_id=? AND l.status='published' ORDER BY s.created_at DESC LIMIT 100").bind(c.get('user').id).all()
  return c.json({ data: await hydrate(c.env.DB, rows.results) })
})
v1.put('/saved/:id', requireUser, async c => {
  if (!await c.env.DB.prepare("SELECT id FROM listings WHERE id=? AND status='published'").bind(c.req.param('id')).first()) return missing(c)
  const count = await c.env.DB.prepare('SELECT COUNT(*) AS count FROM saved_listings WHERE user_id=?').bind(c.get('user').id).first()
  if (count.count >= 100) return c.json({ error: { code: 'SAVED_LIMIT', message: '100 хүртэл зар хадгална.' } }, 409)
  await c.env.DB.prepare('INSERT INTO saved_listings (user_id,listing_id,created_at) VALUES (?,?,?) ON CONFLICT DO NOTHING').bind(c.get('user').id, c.req.param('id'), Date.now()).run()
  return c.body(null, 204)
})
v1.delete('/saved/:id', requireUser, async c => { await c.env.DB.prepare('DELETE FROM saved_listings WHERE user_id=? AND listing_id=?').bind(c.get('user').id, c.req.param('id')).run(); return c.body(null, 204) })
v1.post('/reports', requireUser, async c => {
  const body = await jsonBody(c, z.object({ listingId: z.string().min(1).max(100), reason: z.string().trim().min(10).max(1000) }).strict()); if (body.response) return body.response
  if (!await c.env.DB.prepare("SELECT id FROM listings WHERE id=? AND status='published'").bind(body.data.listingId).first()) return missing(c)
  await c.env.DB.prepare('INSERT INTO reports (id,reporter_id,listing_id,reason,created_at) VALUES (?,?,?,?,?) ON CONFLICT(reporter_id,listing_id) DO UPDATE SET reason=excluded.reason,status=?').bind(crypto.randomUUID(), c.get('user').id, body.data.listingId, body.data.reason, Date.now(), 'open').run()
  return c.json({ data: { status: 'received' } }, 201)
})
v1.use('/admin/*', requireUser, async (c, next) => c.get('user').role === 'admin' ? next() : c.json({ error: { code: 'FORBIDDEN', message: 'Эрх хүрэхгүй байна.' } }, 403))
v1.get('/admin/reports', async c => c.json({ data: (await c.env.DB.prepare("SELECT id,listing_id,reason,status,created_at FROM reports WHERE status='open' ORDER BY created_at LIMIT 100").all()).results }))
v1.post('/admin/listings/:id/archive', async c => { await c.env.DB.batch([c.env.DB.prepare("UPDATE listings SET status='archived',updated_at=? WHERE id=?").bind(Date.now(), c.req.param('id')), c.env.DB.prepare("UPDATE reports SET status='resolved' WHERE listing_id=?").bind(c.req.param('id'))]); return c.body(null, 204) })
registerLiveness(api, requireUser)
api.route('/api/v1', v1)
api.notFound(c => c.json({ error: { code: 'NOT_FOUND', message: 'Хаяг олдсонгүй.' } }, 404))
api.onError((error, c) => {
  console.error(JSON.stringify({ requestId: c.get('requestId'), message: error.message }))
  return c.json({ error: { code: 'INTERNAL_ERROR', message: 'Үйлчилгээнд алдаа гарлаа. Дахин оролдоорой.', requestId: c.get('requestId') } }, 500)
})
