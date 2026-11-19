const messages = {
  SELF_CHAT: ['Өөрийн зар руу мессеж бичих боломжгүй.', 'You cannot start a chat on your own listing.'],
  AUTH_NOT_CONFIGURED: [
    'Нэвтрэх үйлчилгээ тохируулагдаагүй байна.',
    'Authentication is unavailable. Try again later.',
  ],
  INVALID_FIELD: ['Энэ талбарын утгыг шалгана уу.', 'Check the value for this field.'],
  INVALID_FIELDS: [
    'Илгээсэн талбарууд болон заавал бөглөх утгуудыг шалгана уу.',
    'Check the submitted fields and their required values.',
  ],
  INVALID_MOVE_IN_DATE: ['Нүүх огноо буруу байна.', 'Enter a valid move-in date.'],
  ROOM_LOCATION_REQUIRED: ['Өрөөний байршлыг сонгоно уу.', 'Select a location for the room.'],
  INVALID_GRAPHQL: [
    'GraphQL хүсэлт буруу байна. Query болон хувьсагчдаа шалгана уу.',
    'Check the GraphQL query, variables, and operation name. Fragments are currently unsupported.',
  ],
  AUTH_FAILED: ['Нэвтрэх мэдээллээ шалгаад дахин оролдоно уу.', 'Check your account details and try again.'],
  AUTH_RATE_LIMIT: [
    'Хэт олон оролдлого хийлээ. Түр хүлээгээд дахин оролдоно уу.',
    'Too many attempts. Wait and try again.',
  ],
  LIVENESS_UNAVAILABLE: [
    'Selfie үйлчилгээтэй холбогдсонгүй. Дахин оролдоно уу.',
    'Selfie verification is unavailable. Try again later.',
  ],
  LIVENESS_FAILED: [
    'Selfie шалгалт амжилтгүй боллоо. Дахин эхлүүлнэ үү.',
    'Selfie verification failed. Start a new session and try again.',
  ],
  LIVENESS_EXPIRED: [
    'Шалгалт дууссан эсвэл хугацаа нь дууссан байна. Дахин эхлүүлээрэй.',
    'This verification session expired or has already been used. Start a new session.',
  ],
  INVALID_FRAMES: ['Гурван selfie зураг илгээнэ үү.', 'Send exactly three valid selfie frames.'],
  UNAUTHORIZED: ['Эхлээд нэвтэрнэ үү.', 'Sign in to continue.'],
  DATABASE_UNAVAILABLE: ['Өгөгдлийн сан тохируулагдаагүй байна.', 'The database is temporarily unavailable.'],
  INVALID_ORIGIN: ['Хүсэлтийн эх сурвалж буруу байна.', 'This request origin is not allowed.'],
  BODY_TOO_LARGE: ['Илгээсэн мэдээлэл хэт том байна.', 'The request exceeds the size limit.'],
  SAVED_LIMIT: ['100 хүртэл зар хадгална.', 'You can save up to 100 listings.'],
  FORBIDDEN: ['Эрх хүрэхгүй байна.', 'You do not have permission for this action.'],
  NOT_FOUND: ['Хаяг олдсонгүй.', 'The requested resource was not found.'],
  INTERNAL_ERROR: ['Үйлчилгээнд алдаа гарлаа. Дахин оролдоорой.', 'Something went wrong. Try again later.'],
  INVALID_JSON: ['JSON мэдээлэл буруу байна.', 'Send a valid JSON body.'],
  NOT_DRAFT: ['Засах горимд зураг нэмнэ үү.', 'Move the listing to draft before editing it.'],
  MEDIA_UNAVAILABLE: [
    'Зураг хадгалах үйлчилгээ бэлэн биш байна.',
    'Photo storage is temporarily unavailable.',
  ],
  INVALID_UPLOAD: ['Зураг илгээх хүсэлт буруу байна.', 'Check the photo upload and its metadata.'],
  PHOTO_LIMIT: ['Нийт 12 зураг хүртэл нэмнэ.', 'You can add up to 12 photos.'],
  INVALID_IMAGE: [
    'Зургийн хувилбар бүр 10 MB-аас бага байна.',
    'Upload valid JPG, PNG or WebP images under 10 MB per variant and within 40 megapixels.',
  ],
  IMAGE_TOO_LARGE: [
    'Зургийг эхлээд тохирох хэмжээнд бэлдэнэ үү.',
    'Resize the image to fit the limits for this variant.',
  ],
  LISTING_LIMIT: ['100 зарын хязгаарт хүрсэн байна.', 'You have reached the limit of 100 listings.'],
  INCOMPLETE_DRAFT: [
    'Өрөө бүрт зураг нэмээд дахин оролдоорой.',
    'Add a photo to every room before publishing.',
  ],
  VALIDATION_ERROR: ['Мэдээллээ шалгана уу.', 'Check the highlighted fields.'],
  INVALID_QUERY: [
    'Хайлтын нөхцөл болон хуудасны мэдээллээ шалгана уу.',
    'Check the listing filters, page size, and cursor.',
  ],
}

export const ERROR = Object.freeze({
  SELF_CHAT: 'SELF_CHAT',
  AUTH_NOT_CONFIGURED: 'AUTH_NOT_CONFIGURED',
  INVALID_FIELD: 'INVALID_FIELD',
  INVALID_FIELDS: 'INVALID_FIELDS',
  INVALID_MOVE_IN_DATE: 'INVALID_MOVE_IN_DATE',
  ROOM_LOCATION_REQUIRED: 'ROOM_LOCATION_REQUIRED',
  INVALID_GRAPHQL: 'INVALID_GRAPHQL',
  AUTH_FAILED: 'AUTH_FAILED',
  AUTH_RATE_LIMIT: 'AUTH_RATE_LIMIT',
  LIVENESS_UNAVAILABLE: 'LIVENESS_UNAVAILABLE',
  LIVENESS_FAILED: 'LIVENESS_FAILED',
  LIVENESS_EXPIRED: 'LIVENESS_EXPIRED',
  INVALID_FRAMES: 'INVALID_FRAMES',
  UNAUTHORIZED: 'UNAUTHORIZED',
  DATABASE_UNAVAILABLE: 'DATABASE_UNAVAILABLE',
  INVALID_ORIGIN: 'INVALID_ORIGIN',
  BODY_TOO_LARGE: 'BODY_TOO_LARGE',
  SAVED_LIMIT: 'SAVED_LIMIT',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  INVALID_JSON: 'INVALID_JSON',
  NOT_DRAFT: 'NOT_DRAFT',
  MEDIA_UNAVAILABLE: 'MEDIA_UNAVAILABLE',
  INVALID_UPLOAD: 'INVALID_UPLOAD',
  PHOTO_LIMIT: 'PHOTO_LIMIT',
  INVALID_IMAGE: 'INVALID_IMAGE',
  IMAGE_TOO_LARGE: 'IMAGE_TOO_LARGE',
  LISTING_LIMIT: 'LISTING_LIMIT',
  INCOMPLETE_DRAFT: 'INCOMPLETE_DRAFT',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INVALID_QUERY: 'INVALID_QUERY',
})

export class ApiError extends Error {
  constructor(status, code, details = {}) {
    super(code)
    this.status = status
    this.code = code
    this.details = details
  }
}

export function errorMessage(code, locale = 'mn') {
  return (messages[code] || messages.INTERNAL_ERROR)[locale === 'en' ? 1 : 0]
}

export function language(c) {
  const preferences = (c.req.header('Accept-Language') || '')
    .split(',')
    .map((item) => {
      const [tag, weight] = item.trim().toLowerCase().split(';')
      return { tag: tag.split('-')[0], quality: weight ? Number(weight.trim().replace(/^q=/, '')) : 1 }
    })
    .filter(({ tag, quality }) => ['mn', 'en'].includes(tag) && quality > 0 && quality <= 1)
    .sort((a, b) => b.quality - a.quality)
  return preferences[0]?.tag || 'mn'
}

export function problem(c, status, code, details = {}) {
  const locale = language(c)
  const message = errorMessage(code, locale)
  c.header('Content-Language', locale)
  c.header('Vary', 'Accept-Language', { append: true })
  return c.json({ error: { code, message, ...details } }, status)
}
