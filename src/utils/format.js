const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
})

/** Format a YYYY-MM-DD string without timezone drift. Returns '' for invalid input. */
export const formatDate = (iso) => {
  if (typeof iso !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return ''
  const date = new Date(`${iso.slice(0, 10)}T00:00:00Z`)
  return Number.isNaN(date.getTime()) ? '' : dateFormatter.format(date)
}

export const formatRuntime = (minutes) => {
  if (!minutes || minutes < 1) return ''
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  if (!h) return `${m}m`
  return m ? `${h}h ${m}m` : `${h}h`
}

/** 75 -> "1:15", 3725 -> "1:02:05" */
export const formatClock = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const ss = String(s).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${m}:${ss}`
}

export const formatBytes = (bytes) => {
  const n = Number(bytes)
  if (!Number.isFinite(n) || n <= 0) return ''
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1)
  const value = n / 1024 ** i
  return `${value >= 100 || i === 0 ? Math.round(value) : value.toFixed(1)} ${units[i]}`
}

export const formatCount = (value) => {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(n)
}

export const formatRating = (value) => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n.toFixed(1) : ''
}

/** A TMDB average over a handful of votes is noise (one 10/10 vote), so cards only show ratings with enough votes. */
export const MIN_RATING_VOTES = 5
export const trustedRating = (item) => (item && item.voteCount >= MIN_RATING_VOTES ? item.rating : 0)

/** "2026-10-18T10:30:00Z" -> "18 Oct, 4:00 pm" in the viewer's timezone. */
export const formatDateTime = (isoString) => {
  const date = new Date(isoString)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date)
}

export const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

const MATCH_TIME = new Intl.DateTimeFormat(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

/** "Sun, 18 Oct, 4:00 pm" in the viewer's timezone, plus "in 3 hours" for matches starting soon. */
export const describeMatchStart = (match, now = Date.now()) => {
  if (!match.startTime) return 'Start time to be confirmed'
  if (!match.timeKnown) return `${formatDate(match.startTime.slice(0, 10))} · time to be confirmed`
  const start = new Date(match.startTime)
  const text = MATCH_TIME.format(start)
  const diff = start.getTime() - now
  if (match.status === 'upcoming' && diff > 0 && diff < 36 * 3600 * 1000) {
    const hours = Math.round(diff / 3600000)
    return `${text} · ${hours < 1 ? 'starting soon' : RELATIVE.format(hours, 'hour')}`
  }
  return text
}
