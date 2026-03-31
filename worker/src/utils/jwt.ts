import { SignJWT, jwtVerify } from 'jose'

export type JwtClaims = {
  sub: number
  username: string
  role: string
  exp: number
}

function secretKey(secret?: string) {
  const s = secret?.trim()
  return new TextEncoder().encode(s && s.length > 0 ? s : 'secret')
}

export async function createToken(params: {
  userId: number
  username: string
  role: string
  secret?: string
}) {
  const nowSec = Math.floor(Date.now() / 1000)
  const exp = nowSec + 60 * 60 * 24 * 7

  return new SignJWT({ username: params.username, role: params.role })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(String(params.userId))
    .setExpirationTime(exp)
    .sign(secretKey(params.secret))
}

export async function verifyToken(token: string, secret?: string): Promise<JwtClaims> {
  const { payload } = await jwtVerify(token, secretKey(secret))
  const subStr = payload.sub
  const username = payload.username
  const role = payload.role
  const exp = payload.exp

  if (!subStr || typeof subStr !== 'string') throw new Error('Token error: missing sub')
  if (typeof username !== 'string') throw new Error('Token error: missing username')
  if (typeof role !== 'string') throw new Error('Token error: missing role')
  if (typeof exp !== 'number') throw new Error('Token error: missing exp')

  const sub = Number(subStr)
  if (!Number.isFinite(sub)) throw new Error('Token error: invalid sub')

  return { sub, username, role, exp }
}

