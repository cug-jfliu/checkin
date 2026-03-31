import { Hono } from 'hono'
import type { Context } from 'hono'
import type { Env } from '../env'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { jsonError } from '../utils/errors'
import { dbAll, dbExec, dbFirst } from '../db/client'
import { parseLocalDateBoundsUtc, timezoneOffsetHours } from '../utils/timezone'
import { hashPassword } from '../utils/password'

export const adminRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

adminRoutes.use('*', requireAuth)

function requireAdmin(c: Context<{ Bindings: Env; Variables: AuthVariables }>) {
  const user = c.get('user')
  if (user.role !== 'admin') return jsonError(c, 401, 'Admin access required')
  return null
}

type AdminUserRecord = {
  id: number
  username: string
  name: string | null
  role: string
  show_in_weekly: boolean
  created_at: string
}

type AdminCheckinRecord = {
  id: number
  username: string
  name: string | null
  checkin_time: string
  latitude: number | null
  longitude: number | null
}

adminRoutes.get('/users', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const rows = await dbAll<{
    id: number
    username: string
    name: string | null
    role: string
    show_in_weekly: number
    created_at: string
  }>(c.env.DB, `SELECT id, username, name, role, show_in_weekly, created_at FROM users ORDER BY username ASC`)

  const body: AdminUserRecord[] = rows.map((u) => ({
    id: u.id,
    username: u.username,
    name: u.name,
    role: u.role,
    show_in_weekly: Boolean(u.show_in_weekly),
    created_at: u.created_at,
  }))
  return c.json(body)
})

adminRoutes.post('/users', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const payload = (await c.req.json().catch(() => null)) as
    | { username: string; name?: string | null; password?: string | null; role: string }
    | null
  if (!payload?.username || !payload.role) return jsonError(c, 400, 'Invalid payload')

  const existing = await dbFirst<{ id: number }>(
    c.env.DB,
    'SELECT id FROM users WHERE username = ?1 LIMIT 1',
    [payload.username],
  )
  if (existing) return jsonError(c, 400, 'Username already exists')

  const password = payload.password && payload.password.length > 0 ? payload.password : '123456'
  const passwordHash = hashPassword(password)
  const createdAt = new Date().toISOString()

  const res = await dbExec(
    c.env.DB,
    `INSERT INTO users (username, name, password_hash, role, show_in_weekly, created_at)
     VALUES (?1, ?2, ?3, ?4, 1, ?5)`,
    [payload.username, payload.name ?? null, passwordHash, payload.role, createdAt],
  )
  const id = Number(res.meta.last_row_id)

  const row = await dbFirst<{
    id: number
    username: string
    name: string | null
    role: string
    show_in_weekly: number
    created_at: string
  }>(c.env.DB, 'SELECT id, username, name, role, show_in_weekly, created_at FROM users WHERE id = ?1', [id])

  if (!row) return jsonError(c, 500, 'Internal server error')
  return c.json({
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    show_in_weekly: Boolean(row.show_in_weekly),
    created_at: row.created_at,
  } satisfies AdminUserRecord)
})

adminRoutes.put('/users/:id', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'Invalid id')

  const payload = (await c.req.json().catch(() => null)) as
    | { username: string; name?: string | null; password?: string | null; role: string; show_in_weekly: boolean }
    | null
  if (!payload?.username || !payload.role || typeof payload.show_in_weekly !== 'boolean')
    return jsonError(c, 400, 'Invalid payload')

  const userRow = await dbFirst<{ id: number; username: string }>(
    c.env.DB,
    'SELECT id, username FROM users WHERE id = ?1',
    [id],
  )
  if (!userRow) return jsonError(c, 404, 'User not found')

  if (userRow.username !== payload.username) {
    const conflict = await dbFirst<{ id: number }>(
      c.env.DB,
      'SELECT id FROM users WHERE username = ?1 LIMIT 1',
      [payload.username],
    )
    if (conflict) return jsonError(c, 400, 'Username already exists')
  }

  await dbExec(
    c.env.DB,
    `UPDATE users
     SET username = ?2, name = ?3, role = ?4, show_in_weekly = ?5
     WHERE id = ?1`,
    [id, payload.username, payload.name ?? null, payload.role, payload.show_in_weekly ? 1 : 0],
  )

  if (payload.password && payload.password.length > 0) {
    const passwordHash = hashPassword(payload.password)
    await dbExec(c.env.DB, 'UPDATE users SET password_hash = ?2 WHERE id = ?1', [id, passwordHash])
  }

  const row = await dbFirst<{
    id: number
    username: string
    name: string | null
    role: string
    show_in_weekly: number
    created_at: string
  }>(c.env.DB, 'SELECT id, username, name, role, show_in_weekly, created_at FROM users WHERE id = ?1', [id])

  if (!row) return jsonError(c, 500, 'Internal server error')
  return c.json({
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    show_in_weekly: Boolean(row.show_in_weekly),
    created_at: row.created_at,
  } satisfies AdminUserRecord)
})

adminRoutes.delete('/users/:id', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'Invalid id')

  const res = await dbExec(c.env.DB, 'DELETE FROM users WHERE id = ?1', [id])
  if ((res.meta.changes ?? 0) === 0) return jsonError(c, 404, 'User not found')
  return c.json({ message: 'User deleted' })
})

adminRoutes.get('/records', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const date = c.req.query('date')
  const offset = timezoneOffsetHours(c.env.TIMEZONE_OFFSET_HOURS)

  let where = ''
  const bindings: unknown[] = []
  if (date) {
    const bounds = parseLocalDateBoundsUtc(date, offset)
    if (!bounds) return jsonError(c, 400, 'Invalid date format')
    where = 'WHERE ck.checkin_time >= ?1 AND ck.checkin_time < ?2'
    bindings.push(bounds.startUtc.toISOString(), bounds.endUtc.toISOString())
  }

  const rows = await dbAll<AdminCheckinRecord>(
    c.env.DB,
    `SELECT ck.id AS id,
            u.username AS username,
            u.name AS name,
            ck.checkin_time AS checkin_time,
            ck.latitude AS latitude,
            ck.longitude AS longitude
     FROM checkins ck
     JOIN users u ON u.id = ck.user_id
     ${where}
     ORDER BY ck.checkin_time DESC`,
    bindings,
  )
  return c.json(rows)
})

adminRoutes.post('/checkins', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const payload = (await c.req.json().catch(() => null)) as
    | { user_id: number; checkin_time: string; latitude?: number | null; longitude?: number | null }
    | null
  if (!payload || !Number.isFinite(payload.user_id) || !payload.checkin_time)
    return jsonError(c, 400, 'Invalid payload')

  const checkinTime = new Date(payload.checkin_time)
  if (Number.isNaN(checkinTime.getTime())) return jsonError(c, 400, 'Invalid checkin_time format, use RFC3339')

  const userRow = await dbFirst<{ id: number; username: string; name: string | null }>(
    c.env.DB,
    'SELECT id, username, name FROM users WHERE id = ?1',
    [payload.user_id],
  )
  if (!userRow) return jsonError(c, 404, 'User not found')

  const res = await dbExec(
    c.env.DB,
    `INSERT INTO checkins (user_id, checkin_time, latitude, longitude)
     VALUES (?1, ?2, ?3, ?4)`,
    [payload.user_id, checkinTime.toISOString(), payload.latitude ?? null, payload.longitude ?? null],
  )
  const id = Number(res.meta.last_row_id)

  const body: AdminCheckinRecord = {
    id,
    username: userRow.username,
    name: userRow.name,
    checkin_time: checkinTime.toISOString(),
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
  }
  return c.json(body)
})

adminRoutes.put('/checkins/:id', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'Invalid id')

  const payload = (await c.req.json().catch(() => null)) as
    | { checkin_time: string; latitude?: number | null; longitude?: number | null }
    | null
  if (!payload?.checkin_time) return jsonError(c, 400, 'Invalid payload')

  const checkinTime = new Date(payload.checkin_time)
  if (Number.isNaN(checkinTime.getTime())) return jsonError(c, 400, 'Invalid checkin_time format, use RFC3339')

  const row = await dbFirst<{ user_id: number }>(c.env.DB, 'SELECT user_id FROM checkins WHERE id = ?1', [id])
  if (!row) return jsonError(c, 404, 'Checkin not found')

  await dbExec(
    c.env.DB,
    `UPDATE checkins SET checkin_time = ?2, latitude = ?3, longitude = ?4 WHERE id = ?1`,
    [id, checkinTime.toISOString(), payload.latitude ?? null, payload.longitude ?? null],
  )

  const rec = await dbFirst<AdminCheckinRecord>(
    c.env.DB,
    `SELECT ck.id AS id,
            u.username AS username,
            u.name AS name,
            ck.checkin_time AS checkin_time,
            ck.latitude AS latitude,
            ck.longitude AS longitude
     FROM checkins ck
     JOIN users u ON u.id = ck.user_id
     WHERE ck.id = ?1
     LIMIT 1`,
    [id],
  )
  if (!rec) return jsonError(c, 404, 'Checkin not found')
  return c.json(rec)
})

adminRoutes.delete('/checkins/:id', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const id = Number(c.req.param('id'))
  if (!Number.isFinite(id)) return jsonError(c, 400, 'Invalid id')

  const res = await dbExec(c.env.DB, 'DELETE FROM checkins WHERE id = ?1', [id])
  if ((res.meta.changes ?? 0) === 0) return jsonError(c, 404, 'Checkin not found')
  return c.json({ message: 'Checkin deleted' })
})

adminRoutes.get('/weekly-export', async (c) => {
  const deny = requireAdmin(c)
  if (deny) return deny

  const startDate = c.req.query('start_date')
  if (!startDate) return jsonError(c, 400, 'Invalid start_date format')

  const offset = timezoneOffsetHours(c.env.TIMEZONE_OFFSET_HOURS)
  const bounds = parseLocalDateBoundsUtc(startDate, offset)
  if (!bounds) return jsonError(c, 400, 'Invalid start_date format')

  const start = bounds.startUtc.toISOString()
  const end = new Date(bounds.startUtc.getTime() + 7 * 24 * 3600 * 1000).toISOString()

  const students = await dbAll<{ id: number; username: string; name: string | null }>(
    c.env.DB,
    `SELECT id, username, name
     FROM users
     WHERE role = 'student' AND show_in_weekly = 1
     ORDER BY username ASC`,
  )

  const checkins = await dbAll<{ user_id: number; checkin_time: string }>(
    c.env.DB,
    `SELECT user_id, checkin_time
     FROM checkins
     WHERE checkin_time >= ?1 AND checkin_time < ?2`,
    [start, end],
  )

  const byUser = new Map<number, string[]>()
  for (const cki of checkins) {
    const arr = byUser.get(cki.user_id) ?? []
    arr.push(cki.checkin_time)
    byUser.set(cki.user_id, arr)
  }

  const body = students.map((s) => ({
    id: s.id,
    username: s.username,
    name: s.name,
    checkins: byUser.get(s.id) ?? [],
  }))
  return c.json(body)
})

