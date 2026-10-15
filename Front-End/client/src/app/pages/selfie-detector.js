import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision'
import simdLoader from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import simdBinary from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import plainLoader from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.js?url'
import plainBinary from '@mediapipe/tasks-vision/vision_wasm_nosimd_internal.wasm?url'

export async function createDetector() {
  const simd = await FilesetResolver.isSimdSupported()
  return FaceLandmarker.createFromOptions({ wasmLoaderPath: simd ? simdLoader : plainLoader, wasmBinaryPath: simd ? simdBinary : plainBinary }, {
    baseOptions: { modelAssetPath: `${import.meta.env.BASE_URL}models/face_landmarker.task` },
    runningMode: 'VIDEO', numFaces: 2,
    minFaceDetectionConfidence: .6, minFacePresenceConfidence: .6, minTrackingConfidence: .6,
  })
}
