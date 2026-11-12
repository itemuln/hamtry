export async function request(path, { body, ...options } = {}) {
  const response = await fetch(path, { credentials: 'same-origin', ...options, headers: { ...(body && !(body instanceof FormData) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body) })
  if (response.status === 204) return null
  const result = await response.json().catch(() => ({}))
  if (!response.ok) throw Object.assign(new Error(result.error?.message || result.detail?.message || result.message || 'Үйлчилгээтэй холбогдож чадсангүй.'), { status: response.status, fields: result.error?.fields })
  return result
}
export const currentUser = async () => { try { return (await request('/api/v1/me')).data } catch (error) { if (error.status === 401) return null; throw error } }
export async function publishListing(record, records, signal) {
  const body = { kind: 'rooms', title: record.title, description: record.description, district: record.district, area: '', price: record.price, size: '', available: record.available, location: record.location, conditions: [] }
  let id = record.serverId
  if (id) await request(`/api/v1/listings/${id}`, { method: 'PUT', signal, body })
  else { id = (await request('/api/v1/listings', { method: 'POST', signal, body })).data.id; record.serverId = id }
  for (let roomIndex = 0; roomIndex < record.rooms.length; roomIndex++) {
    const room = record.rooms[roomIndex]
    const saved = await request(`/api/v1/listings/${id}/rooms`, { method: 'POST', signal, body: { name: room.name, position: roomIndex } })
    for (let index = 0; index < room.photos.length; index++) {
      const photo = records.find(record => record.id === room.photos[index].id)
      if (!photo) throw new Error('Өрөөний зураг олдсонгүй. Дахин нэмнэ үү.')
      const form = new FormData()
      form.set('roomId', saved.data.id); form.set('position', index); form.set('caption', photo.caption)
      form.set('detail', photo.blob, 'detail'); form.set('map', photo.mapBlob || photo.blob, 'map')
      const cover = await (await fetch(photo.cover)).blob(); form.set('card', cover, 'card')
      await request(`/api/v1/listings/${id}/photos`, { method: 'POST', body: form, signal })
    }
  }
  await request(`/api/v1/listings/${id}/publish`, { method: 'POST', signal })
  return (await request(`/api/v1/listings/${id}`, { signal })).data
}
