import { Hono } from 'hono'
import type { Env } from '../env'

export const typstRoutes = new Hono<{ Bindings: Env }>()

const DEFAULT_COMPILER_WASM_UPSTREAM =
  'https://unpkg.com/@myriaddreamin/typst-ts-web-compiler@0.7.0-rc2/pkg/typst_ts_web_compiler_bg.wasm'
const DEFAULT_R2_KEY = 'typst/typst_ts_web_compiler_bg.wasm'

typstRoutes.get('/typst_ts_web_compiler_bg.wasm', async (c) => {
  const bucket = c.env.ASSETS_BUCKET
  const key = (c.env.TYPST_WASM_KEY?.trim() || DEFAULT_R2_KEY).replace(/^\/+/, '')
  if (bucket) {
    const obj = await bucket.get(key)
    if (obj) {
      const headers = new Headers()
      headers.set('Content-Type', 'application/wasm')
      headers.set('Cache-Control', 'public, max-age=2592000, immutable')
      if (obj.httpEtag) headers.set('ETag', obj.httpEtag)
      if (obj.uploaded) headers.set('Last-Modified', obj.uploaded.toUTCString())
      return new Response(obj.body, { status: 200, headers })
    }
    return c.json({ error: `R2 object not found: ${key}` }, 404)
  }

  const upstream = c.env.TYPST_WASM_UPSTREAM_URL?.trim() || DEFAULT_COMPILER_WASM_UPSTREAM

  const res = await fetch(upstream, {
    cf: { cacheTtl: 60 * 60 * 24 * 30, cacheEverything: true } as any,
  })

  if (!res.ok) {
    return c.json({ error: `Upstream wasm fetch failed: ${res.status}` }, 502)
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/wasm',
      'Cache-Control': 'public, max-age=2592000, immutable',
    },
  })
})

