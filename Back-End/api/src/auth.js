import { betterAuth } from 'better-auth'

// API болон auth ижил, зөвхөн тохируулсан origin-уудыг зөвшөөрнө.
export function trustedOrigins(env, origin) {
  return [...new Set([env.APP_ORIGIN || origin, ...(env.TRUSTED_ORIGINS || '').split(',')].map(value => value.trim()).filter(Boolean))]
}

export function createAuth(env, origin) {
  if (!env.AUTH_SECRET || env.AUTH_SECRET.length < 32) throw new Error('AUTH_SECRET is not configured.')
  return betterAuth({
    appName: 'Hamtry', baseURL: env.APP_ORIGIN || origin, basePath: '/api/auth', secret: env.AUTH_SECRET,
    database: env.DB,
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
    user: { additionalFields: { role: { type: 'string', defaultValue: 'user', input: false } } },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: 'database', window: 60, max: 60, customRules: { '/sign-in/email': { window: 60, max: 5 }, '/sign-up/email': { window: 60, max: 3 } } },
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] }, defaultCookieAttributes: { httpOnly: true, sameSite: 'lax', secure: (env.APP_ORIGIN || origin).startsWith('https:') } },
    trustedOrigins: trustedOrigins(env, origin),
  })
}
