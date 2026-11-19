import { ApiError, ERROR, problem } from './errors.js'

export function sendData(c, data, status = 200) {
  return c.json({ data }, status)
}

export function noContent(c) {
  return c.body(null, 204)
}

export function notFound(c) {
  return problem(c, 404, ERROR.NOT_FOUND)
}

// Use only on routes protected by requireUser.
export function userId(c) {
  return c.get('user').id
}

export async function readJson(c) {
  try {
    return await c.req.json()
  } catch {
    throw new ApiError(400, ERROR.INVALID_JSON)
  }
}

export function logRequestError(c, error) {
  console.error(JSON.stringify({ requestId: c.get('requestId'), message: error?.message || String(error) }))
}
