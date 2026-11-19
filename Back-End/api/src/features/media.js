import { noContent, notFound, userId } from '../utils/common.js'
import { ERROR, problem } from '../utils/errors.js'
import { inspectImage } from '../utils/image-validation.js'
import { photoMetadataSchema } from '../utils/validation.js'
import { MAX_PHOTO_BYTES, MAX_PHOTOS, PHOTO_VARIANT_DIMENSIONS, PHOTO_VARIANTS } from '../utils/constants.js'

export function registerMedia(app, requireUser, authFor) {
  app.post('/listings/:id/photos', requireUser, async (c) => {
    const listing = await c.get('catalog').owned(userId(c), c.req.param('id'))
    if (!listing) return notFound(c)
    if (listing.status !== 'draft') return problem(c, 409, ERROR.NOT_DRAFT)
    if (!c.env.PHOTOS) return problem(c, 503, ERROR.MEDIA_UNAVAILABLE)
    let form
    try {
      form = await c.req.formData()
    } catch {
      return problem(c, 400, ERROR.INVALID_UPLOAD)
    }
    const metadata = photoMetadataSchema.safeParse({
      roomId: form.get('roomId'),
      position: form.get('position'),
      caption: form.get('caption') || '',
    })
    if (!metadata.success) return problem(c, 422, ERROR.INVALID_UPLOAD)
    const { roomId, position, caption } = metadata.data
    if (
      !(await c.env.DB.prepare('SELECT id FROM rooms WHERE id=? AND listing_id=?')
        .bind(roomId, listing.id)
        .first())
    )
      return notFound(c)
    const count = await c.env.DB.prepare(
      "SELECT COUNT(*) AS total FROM photos WHERE listing_id=? AND variant='detail' AND NOT(room_id=? AND position=?)",
    )
      .bind(listing.id, roomId, position)
      .first()
    if (count.total >= MAX_PHOTOS) return problem(c, 409, ERROR.PHOTO_LIMIT)
    const variants = []
    for (const variant of PHOTO_VARIANTS) {
      const file = form.get(variant)
      if (!(file instanceof File) || !file.size || file.size > MAX_PHOTO_BYTES)
        return problem(c, 422, ERROR.INVALID_IMAGE)
      const bytes = new Uint8Array(await file.arrayBuffer())
      const info = inspectImage(bytes)
      const max = PHOTO_VARIANT_DIMENSIONS[variant]
      if (Math.max(info.width, info.height) > max) return problem(c, 422, ERROR.IMAGE_TOO_LARGE)
      variants.push({
        id: crypto.randomUUID(),
        key: `listings/${listing.id}/${crypto.randomUUID()}/${variant}`,
        variant,
        bytes,
        ...info,
      })
    }
    const old = await c.env.DB.prepare('SELECT object_key FROM photos WHERE room_id=? AND position=?')
      .bind(roomId, position)
      .all()
    const written = []
    try {
      for (const photo of variants) {
        await c.env.PHOTOS.put(photo.key, photo.bytes, { httpMetadata: { contentType: photo.mime } })
        written.push(photo.key)
      }
      await c.env.DB.batch(
        variants.map((photo) =>
          c.env.DB.prepare(
            `
              INSERT INTO photos
              (id,listing_id,room_id,owner_id,object_key,variant,mime,bytes,width,height,caption,position,created_at)
              VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
              ON CONFLICT(room_id,position,variant)
              DO UPDATE SET
              id=excluded.id, object_key=excluded.object_key, mime=excluded.mime,
              bytes=excluded.bytes, width=excluded.width, height=excluded.height, caption=excluded.caption
            `,
          ).bind(
            photo.id,
            listing.id,
            roomId,
            userId(c),
            photo.key,
            photo.variant,
            photo.mime,
            photo.bytes.length,
            photo.width,
            photo.height,
            caption,
            position,
            Date.now(),
          ),
        ),
      )
    } catch (error) {
      await c.env.PHOTOS.delete(written)
      throw error
    }
    // DB шинэчлэгдсэний дараа хуучин object-уудыг устгана.
    if (old.results.length)
      c.executionCtx.waitUntil(c.env.PHOTOS.delete(old.results.map((photo) => photo.object_key)))
    return c.json(
      {
        data: variants.map((photo) => ({
          id: photo.id,
          variant: photo.variant,
          width: photo.width,
          height: photo.height,
        })),
      },
      201,
    )
  })
  app.get('/media/:id', async (c) => {
    const photo = await c.env.DB.prepare(
      'SELECT p.*,l.status FROM photos p JOIN listings l ON l.id=p.listing_id WHERE p.id=?',
    )
      .bind(c.req.param('id'))
      .first()
    if (!photo || !c.env.PHOTOS) return notFound(c)
    if (photo.status !== 'published') {
      const session = await authFor(c).api.getSession({ headers: c.req.raw.headers })
      if (session?.user.id !== photo.owner_id) return notFound(c)
    }
    const object = await c.env.PHOTOS.get(photo.object_key)
    if (!object) return notFound(c)
    return new Response(object.body, {
      headers: {
        'Content-Type': photo.mime,
        'Content-Length': String(photo.bytes),
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'private, no-store',
        'Content-Disposition': 'inline',
      },
    })
  })
  app.delete('/media/:id', requireUser, async (c) => {
    const photo = await c.env.DB.prepare(
      'SELECT p.* FROM photos p JOIN listings l ON l.id=p.listing_id WHERE p.id=? AND p.owner_id=? AND l.status=?',
    )
      .bind(c.req.param('id'), userId(c), 'draft')
      .first()
    if (!photo) return notFound(c)
    const variants = await c.env.DB.prepare('SELECT id,object_key FROM photos WHERE room_id=? AND position=?')
      .bind(photo.room_id, photo.position)
      .all()
    await c.env.DB.prepare('DELETE FROM photos WHERE room_id=? AND position=?')
      .bind(photo.room_id, photo.position)
      .run()
    if (c.env.PHOTOS) await c.env.PHOTOS.delete(variants.results.map((item) => item.object_key))
    return noContent(c)
  })
}
