import savedTheme from '../theme/hamtry-theme.json' with { type: 'json' }
import { exportTheme, parseOverrides, themeCss } from '../src/library/design-system/theme.js'

const theme = parseOverrides(savedTheme)
const maxBody = 1600000

export default {
  async fetch(request, env) {
    let path
    try {
      path = decodeURIComponent(new URL(request.url).pathname)
    } catch {
      return new Response('Invalid URL.', { status: 400 })
    }
    // Нэвтрэх хамгаалалтгүй editor болон дотоод actuator-ийг нийтэд гаргахгүй.
    if (/^\/editor(?:\.html)?(?:\/|$)/.test(path) || /^\/actuator(?:\/|$)/.test(path)) {
      return new Response('Not found.', { status: 404 })
    }
    if (path === '/api/theme' || path === '/hamtry-theme.css') {
      if (request.method === 'PUT' && path === '/api/theme') {
        return new Response('Edit the theme locally and deploy it through Git.', { status: 403 })
      }
      if (!['GET', 'HEAD'].includes(request.method)) {
        return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, HEAD' } })
      }
      const json = path === '/api/theme'
      return new Response(request.method === 'HEAD' ? null : json ? JSON.stringify(exportTheme(theme)) : themeCss(theme), {
        headers: { 'Content-Type': json ? 'application/json' : 'text/css', 'Cache-Control': 'no-store' },
      })
    }
    if (path.startsWith('/api/liveness/')) {
      if (!['GET', 'POST'].includes(request.method)) {
        return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, POST' } })
      }
      // ML inference нь VPS дээр хэвээр; client-ээс upstream хаяг авахгүй.
      const upstream = new URL(env.LIVENESS_ORIGIN)
      upstream.pathname = path
      upstream.search = new URL(request.url).search
      try {
        const chunks = []
        let size = 0
        if (request.body) {
          const reader = request.body.getReader()
          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            size += value.byteLength
            if (size > maxBody) {
              await reader.cancel()
              return new Response('Request is too large.', { status: 413 })
            }
            chunks.push(value)
          }
        }
        const response = await fetch(upstream, {
          method: request.method,
          headers: { 'Content-Type': request.headers.get('Content-Type') || 'application/json' },
          body: request.method === 'POST' ? new Blob(chunks) : undefined,
          redirect: 'manual',
          signal: AbortSignal.timeout(125000),
        })
        if (response.status >= 300 && response.status < 400) {
          await response.body?.cancel()
          return Response.json({ detail: 'Selfie backend returned an unexpected redirect.' }, { status: 502 })
        }
        return new Response(response.body, {
          status: response.status,
          headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
        })
      } catch {
        return Response.json({ detail: { code: 'unavailable', message: 'Selfie шалгах backend ажиллахгүй байна. Дахин оролдоорой.' } }, { status: 503 })
      }
    }
    if (path === '/healthz') {
      return Response.json({ status: 'ok', service: 'hamtry-web' })
    }
    if (path.startsWith('/api/')) return new Response('Not found.', { status: 404 })
    if (!['GET', 'HEAD'].includes(request.method)) {
      return new Response('Method not allowed.', { status: 405, headers: { Allow: 'GET, HEAD' } })
    }
    // HTML handling none тохиргоонд root-ийг index.html рүү тодорхой холбоно.
    return env.ASSETS.fetch(path === '/' ? new Request(new URL('/index.html', request.url), request) : request)
  },
}
