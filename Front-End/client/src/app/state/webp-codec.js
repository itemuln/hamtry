import encode, { init } from '@jsquash/webp/encode.js'
import scalarUrl from '@jsquash/webp/codec/enc/webp_enc.wasm?url'
import simdUrl from '@jsquash/webp/codec/enc/webp_enc_simd.wasm?url'
let ready
export async function encodeWebp(image, quality) {
  ready ||= init({ locateFile: path => path.includes('simd') ? simdUrl : scalarUrl })
  await ready
  return new Blob([await encode(image, { quality: Math.round(quality * 100) })], { type: 'image/webp' })
}
