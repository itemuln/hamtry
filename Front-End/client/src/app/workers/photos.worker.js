import { processPhoto } from '../state/photo-processing.js'
self.onmessage = async ({ data: { id, payload } }) => {
  try { self.postMessage({ id, result: await processPhoto(payload.file, { codec: payload.codec }) }) }
  catch (error) { self.postMessage({ id, error: error.message || 'Зураг бэлдэж чадсангүй.' }) }
}
