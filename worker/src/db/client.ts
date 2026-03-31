import type { Env } from '../env'

export type Db = Env['DB']

export function db(c: { env: Env }): Db {
  return c.env.DB
}

export async function dbExec(DB: Db, sql: string, bindings: unknown[] = []) {
  return DB.prepare(sql).bind(...bindings).run()
}

export async function dbFirst<T>(DB: Db, sql: string, bindings: unknown[] = []) {
  return DB.prepare(sql).bind(...bindings).first<T>()
}

export async function dbAll<T>(DB: Db, sql: string, bindings: unknown[] = []) {
  const res = await DB.prepare(sql).bind(...bindings).all<T>()
  return res.results
}

