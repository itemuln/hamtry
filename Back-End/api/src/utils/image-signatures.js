const PNG_SIGNATURE = '\x89PNG\r\n\x1a\n'
const JPEG_START = '\xff\xd8'
const JPEG_END = '\xff\xd9'

export function matchesBytes(bytes, offset, signature) {
  if (offset < 0 || offset + signature.length > bytes.length) return false
  for (let index = 0; index < signature.length; index++) {
    if (bytes[offset + index] !== signature.charCodeAt(index)) return false
  }
  return true
}

export function hasPngSignature(bytes) {
  return bytes.length >= 33 && matchesBytes(bytes, 0, PNG_SIGNATURE) && matchesBytes(bytes, 12, 'IHDR')
}

export function hasWebpSignature(bytes) {
  return bytes.length >= 30 && matchesBytes(bytes, 0, 'RIFF') && matchesBytes(bytes, 8, 'WEBP')
}

export function hasJpegSignature(bytes) {
  return (
    bytes.length >= 4 &&
    matchesBytes(bytes, 0, JPEG_START) &&
    matchesBytes(bytes, bytes.length - JPEG_END.length, JPEG_END)
  )
}
