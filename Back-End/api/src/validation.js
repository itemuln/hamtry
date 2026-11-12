import { z } from 'zod'
export const conditionLabels = { non_smoking: 'Тамхи татдаггүй', pet_friendly: 'Амьтан зөвшөөрнө', furnished: 'Тавилгатай', wifi: 'Wi-Fi', tidy: 'Цэвэрч', work_from_home: 'Гэрээс ажилладаг', desk: 'Ажлын ширээ', reading: 'Ном уншдаг' }
export const districts = ['Сүхбаатар', 'Хан-Уул', 'Баянзүрх', 'Баянгол', 'Чингэлтэй', 'Сонгинохайрхан', 'Налайх', 'Багануур', 'Багахангай']
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value, 'Нүүх огноо буруу байна.')
export const listingSchema = z.object({
  kind: z.enum(['rooms', 'roommates']), title: z.string().trim().min(3).max(100), description: z.string().trim().min(10).max(1500), district: z.enum(districts), area: z.string().trim().max(100).default(''), price: z.number().int().min(1).max(100000000),
  size: z.string().trim().max(80).default(''), available: date, location: z.tuple([z.number().min(-180).max(180), z.number().min(-85).max(85)]).nullable().default(null), conditions: z.array(z.enum(Object.keys(conditionLabels))).max(8).transform(values => [...new Set(values)]).default([]),
}).strict().refine(value => value.kind !== 'rooms' || value.location !== null, 'Өрөөний байршлыг сонгоно уу.')
export const roomSchema = z.object({ name: z.string().trim().min(1).max(60), position: z.number().int().min(0).max(5) }).strict()
export const profileSchema = z.object({ name: z.string().trim().min(1).max(80), bio: z.string().trim().max(1500), occupation: z.string().trim().max(80) }).strict()
export function parse(schema, input) {
  const result = schema.safeParse(input)
  if (!result.success) return { error: { code: 'VALIDATION_ERROR', message: 'Мэдээллээ шалгана уу.', fields: result.error.flatten() } }
  return { data: result.data }
}
export async function jsonBody(c, schema) {
  let input
  try { input = await c.req.json() } catch { return { response: c.json({ error: { code: 'INVALID_JSON', message: 'JSON мэдээлэл буруу байна.' } }, 400) } }
  const result = parse(schema, input)
  return result.error ? { response: c.json(result, 422) } : result
}
