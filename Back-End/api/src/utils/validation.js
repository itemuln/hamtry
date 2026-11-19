import { readJson } from './common.js'
import { MAX_PHOTOS } from './constants.js'
import { ApiError, ERROR, errorMessage, language } from './errors.js'
import { z } from 'zod'
export const profileSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    bio: z.string().trim().max(1500),
    occupation: z.string().trim().max(80),
  })
  .strict()
export async function jsonBody(c, schema) {
  const input = await readJson(c)
  const result = schema.safeParse(input)
  if (result.success) return result.data
  const locale = language(c)
  const fields = result.error.flatten((issue) => {
    const code = issue.params?.errorCode || (issue.path.length ? ERROR.INVALID_FIELD : ERROR.INVALID_FIELDS)
    return { code, message: errorMessage(code, locale) }
  })
  throw new ApiError(422, ERROR.VALIDATION_ERROR, { fields })
}

export const photoMetadataSchema = z.object({
  roomId: z.string().uuid(),
  position: z.coerce
    .number()
    .int()
    .min(0)
    .max(MAX_PHOTOS - 1),
  caption: z.string().max(120),
})

export const reportSchema = z
  .object({ listingId: z.string().min(1).max(100), reason: z.string().trim().min(10).max(1000) })
  .strict()
