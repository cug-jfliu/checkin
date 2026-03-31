import { Hono } from 'hono'
import type { Env } from '../env'
import { jsonError } from '../utils/errors'
import { dbAll, dbFirst, dbExec } from '../db/client'
import { hashPassword, verifyPassword } from '../utils/password'
import { createToken } from '../utils/jwt'

export const authRoutes = new Hono<{ Bindings: Env }>()

type AuthPayload = {
  username: string
  name?: string | null
  password: string
}

type UserInfo = {
  id: number
  username: string
  name: string | null
  role: string
}

type AuthResponse = {
  token: string
  user: UserInfo
}

authRoutes.post('/register', async (c) => {
  const payload = (await c.req.json().catch(() => null)) as AuthPayload | null
  if (!payload?.username || !payload.password) return jsonError(c, 400, 'Invalid payload')

  const existing = await dbFirst<{ id: number }>(
    c.env.DB,
    'SELECT id FROM users WHERE username = ?1 LIMIT 1',
    [payload.username],
  )
  if (existing) return jsonError(c, 400, 'Username already exists')

  const countRow = await dbFirst<{ cnt: number }>(c.env.DB, 'SELECT COUNT(1) AS cnt FROM users', [])
  const role = (countRow?.cnt ?? 0) === 0 ? 'admin' : 'student'

  const passwordHash = hashPassword(payload.password)
  const createdAt = new Date().toISOString()

  const res = await dbExec(
    c.env.DB,
    `INSERT INTO users (username, name, password_hash, role, show_in_weekly, created_at)
     VALUES (?1, ?2, ?3, ?4, 1, ?5)`,
    [payload.username, payload.name ?? null, passwordHash, role, createdAt],
  )

  const id = Number(res.meta.last_row_id)
  const token = await createToken({
    userId: id,
    username: payload.username,
    role,
    secret: c.env.JWT_SECRET,
  })

  const body: AuthResponse = {
    token,
    user: { id, username: payload.username, name: payload.name ?? null, role },
  }
  return c.json(body, 201)
})

authRoutes.post('/login', async (c) => {
  const payload = (await c.req.json().catch(() => null)) as AuthPayload | null
  if (!payload?.username || !payload.password) return jsonError(c, 400, 'Invalid payload')

  const user = await dbFirst<{
    id: number
    username: string
    name: string | null
    password_hash: string
    role: string
  }>(c.env.DB, 'SELECT id, username, name, password_hash, role FROM users WHERE username = ?1 LIMIT 1', [
    payload.username,
  ])

  if (!user) return jsonError(c, 401, 'Invalid username or password')
  if (!verifyPassword(payload.password, user.password_hash))
    return jsonError(c, 401, 'Invalid username or password')

  const token = await createToken({
    userId: user.id,
    username: user.username,
    role: user.role,
    secret: c.env.JWT_SECRET,
  })

  const body: AuthResponse = {
    token,
    user: { id: user.id, username: user.username, name: user.name, role: user.role },
  }
  return c.json(body)
})

