import { readFile } from 'node:fs/promises'

const roomPhoto = new URL('../tests/fixtures/room.png', import.meta.url)
const rooms = [
  { title: 'Төвийн гэрэлтэй өрөө', district: 'Сүхбаатар', area: '11-р хороолол', price: 750000,
    location: [106.928, 47.935], size: '18 м²', conditions: ['furnished', 'non_smoking'] },
  { title: 'Тавилгатай хувийн өрөө', district: 'Хан-Уул', area: '120 мянгат', price: 950000,
    location: [106.915, 47.901], size: '22 м²', conditions: ['furnished', 'pet_friendly'] },
  { title: 'Сургуульд ойр өрөө', district: 'Баянзүрх', area: 'Натур орчим', price: 650000,
    location: [106.956, 47.913], size: '16 м²', conditions: ['wifi', 'non_smoking'] },
  { title: 'Ажиллах булантай өрөө', district: 'Баянгол', area: '3-р хороолол', price: 1100000,
    location: [106.871, 47.922], size: '25 м²', conditions: ['desk', 'wifi'] },
  { title: 'Нам гүм хувийн өрөө', district: 'Чингэлтэй', area: '5-р хороо', price: 820000,
    location: [106.9, 47.923], size: '20 м²', conditions: ['furnished', 'tidy'] },
]

export async function seedDemoRoom(api, index) {
  const template = rooms[index]
  const title = `[Demo] ${template.title}`
  const { data: owned } = await api('/api/v1/me/listings')
  if (owned.some(listing => listing.title === title && listing.status === 'published')) return

  const incomplete = owned.find(listing => listing.title === title && listing.status === 'draft')
  const payload = {
    ...template,
    title,
    kind: 'rooms',
    description: 'Туршилтын зар. Зураг, байршил нь жишээ бөгөөд түрээслэх бодит өрөө биш.',
    available: new Date().toISOString().slice(0, 10),
  }
  const { data: draft } = incomplete ? { data: incomplete } : await api('/api/v1/listings', payload)
  const path = `/api/v1/listings/${draft.id}`
  const { data: room } = await api(`${path}/rooms`, { name: 'Хувийн өрөө', position: 0 })
  const photo = new Blob([await readFile(roomPhoto)], { type: 'image/png' })
  const form = new FormData()
  form.set('roomId', room.id)
  form.set('position', '0')
  form.set('caption', 'Туршилтын интерьерийн зураг')
  for (const variant of ['detail', 'card', 'map']) form.set(variant, photo, 'room.png')
  await api(`${path}/photos`, form)
  await api(`${path}/publish`, {})
}
