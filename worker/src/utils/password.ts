import { scrypt } from '@noble/hashes/scrypt'
import { randomBytes } from '@noble/hashes/utils'

const SCRYPT_N = 1 << 16
const SCRYPT_r = 8
const SCRYPT_p = 1
const DKLEN = 32

function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a[i]! ^ b[i]!
  return diff === 0
}

function b64u(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '')
}

function unb64u(s: string) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

export type PasswordHash = string

// 格式：scrypt$N$r$p$salt_b64u$dk_b64u
export function hashPassword(password: string): PasswordHash {
  const salt = randomBytes(16)
  const dk = scrypt(password, salt, { N: SCRYPT_N, r: SCRYPT_r, p: SCRYPT_p, dkLen: DKLEN })
  return `scrypt$${SCRYPT_N}$${SCRYPT_r}$${SCRYPT_p}$${b64u(salt)}$${b64u(dk)}`
}

export function verifyPassword(password: string, stored: PasswordHash): boolean {
  const parts = stored.split('$')
  if (parts.length !== 6) return false
  const [alg, nStr, rStr, pStr, saltStr, dkStr] = parts
  if (alg !== 'scrypt') return false

  const N = Number(nStr)
  const r = Number(rStr)
  const p = Number(pStr)
  if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p)) return false

  const salt = unb64u(saltStr!)
  const dkExpected = unb64u(dkStr!)
  const dk = scrypt(password, salt, { N, r, p, dkLen: dkExpected.length })
  return timingSafeEqual(dk, dkExpected)
}

