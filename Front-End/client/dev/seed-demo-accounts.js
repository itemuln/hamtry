import { randomBytes } from 'node:crypto'
import { demoGroups, DEMO_PASSWORD } from './demo-accounts.js'

const origin = 'http://127.0.0.1:8787'
const health = await fetch(`${origin}/api/v1/health`)
if (!health.ok || !(await health.json()).auth) {
  throw new Error('Start the local Hamtry API with npm run api:dev before seeding.')
}

for (const { accounts } of demoGroups) {
  for (const { name, email } of accounts) {
    const address = '198.18.' + Array.from(randomBytes(2)).join('.')
    const call = (action, body, cookie) => fetch(`${origin}/api/auth/${action}`, {
      method: 'POST',
      headers: {
        Origin: origin,
        'Content-Type': 'application/json',
        'CF-Connecting-IP': address,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: JSON.stringify(body),
    })
    const credentials = { email, password: DEMO_PASSWORD }
    const login = await call('sign-in/email', credentials)
    const session = login.ok ? login : await call('sign-up/email', { name, ...credentials })
    if (!session.ok) throw new Error(`Could not prepare ${email} (HTTP ${session.status}).`)
    const cookie = session.headers.getSetCookie().map(value => value.split(';')[0]).join('; ')
    if (cookie) {
      const logout = await call('sign-out', {}, cookie)
      if (!logout.ok) throw new Error(`Could not close the seed session for ${email}.`)
    }
  }
}
console.log('Ready: 5 local seekers and 5 local providers.')
