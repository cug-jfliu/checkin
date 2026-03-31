export function timezoneOffsetHours(envValue?: string) {
  const n = Number(envValue)
  if (!Number.isFinite(n)) return 8
  return n
}

export function localDayBoundsForDateUtc(params: {
  year: number
  month: number
  day: number
  offsetHours: number
}) {
  const { year, month, day, offsetHours } = params
  // local 00:00 with offsetHours -> UTC millis:
  const startUtcMs = Date.UTC(year, month - 1, day, 0, 0, 0) - offsetHours * 3600 * 1000
  const endUtcMs = startUtcMs + 24 * 3600 * 1000
  return { startUtc: new Date(startUtcMs), endUtc: new Date(endUtcMs) }
}

export function localDayBoundsTodayUtc(offsetHours: number) {
  const now = new Date()
  // 转为“本地（offsetHours）”日期
  const localMs = now.getTime() + offsetHours * 3600 * 1000
  const local = new Date(localMs)
  return localDayBoundsForDateUtc({
    year: local.getUTCFullYear(),
    month: local.getUTCMonth() + 1,
    day: local.getUTCDate(),
    offsetHours,
  })
}

export function parseLocalDateBoundsUtc(dateStr: string, offsetHours: number) {
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null
  return localDayBoundsForDateUtc({ year, month, day, offsetHours })
}

