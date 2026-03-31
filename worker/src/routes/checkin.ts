import { Hono } from 'hono'
import type { Env } from '../env'
import { requireAuth, type AuthVariables } from '../middleware/auth'
import { jsonError } from '../utils/errors'
import { dbAll, dbExec, dbFirst } from '../db/client'
import { localDayBoundsTodayUtc, timezoneOffsetHours } from '../utils/timezone'

export const checkinRoutes = new Hono<{ Bindings: Env; Variables: AuthVariables }>()

checkinRoutes.use('*', requireAuth)

type CheckinPayload = {
  latitude?: number | null
  longitude?: number | null
}

type CheckinResponse = {
  id: number
  checkin_time: string
  latitude: number | null
  longitude: number | null
}

checkinRoutes.post('/', async (c) => {
  const payload = (await c.req.json().catch(() => null)) as CheckinPayload | null
  if (!payload) return jsonError(c, 400, 'Invalid payload')

  const user = c.get('user')
  const offset = timezoneOffsetHours(c.env.TIMEZONE_OFFSET_HOURS)
  const { startUtc, endUtc } = localDayBoundsTodayUtc(offset)
  const start = startUtc.toISOString()
  const end = endUtc.toISOString()

  const existing = await dbFirst<{ id: number }>(
    c.env.DB,
    `SELECT id FROM checkins
     WHERE user_id = ?1 AND checkin_time >= ?2 AND checkin_time < ?3
     LIMIT 1`,
    [user.id, start, end],
  )
  if (existing) return jsonError(c, 400, 'Already checked in today')

  const now = new Date().toISOString()
  const res = await dbExec(
    c.env.DB,
    `INSERT INTO checkins (user_id, checkin_time, latitude, longitude)
     VALUES (?1, ?2, ?3, ?4)`,
    [user.id, now, payload.latitude ?? null, payload.longitude ?? null],
  )

  const id = Number(res.meta.last_row_id)
  const body: CheckinResponse = {
    id,
    checkin_time: now,
    latitude: payload.latitude ?? null,
    longitude: payload.longitude ?? null,
  }
  return c.json(body, 201)
})

checkinRoutes.get('/today', async (c) => {
  const user = c.get('user')
  const offset = timezoneOffsetHours(c.env.TIMEZONE_OFFSET_HOURS)
  const { startUtc, endUtc } = localDayBoundsTodayUtc(offset)

  const row = await dbFirst<{
    id: number
    checkin_time: string
    latitude: number | null
    longitude: number | null
  }>(
    c.env.DB,
    `SELECT id, checkin_time, latitude, longitude FROM checkins
     WHERE user_id = ?1 AND checkin_time >= ?2 AND checkin_time < ?3
     ORDER BY checkin_time DESC
     LIMIT 1`,
    [user.id, startUtc.toISOString(), endUtc.toISOString()],
  )

  if (!row) return c.json(null)
  const body: CheckinResponse = {
    id: row.id,
    checkin_time: row.checkin_time,
    latitude: row.latitude,
    longitude: row.longitude,
  }
  return c.json(body)
})

checkinRoutes.get('/history', async (c) => {
  const user = c.get('user')
  const rows = await dbAll<{
    id: number
    checkin_time: string
    latitude: number | null
    longitude: number | null
  }>(
    c.env.DB,
    `SELECT id, checkin_time, latitude, longitude
     FROM checkins
     WHERE user_id = ?1
     ORDER BY checkin_time DESC`,
    [user.id],
  )

  const body: CheckinResponse[] = rows.map((r) => ({
    id: r.id,
    checkin_time: r.checkin_time,
    latitude: r.latitude,
    longitude: r.longitude,
  }))
  return c.json(body)
})

