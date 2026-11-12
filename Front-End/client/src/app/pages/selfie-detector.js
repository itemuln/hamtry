import { workerClient } from '../workers/client.js'
export async function createDetector({ signal } = {}) {
  const client = workerClient(new Worker(new URL('../workers/selfie.worker.js', import.meta.url), { type: 'module', name: 'hamtry-selfie' }))
  const close = () => { signal?.removeEventListener('abort', close); client.close() }
  signal?.addEventListener('abort', close, { once: true })
  if (signal?.aborted) close()
  try { await client.request('init', new URL(`${import.meta.env.BASE_URL}models/face_landmarker.task`, location.origin).href) }
  catch (error) { close(); throw error }
  return {
    async detectForVideo(video, timestamp) {
      const bitmap = await createImageBitmap(video)
      try { return await client.request('detect', { bitmap, timestamp }, [bitmap], 15000) }
      catch (error) { bitmap.close(); throw error }
    },
    close,
  }
}
