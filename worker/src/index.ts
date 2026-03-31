import { cors } from 'hono/cors'
import { swaggerUI } from '@hono/swagger-ui'
import { OpenAPIHono } from '@hono/zod-openapi'

import type { Env } from './env'
import { authRoutes } from './routes/auth'
import { checkinRoutes } from './routes/checkin'
import { adminRoutes } from './routes/admin'
import { jsonError } from './utils/errors'
import { openapiSpec } from './openapi'

const app = new OpenAPIHono<{ Bindings: Env }>()

app.use(
  '*',
  cors({
    origin: '*',
    allowHeaders: ['Authorization', 'Content-Type'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    maxAge: 86400,
  }),
)

app.get('/health', (c) => c.text('OK'))

app.route('/api/auth', authRoutes)
app.route('/api/auth/', authRoutes)
app.route('/api/checkin', checkinRoutes)
app.route('/api/checkin/', checkinRoutes)
app.route('/api/admin', adminRoutes)
app.route('/api/admin/', adminRoutes)

app.get('/openapi.json', (c) => c.json(openapiSpec))

app.get('/docs', swaggerUI({ url: '/openapi.json' }))

// 前端静态资源（方案B）：非 /api 路径走 ASSETS
app.notFound(async (c) => {
  const url = new URL(c.req.url)
  if (url.pathname.startsWith('/api/')) return jsonError(c, 404, 'Not found')

  // 先尝试直接命中静态资源（/assets/*、favicon 等）
  const direct = await c.env.ASSETS.fetch(c.req.raw)
  if (direct.status !== 404) return direct

  // SPA 回退：其它路径返回 index.html
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', url).toString(), c.req.raw))
})

export default app

