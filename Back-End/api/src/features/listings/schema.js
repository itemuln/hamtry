import { z } from 'zod'
import { MAX_LISTING_PRICE } from '../../utils/constants.js'
import { ERROR } from '../../utils/errors.js'

export const conditionLabels = {
  non_smoking: 'Тамхи татдаггүй',
  pet_friendly: 'Амьтан зөвшөөрнө',
  furnished: 'Тавилгатай',
  wifi: 'Wi-Fi',
  tidy: 'Цэвэрч',
  work_from_home: 'Гэрээс ажилладаг',
  desk: 'Ажлын ширээ',
  reading: 'Ном уншдаг',
}
export const districts = [
  'Сүхбаатар',
  'Хан-Уул',
  'Баянзүрх',
  'Баянгол',
  'Чингэлтэй',
  'Сонгинохайрхан',
  'Налайх',
  'Багануур',
  'Багахангай',
]
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value,
    { params: { errorCode: ERROR.INVALID_MOVE_IN_DATE }, path: ['available'] },
  )
export const listingSchema = z
  .object({
    kind: z.enum(['rooms', 'roommates']),
    title: z.string().trim().min(3).max(100),
    description: z.string().trim().min(10).max(1500),
    district: z.enum(districts),
    area: z.string().trim().max(100).default(''),
    price: z.number().int().min(1).max(MAX_LISTING_PRICE),
    size: z.string().trim().max(80).default(''),
    available: date,
    location: z
      .tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)])
      .nullable()
      .default(null),
    conditions: z
      .array(z.enum(Object.keys(conditionLabels)))
      .max(8)
      .transform((values) => [...new Set(values)])
      .default([]),
  })
  .strict()
  .refine((value) => value.kind !== 'rooms' || value.location !== null, {
    params: { errorCode: ERROR.ROOM_LOCATION_REQUIRED },
    path: ['location'],
  })
export const roomSchema = z
  .object({ name: z.string().trim().min(1).max(60), position: z.number().int().min(0).max(5) })
  .strict()
