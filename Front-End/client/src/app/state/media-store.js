import { workerClient } from '../workers/client.js'
// Зураг localStorage-д багтахгүй. Blob-ууд IndexedDB-д, metadata app store-д хадгалагдана.
function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hamtry-media-v1', 1)
    request.onupgradeneeded = () => request.result.createObjectStore('photos', { keyPath: 'id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    request.onblocked = () => reject(new Error('Зургийн хадгалалт өөр цонхонд түгжигдсэн байна.'))
  })
}
async function transaction(mode, run) {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const tx = db.transaction('photos', mode)
    let result
    tx.oncomplete = () => { db.close(); resolve(result) }
    tx.onabort = tx.onerror = () => { db.close(); reject(tx.error || new Error('Зураг хадгалж чадсангүй.')) }
    try { run(tx.objectStore('photos'), value => { result = value }) }
    catch (error) { tx.abort(); db.close(); reject(error) }
  })
}
export const savePhotos = records => transaction('readwrite', store => records.forEach(record => store.put({ id: record.id, blob: record.blob, mapBlob: record.mapBlob })))
export const deletePhotos = ids => transaction('readwrite', store => ids.forEach(id => store.delete(id)))
export const readPhoto = (id, variant = 'detail') => transaction('readonly', (store, set) => { store.get(id).onsuccess = event => { const photo = event.target.result; set(variant === 'map' ? photo?.mapBlob || photo?.blob : photo?.blob) } })

export async function preparePhoto(file, { signal } = {}) {
  if (signal?.aborted) throw new DOMException('Цуцлагдлаа.', 'AbortError')
  if (typeof Worker !== 'function' || typeof OffscreenCanvas !== 'function') {
    const { processPhoto } = await import('./photo-processing.js')
    return processPhoto(file)
  }
  const client = workerClient(new Worker(new URL('../workers/photos.worker.js', import.meta.url), { type: 'module', name: 'hamtry-photos' }))
  const abort = () => client.close(new DOMException('Цуцлагдлаа.', 'AbortError'))
  signal?.addEventListener('abort', abort, { once: true })
  try { return await client.request('prepare', { file }) }
  finally { signal?.removeEventListener('abort', abort); client.close() }
}
