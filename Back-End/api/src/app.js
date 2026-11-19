import { chatController } from './features/chat/controller.js'
import {
  d1ListingsRepository,
  listingRoutes,
  listingsService,
  registerListingWrites,
} from './features/listings/index.js'
import { logRequestError, notFound } from './utils/common.js'
import { MAX_JSON_BYTES, MAX_UPLOAD_BYTES, MAX_VERIFICATION_BYTES } from './utils/constants.js'
import { openapi } from './transports/openapi.js'
import { registerGraphql } from './transports/graphql.js'
import { registerModeration } from './features/moderation.js'
import { registerSaved } from './features/saved.js'
import { registerProfiles } from './features/profiles.js'
import { ERROR, ApiError, problem } from './utils/errors.js'
import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { requestId } from 'hono/request-id'
import { createAuth, trustedOrigins } from './auth.js'
import { registerMedia } from './features/media.js'
import { registerLiveness } from './features/liveness.js'

export const authFor = (c) =>
  c.get('auth') ||
  (() => {
    const auth = createAuth(c.env, new URL(c.req.url).origin)
    c.set('auth', auth)
    return auth
  })()
export const requireUser = async (c, next) => {
  const session = await authFor(c).api.getSession({ headers: c.req.raw.headers })
  if (!session) return problem(c, 401, ERROR.UNAUTHORIZED)
  c.set('user', session.user)
  return next()
}

export function createApi({ catalog = d1ListingsRepository } = {}) {
  const api = new Hono()
  api.use('*', requestId())
  api.use('*', async (c, next) => {
    const start = performance.now()
    await next()
    const duration = performance.now() - start
    c.header('Server-Timing', `api;dur=${duration.toFixed(2)}`)
  })
  api.get('/api/openapi.json', (c) => c.json(openapi))
  api.get('/api/docs', (c) =>
    c.html(`<!doctype html>
<html lang="en"><meta charset="utf-8"><title>Hamtry API</title>
<h1>Hamtry API</h1><p><a href="/api/openapi.json">Download the OpenAPI specification</a></p>
<table><thead><tr><th>Method</th><th>Path</th><th>Description</th></tr></thead><tbody>
${Object.entries(openapi.paths)
  .flatMap(([path, operations]) =>
    Object.entries(operations).map(
      ([method, operation]) =>
        `<tr><td>${method.toUpperCase()}</td><td><code>${path}</code></td><td>${operation.summary}</td></tr>`,
    ),
  )
  .join('')}
</tbody></table></html>`),
  )
  api.use('*', async (c, next) => {
    c.header('Cache-Control', 'no-store')
    c.header('X-Content-Type-Options', 'nosniff')
    if (!c.env.DB && c.req.path !== '/api/liveness/health') return problem(c, 503, ERROR.DATABASE_UNAVAILABLE)
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const allowed = trustedOrigins(c.env, new URL(c.req.url).origin)
      if (!allowed.includes(c.req.header('Origin'))) return problem(c, 403, ERROR.INVALID_ORIGIN)
    }
    await next()
  })
  api.use('*', (c, next) =>
    bodyLimit({
      maxSize: /^\/api\/v1\/listings\/[^/]+\/photos$/.test(c.req.path)
        ? MAX_UPLOAD_BYTES
        : c.req.path === '/api/liveness/verify'
          ? MAX_VERIFICATION_BYTES
          : MAX_JSON_BYTES,
      onError: (c) => problem(c, 413, ERROR.BODY_TOO_LARGE),
    })(c, next),
  )
  api.get('/api/v1/health', async (c) => {
    await c.env.DB.prepare('SELECT 1').first()
    return c.json({
      status: 'ready',
      service: 'hamtry-api',
      auth: Boolean(c.env.AUTH_SECRET?.length >= 32),
      media: Boolean(c.env.PHOTOS),
    })
  })
  api.all('/api/auth/*', async (c) => {
    const response = await authFor(c).handler(c.req.raw)
    if (response.ok || response.status < 400) return response
    const code =
      response.status === 429
        ? ERROR.AUTH_RATE_LIMIT
        : response.status >= 500
          ? ERROR.INTERNAL_ERROR
          : ERROR.AUTH_FAILED
    const retryAfter = response.headers.get('Retry-After')
    if (retryAfter) c.header('Retry-After', retryAfter)
    await response.body?.cancel()
    return problem(c, response.status, code)
  })
  api.use('*', (c, next) => {
    if (c.env.DB) c.set('catalog', listingsService(catalog(c.env.DB)))
    return next()
  })
  registerGraphql(api)
  const v1 = new Hono()
  v1.route('/chats', chatController(requireUser))
  v1.route('/listings', listingRoutes)
  registerListingWrites(v1, requireUser)
  registerMedia(v1, requireUser, authFor)
  registerProfiles(v1, requireUser)
  registerSaved(v1, requireUser)
  registerModeration(v1, requireUser)
  registerLiveness(api, requireUser)
  api.route('/api/v1', v1)
  api.notFound(notFound)
  api.onError((error, c) => {
    if (error instanceof ApiError) return problem(c, error.status, error.code, error.details)
    logRequestError(c, error)
    return problem(c, 500, ERROR.INTERNAL_ERROR, { requestId: c.get('requestId') })
  })
  return api
}

export const api = createApi()
