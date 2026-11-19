const KIB = 1024
const MIB = KIB * KIB

export const MAX_LISTING_PRICE = 100_000_000
export const DEFAULT_PAGE_SIZE = 24
export const MAX_PAGE_SIZE = 100
export const MAX_PHOTOS = 12
export const MAX_PHOTO_BYTES = 10 * MIB
export const PHOTO_VARIANT_DIMENSIONS = Object.freeze({ detail: 1920, card: 720, map: 960 })
export const PHOTO_VARIANTS = Object.freeze(Object.keys(PHOTO_VARIANT_DIMENSIONS))
export const MAX_JSON_BYTES = 32 * KIB
export const MAX_UPLOAD_BYTES = PHOTO_VARIANTS.length * MAX_PHOTO_BYTES
export const MAX_VERIFICATION_BYTES = 1_600_000
