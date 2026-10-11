// Зураг localStorage-д багтахгүй. Blob-ууд IndexedDB-д, metadata app store-д хадгалагдана.
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hamtry-media-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Зургийн хадгалалт өөр цонхонд түгжигдсэн байна.'))
  })
}
async function transaction(mode, run) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode)
    let result
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error('Зураг хадгалж чадсангүй.')) }
    try { run(tx.objectStore('photos'), value => { result = value }) }
    catch (error) { tx.abort(); db.close(); reject(error) }
  })
}
export const savePhotos = records => transaction('readwrite', store => records.forEach(record => store.put({ id: record.id, blob: record.blob })))
export const deletePhotos = ids => transaction('readwrite', store => ids.forEach(id => store.delete(id)))
export const readPhoto = id => transaction('readonly', (store, set) => { store.get(id).onsuccess = event => set(event.target.result?.blob) })

// Original файлыг өөрчлөхгүй; preview-д зориулж багасгасан JPEG үүсгэнэ.
export async function preparePhoto(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG эсвэл WebP зураг сонгоно уу.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Нэг зураг 10 MB-аас бага байх ёстой.')
  let bitmap
  try { bitmap = await createImageBitmap(file) }
  catch { throw new Error('Зургийг уншиж чадсангүй. Өөр JPG, PNG эсвэл WebP зураг сонгоно уу.') }
  try {
    const canvas = document.createElement('canvas')
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height))
    canvas.width = Math.max(1, Math.round(bitmap.width * scale)); canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d'); context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height); context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', .82))
    if (!blob) throw new Error('Зургийг бэлдэж чадсангүй.')
    const cover = document.createElement('canvas'), ratio = Math.min(1, 360 / Math.max(canvas.width, canvas.height))
    cover.width = Math.max(1, Math.round(canvas.width * ratio)); cover.height = Math.max(1, Math.round(canvas.height * ratio))
    cover.getContext('2d').drawImage(canvas, 0, 0, cover.width, cover.height)
    return { id: `photo-${crypto.randomUUID()}`, blob, cover: cover.toDataURL('image/jpeg', .7), caption: file.name.slice(0, 120) }
  } finally { bitmap.close() }
}
