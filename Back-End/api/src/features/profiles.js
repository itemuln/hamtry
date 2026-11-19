import { sendData } from '../utils/common.js'
import { profileSchema, jsonBody } from '../utils/validation.js'

export function registerProfiles(v1, requireUser) {
  v1.get('/me', requireUser, async (c) => {
    const user = c.get('user'),
      profile = await c.env.DB.prepare('SELECT bio,occupation FROM profiles WHERE user_id=?')
        .bind(user.id)
        .first()
    return c.json({
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        bio: profile?.bio || '',
        occupation: profile?.occupation || '',
      },
    })
  })
  v1.patch('/me', requireUser, async (c) => {
    const body = await jsonBody(c, profileSchema)
    const user = c.get('user'),
      now = Date.now()
    await c.env.DB.batch([
      c.env.DB.prepare('UPDATE user SET name=?,updatedAt=? WHERE id=?').bind(
        body.name,
        new Date(now).toISOString(),
        user.id,
      ),
      c.env.DB.prepare(
        `
          INSERT INTO profiles (user_id,bio,occupation,updated_at)
          VALUES (?,?,?,?)
          ON CONFLICT(user_id)
          DO UPDATE SET bio=excluded.bio,occupation=excluded.occupation,updated_at=excluded.updated_at
        `,
      ).bind(user.id, body.bio, body.occupation, now),
    ])
    return sendData(c, body)
  })
}
