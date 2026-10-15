import { request } from 'node:http'
// Local Python inference service; no client-controlled upstream addresses.
export function livenessRoute(req, res) {
  if (!req.url?.startsWith('/api/liveness/')) return false
  const upstream = request({ hostname: '127.0.0.1', port: Number(process.env.LIVENESS_PORT || 8001), path: req.url, method: req.method, headers: { 'content-type': req.headers['content-type'] || 'application/json' }, timeout: 125000 }, response => {
    res.writeHead(response.statusCode, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    response.pipe(res)
  })
  upstream.on('timeout', () => upstream.destroy())
  upstream.on('error', () => {
    if (!res.headersSent) res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
    res.end(JSON.stringify({ detail: { code: 'unavailable', message: 'Selfie шалгах backend ажиллахгүй байна. Серверээ асаагаад дахин оролдоорой.' } }))
  })
  res.on('close', () => upstream.destroy())
  let bytes = 0
  req.on('data', chunk => { bytes += chunk.length; if (bytes > 1600000) { upstream.destroy(); if (!res.headersSent) res.writeHead(413); res.end(); } })
  req.pipe(upstream)
  return true
}
