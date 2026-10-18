const pad = (n) => String(n).padStart(2, '0')

/** Local calendar date as YYYY-MM-DD. */
export const toISODate = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`

export const todayISO = () => toISODate(new Date())

export const addDaysISO = (iso, days) => {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y, m - 1, d + days))
}

export const addYearsISO = (iso, years) => {
  const [y, m, d] = iso.split('-').map(Number)
  return toISODate(new Date(y + years, m - 1, d))
}

/**
 * Returns a normalised YYYY-MM-DD string, or null for missing / malformed / implausible dates
 * (TMDB uses "" and sometimes "0000-00-00" for unknown dates).
 */
export const validDate = (value) => {
  if (typeof value !== 'string') return null
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return null
  const [, y, m, d] = match.map(Number)
  if (y < 1870 || y > 2200 || m < 1 || m > 12 || d < 1 || d > 31) return null
  return `${match[1]}-${match[2]}-${match[3]}`
}

export const yearOf = (value) => {
  const date = validDate(value)
  return date ? Number(date.slice(0, 4)) : null
}

/** True only for a valid date that is today or earlier. */
export const isReleased = (value, today = todayISO()) => {
  const date = validDate(value)
  return !!date && date <= today
}

export const isUpcoming = (value, today = todayISO()) => {
  const date = validDate(value)
  return !!date && date > today
}

/** Comparator: newest release first, undated last, ties broken by popularity then id. */
export const compareReleaseDesc = (a, b) => {
  const da = validDate(a.releaseDate)
  const db = validDate(b.releaseDate)
  if (da && db && da !== db) return da < db ? 1 : -1
  if (da && !db) return -1
  if (!da && db) return 1
  const pop = (b.popularity || 0) - (a.popularity || 0)
  if (pop) return pop
  return (b.id || 0) - (a.id || 0)
}

export const compareReleaseAsc = (a, b) => {
  const da = validDate(a.releaseDate)
  const db = validDate(b.releaseDate)
  if (da && db && da !== db) return da < db ? -1 : 1
  if (da && !db) return -1
  if (!da && db) return 1
  return (a.id || 0) - (b.id || 0)
}
