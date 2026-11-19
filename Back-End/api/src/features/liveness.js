import { readJson, userId } from '../utils/common.js'
import { ERROR, problem } from '../utils/errors.js'

const HEALTH_TIMEOUT_MS = 10_000
const SESSION_TIMEOUT_MS = 30_000
const VERIFY_TIMEOUT_MS = 125_000
const SESSION_LIFETIME_MS = 180_000
const REQUIRED_FRAMES = 3
const MAX_FRAME_LENGTH = 600_000
const MAX_SESSION_ID_LENGTH = 200
const BASE64_FRAME = /^[A-Za-z0-9+/]+={0,2}$/

export function registerLiveness(api, requireUser) {
  api.get('/api/liveness/health', async (c) => {
    try {
      const response = await fetch(new URL('/api/liveness/health', c.env.LIVENESS_ORIGIN), {
        signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
        redirect: 'manual',
      })
      if (response.status >= 300 && response.status < 400) {
        await response.body?.cancel()
        return problem(c, 502, ERROR.LIVENESS_UNAVAILABLE)
      }
      if (!response.ok) {
        await response.body?.cancel()
        return problem(c, 503, ERROR.LIVENESS_UNAVAILABLE)
      }
      return new Response(response.body, {
        status: response.status,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      })
    } catch {
      return problem(c, 503, ERROR.LIVENESS_UNAVAILABLE)
    }
  })
  api.post('/api/liveness/sessions', requireUser, async (c) => {
    try {
      const response = await fetch(new URL('/api/liveness/sessions', c.env.LIVENESS_ORIGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
        signal: AbortSignal.timeout(SESSION_TIMEOUT_MS),
        redirect: 'error',
      })
      const data = await response.json()
      if (!response.ok || typeof data?.session_id !== 'string')
        return problem(c, 503, ERROR.LIVENESS_UNAVAILABLE)
      await c.env.DB.prepare(
        'INSERT INTO verification_checks (id,user_id,upstream_id,created_at) VALUES (?,?,?,?)',
      )
        .bind(crypto.randomUUID(), userId(c), data.session_id, Date.now())
        .run()
      return c.json(data)
    } catch {
      return problem(c, 503, ERROR.LIVENESS_UNAVAILABLE)
    }
  })
  api.post('/api/liveness/verify', requireUser, async (c) => {
    const body = await readJson(c)
    if (
      typeof body?.session_id !== 'string' ||
      body.session_id.length > MAX_SESSION_ID_LENGTH ||
      !Array.isArray(body.frames) ||
      body.frames.length !== REQUIRED_FRAMES ||
      body.frames.some(
        (frame) => typeof frame !== 'string' || frame.length > MAX_FRAME_LENGTH || !BASE64_FRAME.test(frame),
      )
    )
      return problem(c, 422, ERROR.INVALID_FRAMES)
    const claimed = await c.env.DB.prepare(
      `
        UPDATE verification_checks SET status='processing'
        WHERE upstream_id=? AND user_id=? AND status='pending' AND created_at>?
      `,
    )
      .bind(body.session_id, userId(c), Date.now() - SESSION_LIFETIME_MS)
      .run()
    if (!claimed.meta.changes) return problem(c, 409, ERROR.LIVENESS_EXPIRED)
    let data
    let passed = false
    try {
      const response = await fetch(new URL('/api/liveness/verify', c.env.LIVENESS_ORIGIN), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: body.session_id, frames: body.frames }),
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
        redirect: 'error',
      })
      data = await response.json()
      passed = response.ok && data?.status === 'passed'
    } catch {
      data = undefined
    }
    await c.env.DB.prepare(
      'UPDATE verification_checks SET status=?,completed_at=? WHERE upstream_id=? AND user_id=?',
    )
      .bind(passed ? 'passed' : 'failed', Date.now(), body.session_id, userId(c))
      .run()
    return passed
      ? c.json(data)
      : problem(c, data ? 422 : 503, data ? ERROR.LIVENESS_FAILED : ERROR.LIVENESS_UNAVAILABLE)
  })
}
