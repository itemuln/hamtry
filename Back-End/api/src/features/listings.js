import { Hono } from 'hono'
import { conditionLabels, listingSchema, roomSchema, jsonBody, districts } from '../validation.js'

export const listingRoutes = new Hono()
export const owned = (c, id) => c.env.DB.prepare('SELECT * FROM listings WHERE id=? AND owner_id=?').bind(id, c.get('user').id).first()
export const missing = c => c.json({ error: { code: 'NOT_FOUND', message: 'Зар олдсонгүй.' } }, 404)
export async function hydrate(db, rows) {
  if (!rows.length) return []
  const placeholders = rows.map(() => '?').join(','), ids = rows.map(row => row.id)
  const [roomRows, photoRows] = await db.batch([
    db.prepare(`SELECT id,listing_id,name,position FROM rooms WHERE listing_id IN (${placeholders}) ORDER BY position`).bind(...ids),
    db.prepare(`SELECT id,listing_id,room_id,variant,caption,position,width,height FROM photos WHERE listing_id IN (${placeholders}) ORDER BY position`).bind(...ids),
  ])
  return rows.map(row => {
    const pictures = photoRows.results.filter(photo => photo.listing_id === row.id)
    const url = variant => { const photo = pictures.find(photo => photo.variant === variant); return photo ? `/api/v1/media/${photo.id}` : '' }
    const conditions = JSON.parse(row.conditions)
    return { id: row.id, kind: row.kind, status: row.status, title: row.title, owner: row.owner_name, ownerId: row.owner_id, district: row.district, area: row.area, price: row.price, size: row.size, available: row.available.replaceAll('-', '.'), description: row.description, location: row.longitude === null ? null : [row.longitude, row.latitude], conditionCodes: conditions, traits: conditions.map(code => conditionLabels[code]).filter(Boolean), pets: conditions.includes('pet_friendly'), image: url('card') || (row.demo ? row.kind === 'rooms' ? '/demo/room.png' : row.id === 'person-1' ? '/demo/person.jpg' : `/demo/${row.id}.svg` : ''), mapImage: url('map') || url('detail'), imageAlt: row.title, demo: Boolean(row.demo), remote: true, createdAt: row.created_at, rooms: roomRows.results.filter(room => room.listing_id === row.id).map(room => ({ id: room.id, name: room.name, photos: pictures.filter(photo => photo.room_id === room.id && photo.variant === 'detail').map(photo => ({ id: photo.id, caption: photo.caption, src: `/api/v1/media/${photo.id}`, width: photo.width, height: photo.height })) })) }
  })
}
export function searchQuery(query) {
  const clauses = ["l.status='published'"], params = []
  if (query.kind) { if (!['rooms','roommates'].includes(query.kind)) throw new Error('Хайх төрөл буруу байна.'); clauses.push('l.kind=?'); params.push(query.kind) }
  if (query.district && query.district !== 'all') { if (!districts.includes(query.district)) throw new Error('Дүүрэг буруу байна.'); clauses.push('l.district=?'); params.push(query.district) }
  if (query.maxPrice) { const amount = Number(query.maxPrice); if (!Number.isSafeInteger(amount) || amount < 1 || amount > 100000000) throw new Error('Төсөв буруу байна.'); clauses.push('l.price<=?'); params.push(amount) }
  if (query.q) { if (query.q.length > 100) throw new Error('Хайлтын үг хэт урт байна.'); clauses.push("(l.title LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\' OR l.area LIKE ? ESCAPE '\\')"); const word = '%' + query.q.replace(/[\\%_]/g, '\\$&') + '%'; params.push(word, word, word) }
  if (query.conditions) for (const code of [...new Set(query.conditions.split(','))]) { if (!(code in conditionLabels)) throw new Error('Нөхцөл буруу байна.'); clauses.push('EXISTS (SELECT 1 FROM json_each(l.conditions) WHERE value=?)'); params.push(code) }
  if (query.bbox) {
    const bounds = query.bbox.split(',').map(Number)
    if (bounds.length !== 4 || bounds.some(value => !Number.isFinite(value)) || bounds[0] < -180 || bounds[2] > 180 || bounds[1] < -85 || bounds[3] > 85 || bounds[0] > bounds[2] || bounds[1] > bounds[3]) throw new Error('Газрын зургийн хүрээ буруу байна.')
    clauses.push('l.longitude BETWEEN ? AND ? AND l.latitude BETWEEN ? AND ?'); params.push(bounds[0], bounds[2], bounds[1], bounds[3])
  }
  if (query.cursor) {
    let cursor
    try { cursor = JSON.parse(atob(query.cursor)) } catch { throw new Error('Хуудасны заагч буруу байна.') }
    if (!Array.isArray(cursor) || cursor.length !== 2 || !Number.isSafeInteger(cursor[0]) || cursor[0] < 0 || typeof cursor[1] !== 'string' || cursor[1].length > 100) throw new Error('Хуудасны заагч буруу байна.')
    clauses.push('(l.created_at < ? OR (l.created_at = ? AND l.id < ?))'); params.push(cursor[0], cursor[0], cursor[1])
  }
  const limit = Number(query.limit || 24)
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new Error('Хуудасны хэмжээ буруу байна.')
  return { where: clauses.join(' AND '), params, limit }
}
listingRoutes.get('/', async c => {
  let query
  try { query = searchQuery(c.req.query()) } catch (error) { return c.json({ error: { code: 'INVALID_QUERY', message: error.message } }, 422) }
  const result = await c.env.DB.prepare(`SELECT l.*,u.name AS owner_name FROM listings l JOIN user u ON u.id=l.owner_id WHERE ${query.where} ORDER BY l.created_at DESC,l.id DESC LIMIT ?`).bind(...query.params, query.limit + 1).all()
  const more = result.results.length > query.limit, rows = result.results.slice(0, query.limit), last = rows.at(-1)
  return c.json({ data: await hydrate(c.env.DB, rows), pagination: { nextCursor: more ? btoa(JSON.stringify([last.created_at, last.id])) : null } })
})
listingRoutes.get('/:id', async c => {
  const row = await c.env.DB.prepare("SELECT l.*,u.name AS owner_name FROM listings l JOIN user u ON u.id=l.owner_id WHERE l.id=? AND l.status='published'").bind(c.req.param('id')).first()
  return row ? c.json({ data: (await hydrate(c.env.DB, [row]))[0] }) : missing(c)
})
export function registerListingWrites(app, requireUser) {
  app.get('/me/listings', requireUser, async c => {
    const rows = await c.env.DB.prepare('SELECT l.*,u.name AS owner_name FROM listings l JOIN user u ON u.id=l.owner_id WHERE l.owner_id=? ORDER BY l.created_at DESC LIMIT 100').bind(c.get('user').id).all()
    return c.json({ data: await hydrate(c.env.DB, rows.results) })
  })
  app.post('/listings', requireUser, async c => {
    const body = await jsonBody(c, listingSchema); if (body.response) return body.response
    const count = await c.env.DB.prepare("SELECT COUNT(*) AS count FROM listings WHERE owner_id=? AND status!='archived'").bind(c.get('user').id).first()
    if (count.count >= 100) return c.json({ error: { code: 'LISTING_LIMIT', message: '100 зарын хязгаарт хүрсэн байна.' } }, 409)
    const value = body.data, id = crypto.randomUUID(), now = Date.now()
    await c.env.DB.prepare('INSERT INTO listings (id,owner_id,kind,title,description,district,area,price,size,available,longitude,latitude,conditions,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id, c.get('user').id, value.kind, value.title, value.description, value.district, value.area, value.price, value.size, value.available, value.location?.[0] ?? null, value.location?.[1] ?? null, JSON.stringify(value.conditions), now, now).run()
    return c.json({ data: { id, status: 'draft' } }, 201)
  })
  app.put('/listings/:id', requireUser, async c => {
    const listing = await owned(c, c.req.param('id')); if (!listing) return missing(c)
    const body = await jsonBody(c, listingSchema); if (body.response) return body.response
    const value = body.data
    await c.env.DB.prepare("UPDATE listings SET kind=?,title=?,description=?,district=?,area=?,price=?,size=?,available=?,longitude=?,latitude=?,conditions=?,status='draft',updated_at=? WHERE id=? AND owner_id=?").bind(value.kind, value.title, value.description, value.district, value.area, value.price, value.size, value.available, value.location?.[0] ?? null, value.location?.[1] ?? null, JSON.stringify(value.conditions), Date.now(), listing.id, c.get('user').id).run()
    return c.json({ data: { id: listing.id, status: 'draft' } })
  })
  app.post('/listings/:id/rooms', requireUser, async c => {
    const listing = await owned(c, c.req.param('id')); if (!listing) return missing(c)
    if (listing.status !== 'draft') return c.json({ error: { code: 'NOT_DRAFT', message: 'Эхлээд зарыг засах горимд оруулна уу.' } }, 409)
    const body = await jsonBody(c, roomSchema); if (body.response) return body.response
    const id = crypto.randomUUID()
    await c.env.DB.prepare('INSERT INTO rooms (id,listing_id,name,position) VALUES (?,?,?,?) ON CONFLICT(listing_id,position) DO UPDATE SET name=excluded.name').bind(id, listing.id, body.data.name, body.data.position).run()
    const room = await c.env.DB.prepare('SELECT id FROM rooms WHERE listing_id=? AND position=?').bind(listing.id, body.data.position).first()
    return c.json({ data: room }, 201)
  })
  app.post('/listings/:id/publish', requireUser, async c => {
    const listing = await owned(c, c.req.param('id')); if (!listing) return missing(c)
    const result = await c.env.DB.prepare(`UPDATE listings SET status='published',updated_at=? WHERE id=? AND owner_id=? AND status='draft' AND EXISTS (SELECT 1 FROM rooms WHERE listing_id=listings.id) AND NOT EXISTS (SELECT 1 FROM rooms r WHERE r.listing_id=listings.id AND NOT EXISTS (SELECT 1 FROM photos p WHERE p.room_id=r.id AND p.variant='detail')) AND NOT EXISTS (SELECT 1 FROM photos p WHERE p.listing_id=listings.id AND p.variant='detail' AND (SELECT COUNT(*) FROM photos v WHERE v.room_id=p.room_id AND v.position=p.position)!=3)`).bind(Date.now(), listing.id, c.get('user').id).run()
    if (!result.meta.changes) return c.json({ error: { code: 'INCOMPLETE_DRAFT', message: 'Өрөө бүрт зураг нэмээд дахин оролдоорой.' } }, 409)
    return c.json({ data: { id: listing.id, status: 'published' } })
  })
  app.delete('/listings/:id', requireUser, async c => {
    const listing = await owned(c, c.req.param('id')); if (!listing) return missing(c)
    await c.env.DB.prepare("UPDATE listings SET status='archived',updated_at=? WHERE id=? AND owner_id=?").bind(Date.now(), listing.id, c.get('user').id).run()
    return c.body(null, 204)
  })
}
