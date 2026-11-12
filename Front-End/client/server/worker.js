import { api } from '../../../Back-End/api/src/app.js'
import savedTheme from '../theme/hamtry-theme.json' with { type: 'json' }
import { exportTheme, parseOverrides, themeCss } from '../src/library/design-system/theme.js'

const theme = parseOverrides(savedTheme)

export default {
  async fetch(request, env, ctx) {
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
    if (path.startsWith('/api/v1/') || path.startsWith('/api/auth/') || path.startsWith('/api/liveness/')) return api.fetch(request, env, ctx)
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
