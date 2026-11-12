import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import simdLoader from '@mediapipe/tasks-vision/vision_wasm_module_internal.js?url'
import simdBinary from '@mediapipe/tasks-vision/vision_wasm_module_internal.wasm?url'

async function createDetector(modelAssetPath) {
  const simd = await FilesetResolver.isSimdSupported()
  if (!simd) throw new Error('Энэ хөтөч нүүр илрүүлэх WASM SIMD-ийг дэмжихгүй байна. Хөтчөө шинэчлээрэй.')
  return FaceLandmarker.createFromOptions({ wasmLoaderPath: simdLoader, wasmBinaryPath: simdBinary }, {
    baseOptions: { modelAssetPath: modelAssetPath },
    runningMode: 'VIDEO', numFaces: 2,
    minFaceDetectionConfidence: .6, minFacePresenceConfidence: .6, minTrackingConfidence: .6,
  })
}

let detector
self.onmessage = async ({ data: { id, type, payload } }) => {
  try {
    if (type === 'init') {
      detector = await createDetector(payload)
      self.postMessage({ id, result: true })
    } else if (type === 'detect') {
      if (!detector) throw new Error('Нүүр илрүүлэх загвар бэлэн болоогүй байна.')
      try { self.postMessage({ id, result: { faceLandmarks: detector.detectForVideo(payload.bitmap, payload.timestamp).faceLandmarks } }) }
      finally { payload.bitmap.close() }
    }
  } catch (error) { self.postMessage({ id, error: error.message || 'Нүүр илрүүлэлт тасарлаа.' }) }
}
