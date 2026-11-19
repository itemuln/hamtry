import { randomBytes } from 'node:crypto'
import { demoGroups, DEMO_PASSWORD } from './demo-accounts.js'
import { seedDemoRoom } from './demo-rooms.js'

const origin = 'http://127.0.0.1:8787'
const health = await fetch(`${origin}/api/v1/health`)
if (!health.ok || !(await health.json()).auth) {
  throw new Error('Start the local Hamtry API with npm run api:dev before seeding.')
}

for (const { role, accounts } of demoGroups) {
  for (const [index, { name, email }] of accounts.entries()) {
    const address = '198.18.' + Array.from(randomBytes(2)).join('.')
    const call = (path, body, cookie) => fetch(origin + path, {
      method: body === undefined ? 'GET' : 'POST',
      redirect: 'error',
      headers: {
        Origin: origin,
        ...(body instanceof FormData || body === undefined ? {} : { 'Content-Type': 'application/json' }),
        'CF-Connecting-IP': address,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: body instanceof FormData ? body : JSON.stringify(body),
    })
    const credentials = { email, password: DEMO_PASSWORD }
    const login = await call('/api/auth/sign-in/email', credentials)
    const session = login.ok ? login : await call('/api/auth/sign-up/email', { name, ...credentials })
    if (!session.ok) throw new Error(`Could not prepare ${email} (HTTP ${session.status}).`)
    const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    if (!cookie) throw new Error(`No local session for ${email}.`)
    try {
      if (role === 'provider') {
        await seedDemoRoom(async (path, body) => {
          const response = await call(path, body, cookie)
          const result = await response.json()
          if (!response.ok) throw new Error(`${path}: ${result.error?.message || response.status}`)
          return result
        }, index)
      }
    } finally {
      const logout = await call('/api/auth/sign-out', {}, cookie).catch(() => null)
      if (!logout?.ok) console.warn(`Could not close the seed session for ${email}.`)
    }
  }
}
console.log('Ready: 5 local seekers and 5 local providers and 5 published demo rooms.')
