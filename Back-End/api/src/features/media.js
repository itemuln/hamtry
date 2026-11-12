import { z } from 'zod'
import { owned, missing } from './listings.js'

// Зөвшөөрсөн image signature болон бодит хэмжээсийг сервер шалгана; client MIME-д итгэхгүй.
export function inspectImage(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length))
  let mime, width, height
  if (bytes.length >= 33 && bytes[0] === 137 && ascii(1, 7) === 'PNG\r\n\x1a\n' && ascii(12, 4) === 'IHDR') {
    mime = 'image/png'; width = view.getUint32(16); height = view.getUint32(20)
    if (ascii(bytes.length - 8, 4) !== 'IEND') throw new Error('PNG зураг бүрэн биш байна.')
  } else if (bytes.length >= 30 && ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') {
    if (view.getUint32(4, true) + 8 !== bytes.length) throw new Error('WebP зураг бүрэн биш байна.')
    mime = 'image/webp'
    const chunk = ascii(12, 4)
    if (chunk === 'VP8X') { width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16); height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
    else if (chunk === 'VP8 ' && ascii(23, 3) === '\x9d\x01\x2a') { width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff }
    else if (chunk === 'VP8L' && bytes[20] === 47) { const bits = view.getUint32(21, true); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1 }
  } else if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216 && bytes.at(-2) === 255 && bytes.at(-1) === 217) {
    mime = 'image/jpeg'
    for (let i = 2; i + 8 < bytes.length;) {
      if (bytes[i++] !== 255) throw new Error('JPEG зураг буруу байна.')
      while (bytes[i] === 255) i++
      const marker = bytes[i++]
      if (marker === 218 || marker === 217) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      if (i + 2 > bytes.length) break
      const length = view.getUint16(i)
      if (length < 2 || i + length > bytes.length) throw new Error('JPEG зураг бүрэн биш байна.')
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) { height = view.getUint16(i + 3); width = view.getUint16(i + 5); break }
      i += length
    }
  }
  if (!mime || !width || !height || width > 20000 || height > 20000 || width * height > 40000000) throw new Error('JPG, PNG эсвэл WebP зураг сонгоно уу. Зургийн хэмжээ 40 мегапикселээс бага байна.')
  return { mime, width, height }
}
const metadataSchema = z.object({ roomId: z.string().uuid(), position: z.coerce.number().int().min(0).max(11), caption: z.string().max(120) })
export function registerMedia(app, requireUser, authFor) {
  app.post('/listings/:id/photos', requireUser, async c => {
    const listing = await owned(c, c.req.param('id')); if (!listing) return missing(c)
    if (listing.status !== 'draft') return c.json({ error: { code: 'NOT_DRAFT', message: 'Засах горимд зураг нэмнэ үү.' } }, 409)
    if (!c.env.PHOTOS) return c.json({ error: { code: 'MEDIA_UNAVAILABLE', message: 'Зураг хадгалах үйлчилгээ бэлэн биш байна.' } }, 503)
    let form
    try { form = await c.req.formData() } catch { return c.json({ error: { code: 'INVALID_UPLOAD', message: 'Зураг илгээх хүсэлт буруу байна.' } }, 400) }
    const metadata = metadataSchema.safeParse({ roomId: form.get('roomId'), position: form.get('position'), caption: form.get('caption') || '' })
    if (!metadata.success) return c.json({ error: { code: 'INVALID_UPLOAD', message: 'Зургийн мэдээллээ шалгана уу.' } }, 422)
    const { roomId, position, caption } = metadata.data
    if (!await c.env.DB.prepare('SELECT id FROM rooms WHERE id=? AND listing_id=?').bind(roomId, listing.id).first()) return missing(c)
    const count = await c.env.DB.prepare("SELECT COUNT(*) AS total FROM photos WHERE listing_id=? AND variant='detail' AND NOT(room_id=? AND position=?)").bind(listing.id, roomId, position).first()
    if (count.total >= 12) return c.json({ error: { code: 'PHOTO_LIMIT', message: 'Нийт 12 зураг хүртэл нэмнэ.' } }, 409)
    const variants = []
    for (const variant of ['detail','card','map']) {
      const file = form.get(variant)
      if (!(file instanceof File) || !file.size || file.size > 10 * 1024 * 1024) return c.json({ error: { code: 'INVALID_IMAGE', message: 'Зургийн хувилбар бүр 10 MB-аас бага байна.' } }, 422)
      const bytes = new Uint8Array(await file.arrayBuffer())
      let info
      try { info = inspectImage(bytes) } catch (error) { return c.json({ error: { code: 'INVALID_IMAGE', message: error.message } }, 422) }
      const max = variant === 'detail' ? 1920 : variant === 'map' ? 960 : 720
      if (Math.max(info.width, info.height) > max) return c.json({ error: { code: 'IMAGE_TOO_LARGE', message: 'Зургийг эхлээд тохирох хэмжээнд бэлдэнэ үү.' } }, 422)
      variants.push({ id: crypto.randomUUID(), key: `listings/${listing.id}/${crypto.randomUUID()}/${variant}`, variant, bytes, ...info })
    }
    const old = await c.env.DB.prepare('SELECT object_key FROM photos WHERE room_id=? AND position=?').bind(roomId, position).all()
    const written = []
    try {
      for (const photo of variants) { await c.env.PHOTOS.put(photo.key, photo.bytes, { httpMetadata: { contentType: photo.mime } }); written.push(photo.key) }
      await c.env.DB.batch(variants.map(photo => c.env.DB.prepare('INSERT INTO photos (id,listing_id,room_id,owner_id,object_key,variant,mime,bytes,width,height,caption,position,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(room_id,position,variant) DO UPDATE SET id=excluded.id,object_key=excluded.object_key,mime=excluded.mime,bytes=excluded.bytes,width=excluded.width,height=excluded.height,caption=excluded.caption').bind(photo.id, listing.id, roomId, c.get('user').id, photo.key, photo.variant, photo.mime, photo.bytes.length, photo.width, photo.height, caption, position, Date.now())))
    } catch (error) { await c.env.PHOTOS.delete(written); throw error }
    // DB шинэчлэгдсэний дараа хуучин object-уудыг устгана.
    if (old.results.length) c.executionCtx.waitUntil(c.env.PHOTOS.delete(old.results.map(photo => photo.object_key)))
    return c.json({ data: variants.map(photo => ({ id: photo.id, variant: photo.variant, width: photo.width, height: photo.height })) }, 201)
  })
  app.get('/media/:id', async c => {
    const photo = await c.env.DB.prepare('SELECT p.*,l.status FROM photos p JOIN listings l ON l.id=p.listing_id WHERE p.id=?').bind(c.req.param('id')).first()
    if (!photo || !c.env.PHOTOS) return missing(c)
    if (photo.status !== 'published') {
      const session = await authFor(c).api.getSession({ headers: c.req.raw.headers })
      if (session?.user.id !== photo.owner_id) return missing(c)
    }
    const object = await c.env.PHOTOS.get(photo.object_key)
    if (!object) return missing(c)
    return new Response(object.body, { headers: { 'Content-Type': photo.mime, 'Content-Length': String(photo.bytes), 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'private, no-store', 'Content-Disposition': 'inline' } })
  })
  app.delete('/media/:id', requireUser, async c => {
    const photo = await c.env.DB.prepare('SELECT p.* FROM photos p JOIN listings l ON l.id=p.listing_id WHERE p.id=? AND p.owner_id=? AND l.status=?').bind(c.req.param('id'), c.get('user').id, 'draft').first()
    if (!photo) return missing(c)
    const variants = await c.env.DB.prepare('SELECT id,object_key FROM photos WHERE room_id=? AND position=?').bind(photo.room_id, photo.position).all()
    await c.env.DB.prepare('DELETE FROM photos WHERE room_id=? AND position=?').bind(photo.room_id, photo.position).run()
    if (c.env.PHOTOS) await c.env.PHOTOS.delete(variants.results.map(item => item.object_key))
    return c.body(null, 204)
  })
}
