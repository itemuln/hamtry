import { hasJpegSignature, hasPngSignature, hasWebpSignature, matchesBytes } from './image-signatures.js'
import { ApiError, ERROR } from './errors.js'

const MAX_DIMENSION = 20_000
const MAX_PIXELS = 40_000_000

// Зөвшөөрсөн image signature болон бодит хэмжээсийг сервер шалгана; client MIME-д итгэхгүй.
export function inspectImage(bytes) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  const ascii = (start, length) => String.fromCharCode(...bytes.slice(start, start + length))
  let mime, width, height
  if (hasPngSignature(bytes)) {
    mime = 'image/png'
    width = view.getUint32(16)
    height = view.getUint32(20)
    if (!matchesBytes(bytes, bytes.length - 8, 'IEND')) throw new ApiError(422, ERROR.INVALID_IMAGE)
  } else if (hasWebpSignature(bytes)) {
    if (view.getUint32(4, true) + 8 !== bytes.length) throw new ApiError(422, ERROR.INVALID_IMAGE)
    mime = 'image/webp'
    const chunk = ascii(12, 4)
    if (chunk === 'VP8X') {
      width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16)
      height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16)
    } else if (chunk === 'VP8 ' && ascii(23, 3) === '\x9d\x01\x2a') {
      width = view.getUint16(26, true) & 0x3fff
      height = view.getUint16(28, true) & 0x3fff
    } else if (chunk === 'VP8L' && bytes[20] === 47) {
      const bits = view.getUint32(21, true)
      width = (bits & 0x3fff) + 1
      height = ((bits >>> 14) & 0x3fff) + 1
    }
  } else if (hasJpegSignature(bytes)) {
    mime = 'image/jpeg'
    for (let i = 2; i + 8 < bytes.length; ) {
      if (bytes[i++] !== 255) throw new ApiError(422, ERROR.INVALID_IMAGE)
      while (bytes[i] === 255) i++
      const marker = bytes[i++]
      if (marker === 218 || marker === 217) break
      if (marker === 1 || (marker >= 208 && marker <= 215)) continue
      if (i + 2 > bytes.length) break
      const length = view.getUint16(i)
      if (length < 2 || i + length > bytes.length) throw new ApiError(422, ERROR.INVALID_IMAGE)
      if ([192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207].includes(marker)) {
        height = view.getUint16(i + 3)
        width = view.getUint16(i + 5)
        break
      }
      i += length
    }
  }
  if (
    !mime ||
    !width ||
    !height ||
    width > MAX_DIMENSION ||
    height > MAX_DIMENSION ||
    width * height > MAX_PIXELS
  )
    throw new ApiError(422, ERROR.INVALID_IMAGE)
  return { mime, width, height }
}
