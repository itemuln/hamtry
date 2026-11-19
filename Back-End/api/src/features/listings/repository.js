import { DEFAULT_PAGE_SIZE, MAX_LISTING_PRICE, MAX_PAGE_SIZE, PHOTO_VARIANTS } from '../../utils/constants.js'
import { ERROR, ApiError } from '../../utils/errors.js'
import { conditionLabels, districts } from './schema.js'

export async function hydrate(db, rows) {
  if (!rows.length) return []
  const placeholders = rows.map(() => '?').join(','),
    ids = rows.map((row) => row.id)
  const [roomRows, photoRows] = await db.batch([
    db
      .prepare(
        `SELECT id,listing_id,name,position FROM rooms WHERE listing_id IN (${placeholders}) ORDER BY position`,
      )
      .bind(...ids),
    db
      .prepare(
        `
          SELECT id,listing_id,room_id,variant,caption,position,width,height
          FROM photos
          WHERE listing_id IN (${placeholders})
          ORDER BY position
        `,
      )
      .bind(...ids),
  ])
  return rows.map((row) => {
    const pictures = photoRows.results.filter((photo) => photo.listing_id === row.id)
    const url = (variant) => {
      const photo = pictures.find((photo) => photo.variant === variant)
      return photo ? `/api/v1/media/${photo.id}` : ''
    }
    const conditions = JSON.parse(row.conditions)
    return {
      id: row.id,
      kind: row.kind,
      status: row.status,
      title: row.title,
      owner: row.owner_name,
      ownerId: row.owner_id,
      district: row.district,
      area: row.area,
      price: row.price,
      size: row.size,
      available: row.available.replaceAll('-', '.'),
      description: row.description,
      location: row.longitude === null ? null : [row.longitude, row.latitude],
      conditionCodes: conditions,
      traits: conditions.map((code) => conditionLabels[code]).filter(Boolean),
      pets: conditions.includes('pet_friendly'),
      image: url('card'),
      mapImage: url('map') || url('detail'),
      imageAlt: row.title,
      demo: Boolean(row.demo),
      remote: true,
      createdAt: row.created_at,
      rooms: roomRows.results
        .filter((room) => room.listing_id === row.id)
        .map((room) => ({
          id: room.id,
          name: room.name,
          photos: pictures
            .filter((photo) => photo.room_id === room.id && photo.variant === 'detail')
            .map((photo) => ({
              id: photo.id,
              caption: photo.caption,
              src: `/api/v1/media/${photo.id}`,
              width: photo.width,
              height: photo.height,
            })),
        })),
    }
  })
}
export function searchQuery(query) {
  const clauses = ["l.status='published'"],
    params = []
  if (query.kind) {
    if (!['rooms', 'roommates'].includes(query.kind)) throw new ApiError(422, ERROR.INVALID_QUERY)
    clauses.push('l.kind=?')
    params.push(query.kind)
  }
  if (query.district && query.district !== 'all') {
    if (!districts.includes(query.district)) throw new ApiError(422, ERROR.INVALID_QUERY)
    clauses.push('l.district=?')
    params.push(query.district)
  }
  if (query.maxPrice) {
    const amount = Number(query.maxPrice)
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > MAX_LISTING_PRICE)
      throw new ApiError(422, ERROR.INVALID_QUERY)
    clauses.push('l.price<=?')
    params.push(amount)
  }
  if (query.q) {
    if (query.q.length > 100) throw new ApiError(422, ERROR.INVALID_QUERY)
    clauses.push(
      "(l.title LIKE ? ESCAPE '\\' OR l.description LIKE ? ESCAPE '\\' OR l.area LIKE ? ESCAPE '\\')",
    )
    const word = '%' + query.q.replace(/[\\%_]/g, '\\$&') + '%'
    params.push(word, word, word)
  }
  if (query.conditions)
    for (const code of [...new Set(query.conditions.split(','))]) {
      if (!Object.hasOwn(conditionLabels, code)) throw new ApiError(422, ERROR.INVALID_QUERY)
      clauses.push('EXISTS (SELECT 1 FROM json_each(l.conditions) WHERE value=?)')
      params.push(code)
    }
  if (query.bbox) {
    const bounds = query.bbox.split(',').map(Number)
    if (
      bounds.length !== 4 ||
      bounds.some((value) => !Number.isFinite(value)) ||
      bounds[0] < -180 ||
      bounds[2] > 180 ||
      bounds[1] < -85 ||
      bounds[3] > 85 ||
      bounds[0] > bounds[2] ||
      bounds[1] > bounds[3]
    )
      throw new ApiError(422, ERROR.INVALID_QUERY)
    clauses.push('l.longitude BETWEEN ? AND ? AND l.latitude BETWEEN ? AND ?')
    params.push(bounds[0], bounds[2], bounds[1], bounds[3])
  }
  if (query.cursor) {
    let cursor
    try {
      cursor = JSON.parse(atob(query.cursor))
    } catch {
      throw new ApiError(422, ERROR.INVALID_QUERY)
    }
    if (
      !Array.isArray(cursor) ||
      cursor.length !== 2 ||
      !Number.isSafeInteger(cursor[0]) ||
      cursor[0] < 0 ||
      typeof cursor[1] !== 'string' ||
      cursor[1].length > 100
    )
      throw new ApiError(422, ERROR.INVALID_QUERY)
    clauses.push('(l.created_at < ? OR (l.created_at = ? AND l.id < ?))')
    params.push(cursor[0], cursor[0], cursor[1])
  }
  const limit = Number(query.limit || DEFAULT_PAGE_SIZE)
  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_PAGE_SIZE)
    throw new ApiError(422, ERROR.INVALID_QUERY)
  return { where: clauses.join(' AND '), params, limit }
}
export function d1ListingsRepository(db) {
  return {
    owned(ownerId, id) {
      return db.prepare('SELECT * FROM listings WHERE id=? AND owner_id=?').bind(id, ownerId).first()
    },
    async listSaved(ownerId) {
      const rows = await db
        .prepare(
          `
        SELECT l.*,u.name AS owner_name
        FROM saved_listings s
        JOIN listings l ON l.id=s.listing_id
        JOIN user u ON u.id=l.owner_id
        WHERE s.user_id=? AND l.status='published'
        ORDER BY s.created_at DESC LIMIT 100
      `,
        )
        .bind(ownerId)
        .all()
      return hydrate(db, rows.results)
    },
    async listOwned(ownerId) {
      const rows = await db
        .prepare(
          `
            SELECT l.*,u.name AS owner_name
            FROM listings l
            JOIN user u ON u.id=l.owner_id
            WHERE l.owner_id=?
            ORDER BY l.created_at DESC LIMIT 100
          `,
        )
        .bind(ownerId)
        .all()
      return hydrate(db, rows.results)
    },
    async create(ownerId, id, value, now) {
      const result = await db
        .prepare(
          `
            INSERT INTO listings
            (id, owner_id, kind, title, description, district, area, price,
             size, available, longitude, latitude, conditions, created_at, updated_at)
            SELECT ?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12,?13,?14,?15
            WHERE (SELECT COUNT(*)
            FROM listings
            WHERE owner_id=?16 AND status!='archived') < 100
          `,
        )
        .bind(
          id,
          ownerId,
          value.kind,
          value.title,
          value.description,
          value.district,
          value.area,
          value.price,
          value.size,
          value.available,
          value.location?.[0] ?? null,
          value.location?.[1] ?? null,
          JSON.stringify(value.conditions),
          now,
          now,
          ownerId,
        )
        .run()
      return Boolean(result.meta.changes)
    },
    async update(ownerId, id, value) {
      await db
        .prepare(
          `
            UPDATE listings SET
            kind=?, title=?, description=?, district=?, area=?, price=?, size=?, available=?,
            longitude=?, latitude=?, conditions=?, status='draft', updated_at=?
            WHERE id=? AND owner_id=?
          `,
        )
        .bind(
          value.kind,
          value.title,
          value.description,
          value.district,
          value.area,
          value.price,
          value.size,
          value.available,
          value.location?.[0] ?? null,
          value.location?.[1] ?? null,
          JSON.stringify(value.conditions),
          Date.now(),
          id,
          ownerId,
        )
        .run()
    },
    async upsertRoom(id, value) {
      const roomId = crypto.randomUUID()
      await db
        .prepare(
          `
            INSERT INTO rooms (id,listing_id,name,position)
            VALUES (?,?,?,?)
            ON CONFLICT(listing_id,position)
            DO UPDATE SET name=excluded.name
          `,
        )
        .bind(roomId, id, value.name, value.position)
        .run()
      const room = await db
        .prepare('SELECT id FROM rooms WHERE listing_id=? AND position=?')
        .bind(id, value.position)
        .first()
      return room
    },
    async publish(ownerId, id) {
      const result = await db
        .prepare(
          `
            UPDATE listings SET status='published',updated_at=?
            WHERE id=? AND owner_id=? AND status='draft'
            AND EXISTS (SELECT 1
            FROM rooms
            WHERE listing_id=listings.id)
            AND NOT EXISTS (SELECT 1
            FROM rooms r
            WHERE r.listing_id=listings.id
            AND NOT EXISTS (SELECT 1
            FROM photos p
            WHERE p.room_id=r.id AND p.variant='detail'))
            AND NOT EXISTS (SELECT 1
            FROM photos p
            WHERE p.listing_id=listings.id AND p.variant='detail' AND (SELECT COUNT(*)
            FROM photos v
            WHERE v.room_id=p.room_id AND v.position=p.position)!=?)
          `,
        )
        .bind(Date.now(), id, ownerId, PHOTO_VARIANTS.length)
        .run()
      return Boolean(result.meta.changes)
    },
    async archive(ownerId, id) {
      await db
        .prepare("UPDATE listings SET status='archived',updated_at=? WHERE id=? AND owner_id=?")
        .bind(Date.now(), id, ownerId)
        .run()
    },
    async search(filters) {
      const query = searchQuery(filters)
      const result = await db
        .prepare(
          `
            SELECT l.*,u.name AS owner_name
            FROM listings l
            JOIN user u ON u.id=l.owner_id
            WHERE ${query.where}
            ORDER BY l.created_at DESC,l.id DESC LIMIT ?
          `,
        )
        .bind(...query.params, query.limit + 1)
        .all()
      const rows = result.results.slice(0, query.limit)
      const last = rows.at(-1)
      const nextCursor =
        result.results.length > query.limit ? btoa(JSON.stringify([last.created_at, last.id])) : null
      return { data: await hydrate(db, rows), pagination: { nextCursor } }
    },
    async isPublished(id) {
      const listing = await db
        .prepare("SELECT id FROM listings WHERE id=? AND status='published'")
        .bind(id)
        .first()
      return Boolean(listing)
    },
    async get(id) {
      const row = await db
        .prepare(
          `
            SELECT l.*,u.name AS owner_name
            FROM listings l
            JOIN user u ON u.id=l.owner_id
            WHERE l.id=? AND l.status='published'
          `,
        )
        .bind(id)
        .first()
      return row ? (await hydrate(db, [row]))[0] : null
    },
  }
}
