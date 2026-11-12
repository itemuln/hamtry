export function registerLiveness(api, requireUser) {
  api.get('/api/liveness/health', async c => {
    try {
      const response = await fetch(new URL('/api/liveness/health', c.env.LIVENESS_ORIGIN), { signal: AbortSignal.timeout(10000), redirect: 'manual' })
      if (response.status >= 300 && response.status < 400) { await response.body?.cancel(); return c.json({ detail: { message: 'Selfie сервер буруу чиглүүлэлт буцаалаа.' } }, 502) }
      return new Response(response.body, { status: response.status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } })
    } catch { return c.json({ detail: { code: 'unavailable', message: 'Selfie үйлчилгээ холбогдсонгүй.' } }, 503) }
  })
  api.post('/api/liveness/sessions', requireUser, async c => {
    try {
      const response = await fetch(new URL('/api/liveness/sessions', c.env.LIVENESS_ORIGIN), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(30000), redirect: 'error' })
      const data = await response.json()
      if (!response.ok || typeof data.session_id !== 'string') return c.json({ detail: { code: 'unavailable', message: 'Selfie шалгалт эхлүүлж чадсангүй.' } }, 503)
      await c.env.DB.prepare('INSERT INTO verification_checks (id,user_id,upstream_id,created_at) VALUES (?,?,?,?)').bind(crypto.randomUUID(), c.get('user').id, data.session_id, Date.now()).run()
      return c.json(data)
    } catch { return c.json({ detail: { code: 'unavailable', message: 'Selfie үйлчилгээ холбогдсонгүй.' } }, 503) }
  })
  api.post('/api/liveness/verify', requireUser, async c => {
    let body
    try { body = await c.req.json() } catch { return c.json({ detail: { message: 'Шалгах мэдээлэл буруу байна.' } }, 400) }
    if (typeof body.session_id !== 'string' || body.session_id.length > 200 || !Array.isArray(body.frames) || body.frames.length !== 3 || body.frames.some(frame => typeof frame !== 'string' || frame.length > 600000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(frame))) return c.json({ detail: { message: 'Гурван selfie зураг илгээнэ үү.' } }, 422)
    const claimed = await c.env.DB.prepare("UPDATE verification_checks SET status='processing' WHERE upstream_id=? AND user_id=? AND status='pending' AND created_at>?").bind(body.session_id, c.get('user').id, Date.now() - 180000).run()
    if (!claimed.meta.changes) return c.json({ detail: { message: 'Шалгалт дууссан эсвэл хугацаа нь дууссан байна. Дахин эхлүүлээрэй.' } }, 409)
    let data, passed = false
    try {
      const response = await fetch(new URL('/api/liveness/verify', c.env.LIVENESS_ORIGIN), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: body.session_id, frames: body.frames }), signal: AbortSignal.timeout(125000), redirect: 'error' })
      data = await response.json(); passed = response.ok && data.status === 'passed'
    } catch { data = { detail: { code: 'unavailable', message: 'Selfie сервертэй холбогдсонгүй. Дахин эхлүүлээрэй.' } } }
    await c.env.DB.prepare('UPDATE verification_checks SET status=?,completed_at=? WHERE upstream_id=? AND user_id=?').bind(passed ? 'passed' : 'failed', Date.now(), body.session_id, c.get('user').id).run()
    return c.json(data, passed ? 200 : 422)
  })
}
