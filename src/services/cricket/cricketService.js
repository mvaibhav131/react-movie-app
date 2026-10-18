import { CRICAPI_KEY, SPORTSDB_KEY } from '../../config/env'
import { local } from '../../utils/storage'

/**
 * @typedef {Object} CricketTeam
 * @property {string} name
 * @property {string} [short]
 * @property {string} [logo]
 * @property {string} [score]   e.g. "245/6 (80.2 ov)"
 *
 * @typedef {Object} CricketMatch
 * @property {string} id
 * @property {string} league
 * @property {string} name
 * @property {'live' | 'upcoming' | 'completed' | 'postponed' | 'unknown'} status
 * @property {string} statusText
 * @property {string | null} startTime   ISO instant (UTC) or null when unknown
 * @property {boolean} timeKnown
 * @property {CricketTeam[]} teams
 * @property {string} [venue]
 * @property {string} [result]
 */

const CACHE_KEY = 'vmflix:cricket:v2'
const SPORTSDB_BASE = `https://www.thesportsdb.com/api/v1/json/${SPORTSDB_KEY}`
const CRICAPI_BASE = 'https://api.cricapi.com/v1'
const HOUR = 3600 * 1000
const DAY = 24 * HOUR
const SPORTSDB_WINDOW = { back: 2, forward: 5 }

/** How long a cached board stays fresh. CricAPI's free tier has a small daily quota, TheSportsDB a rate limit. */
const TTL_MS = CRICAPI_KEY ? 5 * 60 * 1000 : 15 * 60 * 1000

export const dataSource = CRICAPI_KEY ? 'cricapi' : 'sportsdb'

const isoDay = (date) => date.toISOString().slice(0, 10)

/* ── TheSportsDB ──────────────────────────────────────────────────── */

const FINISHED = /\b(ft|aet|finished|completed|ended|match finished|result)\b/i
const LIVE = /\b(live|in progress|1h|2h|ht|innings|break|stumps|lunch|tea)\b/i
const CANCELLED = /(postponed|cancel|abandon|no result)/i

export const normalizeSportsDbEvent = (event, now = Date.now()) => {
  const timeKnown = !!event.strTime && event.strTime !== '00:00:00'
  const stamp = event.strTimestamp || (event.dateEvent ? `${event.dateEvent}T${event.strTime || '00:00:00'}` : '')
  const parsed = stamp ? new Date(`${stamp.replace(/Z$/, '')}Z`) : null
  const startMs = parsed && !Number.isNaN(parsed.getTime()) ? parsed.getTime() : null
  const statusText = (event.strStatus || '').trim()
  const homeScore = event.intHomeScore ?? null
  const awayScore = event.intAwayScore ?? null
  const hasResult = !!event.strResult || (homeScore !== null && awayScore !== null)

  let status
  if (CANCELLED.test(statusText) || event.strPostponed === 'yes') status = 'postponed'
  else if (FINISHED.test(statusText) || hasResult) status = 'completed'
  else if (LIVE.test(statusText)) status = 'live'
  // Without a kick-off time we only know the day, so a fixture dated today or later has not provably started.
  else if (!timeKnown && event.dateEvent && event.dateEvent >= isoDay(new Date(now))) status = 'upcoming'
  else if (startMs !== null && startMs > now) status = 'upcoming'
  else if (startMs !== null && now - startMs > 7 * DAY) status = 'completed'
  else status = 'unknown'

  const team = (side) => ({
    name: event[`str${side}Team`] || 'TBC',
    logo: event[`str${side}TeamBadge`] || undefined,
    score: event[`int${side}Score`] != null ? String(event[`int${side}Score`]) : undefined,
  })

  return {
    id: `sportsdb:${event.idEvent}`,
    league: event.strLeague || 'Cricket',
    name: event.strEvent || `${event.strHomeTeam} vs ${event.strAwayTeam}`,
    status,
    statusText,
    startTime: startMs !== null ? new Date(startMs).toISOString() : null,
    timeKnown,
    teams: [team('Home'), team('Away')],
    venue: event.strVenue || undefined,
    result: event.strResult || undefined,
  }
}

const fetchSportsDb = async (signal) => {
  const today = Date.now()
  const days = []
  for (let offset = -SPORTSDB_WINDOW.back; offset <= SPORTSDB_WINDOW.forward; offset += 1) days.push(isoDay(new Date(today + offset * DAY)))

  const events = []
  let rateLimited = false
  // Two at a time keeps us well under the free tier's per-minute limit.
  for (let i = 0; i < days.length; i += 2) {
    const batch = await Promise.allSettled(
      days.slice(i, i + 2).map(async (day) => {
        const res = await fetch(`${SPORTSDB_BASE}/eventsday.php?d=${day}&s=Cricket`, { signal })
        if (res.status === 429) {
          rateLimited = true
          return []
        }
        if (!res.ok) throw new Error(`Fixtures request failed (${res.status})`)
        const data = await res.json().catch(() => ({}))
        return data?.events || []
      })
    )
    batch.forEach((r) => r.status === 'fulfilled' && events.push(...r.value))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  }
  if (!events.length && rateLimited) throw Object.assign(new Error('The free cricket data service is rate-limiting requests. Please try again in a minute.'), { code: 'RATE_LIMIT' })
  const seen = new Set()
  return events.filter((e) => !seen.has(e.idEvent) && seen.add(e.idEvent)).map((e) => normalizeSportsDbEvent(e, today))
}

/* ── CricAPI (cricketdata.org) ─────────────────────────────────────── */

const inningsScore = (scores, teamName) => {
  const parts = (scores || [])
    .filter((s) => s.inning && s.inning.toLowerCase().startsWith(teamName.toLowerCase()))
    .map((s) => `${s.r}/${s.w}${s.o != null ? ` (${s.o} ov)` : ''}`)
  return parts.length ? parts.join(' & ') : undefined
}

export const normalizeCricApiMatch = (match) => {
  const info = match.teamInfo || []
  const names = match.teams?.length ? match.teams : info.map((t) => t.name)
  const startMs = match.dateTimeGMT ? new Date(`${match.dateTimeGMT.replace(/Z$/, '')}Z`).getTime() : null
  const status = match.matchEnded ? 'completed' : match.matchStarted ? 'live' : CANCELLED.test(match.status || '') ? 'postponed' : 'upcoming'
  return {
    id: `cricapi:${match.id}`,
    league: (match.matchType || 'Cricket').toUpperCase(),
    name: match.name,
    status,
    statusText: match.status || '',
    startTime: startMs && !Number.isNaN(startMs) ? new Date(startMs).toISOString() : null,
    timeKnown: !!match.dateTimeGMT,
    teams: names.slice(0, 2).map((name) => {
      const meta = info.find((t) => t.name === name)
      return { name, short: meta?.shortname, logo: meta?.img, score: inningsScore(match.score, name) }
    }),
    venue: match.venue || undefined,
    result: match.matchEnded ? match.status : undefined,
  }
}

const fetchCricApi = async (signal) => {
  const res = await fetch(`${CRICAPI_BASE}/currentMatches?apikey=${encodeURIComponent(CRICAPI_KEY)}&offset=0`, { signal })
  if (!res.ok) throw new Error(`Cricket data request failed (${res.status})`)
  const body = await res.json()
  if (body.status && body.status !== 'success') throw new Error(body.reason || 'The cricket data service returned an error.')
  return (body.data || []).filter((m) => m.name).map(normalizeCricApiMatch)
}

/* ── Public API ───────────────────────────────────────────────────── */

const ORDER = { live: 0, unknown: 1, upcoming: 2, completed: 3, postponed: 4 }

export const sortMatches = (matches) =>
  [...matches].sort((a, b) => {
    if (ORDER[a.status] !== ORDER[b.status]) return ORDER[a.status] - ORDER[b.status]
    const ta = a.startTime ? Date.parse(a.startTime) : 0
    const tb = b.startTime ? Date.parse(b.startTime) : 0
    // Upcoming: soonest first. Everything else: most recent first.
    return a.status === 'upcoming' ? ta - tb : tb - ta
  })

/**
 * @returns {Promise<{ matches: CricketMatch[], source: string, updatedAt: number, stale: boolean }>}
 * Fresh results are cached; when the provider fails, the last cached board is returned with `stale: true`.
 */
export const loadCricketBoard = async ({ signal, force = false } = {}) => {
  const cached = local.read(CACHE_KEY)
  if (!force && cached && cached.source === dataSource && Date.now() - cached.updatedAt < TTL_MS) return { ...cached, stale: false }
  try {
    const matches = sortMatches(CRICAPI_KEY ? await fetchCricApi(signal) : await fetchSportsDb(signal))
    const board = { matches, source: dataSource, updatedAt: Date.now() }
    local.write(CACHE_KEY, board)
    return { ...board, stale: false }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    if (cached?.matches?.length) return { ...cached, stale: true, error }
    throw error
  }
}

export const countByStatus = (matches) =>
  matches.reduce((acc, m) => ({ ...acc, [m.status]: (acc[m.status] || 0) + 1 }), { live: 0, upcoming: 0, completed: 0, postponed: 0, unknown: 0 })
