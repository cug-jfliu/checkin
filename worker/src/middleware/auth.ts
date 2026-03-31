import { createMiddleware } from 'hono/factory'
import type { Env } from '../env'
import { jsonError } from '../utils/errors'
import { verifyToken } from '../utils/jwt'

export type AuthUser = {
  id: number
  username: string
  role: string
}

export type AuthVariables = {
  user: AuthUser
}

export const requireAuth = createMiddleware<{ Bindings: Env; Variables: AuthVariables }>(async (c, next) => {
  const header = c.req.header('Authorization') ?? ''
  const m = header.match(/^Bearer\s+(.+)$/i)
  if (!m) return jsonError(c, 401, 'Missing bearer token')

  try {
    const claims = await verifyToken(m[1]!, c.env.JWT_SECRET)
    c.set('user', { id: claims.sub, username: claims.username, role: claims.role })
    await next()
  } catch (e) {
    return jsonError(c, 401, String(e instanceof Error ? e.message : e))
  }
})

