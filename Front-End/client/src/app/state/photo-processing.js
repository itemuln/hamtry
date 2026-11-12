// Хувилбар бүрийг эх bitmap-ээс үүсгэнэ; жижиг зургийг томруулахгүй.
async function encodePhoto(bitmap, maxEdge, quality, codec) {
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale)), height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : document.createElement('canvas')
  canvas.width = width; canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Зураг боловсруулах боломжгүй байна.')
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  const encode = (type, quality) => canvas.convertToBlob ? canvas.convertToBlob({ type, quality }) : new Promise(resolve => canvas.toBlob(resolve, type, quality))
  let blob = codec === 'wasm' ? null : await encode('image/webp', quality)
  if (blob?.type !== 'image/webp' && typeof OffscreenCanvas === 'function') {
    try {
      const { encodeWebp } = await import('./webp-codec.js')
      blob = await encodeWebp(context.getImageData(0, 0, width, height), quality)
    } catch { /* WASM эхлэх боломжгүй бол JPEG хувилбар ажиллана. */ }
  }
  // Дэмждэггүй format-ыг browser PNG болгож буцааж болно. MIME-ийг заавал шалгана.
  if (blob?.type !== 'image/webp') {
    context.globalCompositeOperation = 'destination-over'
    context.fillStyle = 'white'; context.fillRect(0, 0, canvas.width, canvas.height)
    blob = await encode('image/jpeg', quality)
    if (blob?.type !== 'image/jpeg') throw new Error('Зургийн форматыг бэлдэж чадсангүй.')
  }
  return blob
}
function dataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error('Зургийн preview бэлдэж чадсангүй.'))
    reader.readAsDataURL(blob)
  })
}
export async function processPhoto(file, { codec = 'native' } = {}) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('JPG, PNG эсвэл WebP зураг сонгоно уу.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Нэг зураг 10 MB-аас бага байх ёстой.')
  let bitmap
  try { bitmap = await createImageBitmap(file) }
  catch { throw new Error('Зургийг уншиж чадсангүй. Өөр JPG, PNG эсвэл WebP зураг сонгоно уу.') }
  try {
    const blob = await encodePhoto(bitmap, 1920, .84, codec)
    const mapBlob = await encodePhoto(bitmap, 960, .8, codec)
    let cover = await dataUrl(await encodePhoto(bitmap, 720, .78, codec))
    // localStorage metadata-ийн одоогийн хэмжээнд багтаана; үндсэн зураг IndexedDB-д үлдэнэ.
    for (const edge of [540, 360]) {
      if (cover.length <= 400000) break
      cover = await dataUrl(await encodePhoto(bitmap, edge, .7, codec))
    }
    if (cover.length > 400000) throw new Error('Зургийн preview хэт том байна. Өөр зураг сонгоно уу.')
    return { id: `photo-${crypto.randomUUID()}`, blob, mapBlob, cover, caption: file.name.slice(0, 120) }
  } finally { bitmap.close() }
}
