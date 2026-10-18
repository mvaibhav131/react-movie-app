/**
 * Builds public/free-movies.json: complete films that official YouTube channels publish for free,
 * matched to TMDB movies. The app plays them through YouTube's own embedded player.
 *
 *   npm run build:free-movies                       every channel in src/config/freeMovieChannels.js
 *   npm run build:free-movies -- --only=rajshri     only channels whose name contains "rajshri"
 *   npm run build:free-movies -- --pages=20         newest 1000 uploads per channel (default 60 pages of 50)
 *
 * Needs VITE_YOUTUBE_API_KEY and VITE_TMDB_TOKEN (environment or .env.local). Costs about 2 YouTube quota
 * units per 50 uploads. YouTube's API terms require stored API data to be refreshed within 30 days, so re-run it monthly.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import https from 'node:https'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import { FREE_MOVIE_CHANNELS } from '../src/config/freeMovieChannels.js'
import { normalizeText } from '../src/utils/url.js'
import {
  FILM_HINT,
  MAX_FEATURE_MINUTES,
  MIN_FEATURE_MINUTES,
  isoDurationSeconds,
  matchTitle,
  parseVideoTitle,
  pickMovie,
  yearFits,
} from '../src/services/freeMovies/match.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const { values: args } = parseArgs({ options: { only: { type: 'string' }, pages: { type: 'string' }, out: { type: 'string' } } })

const readEnvFile = (name) => {
  const file = `${root}${name}`
  if (!existsSync(file)) return {}
  return Object.fromEntries(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .filter((line) => line.includes('=') && !line.trim().startsWith('#'))
      .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')])
  )
}
const env = { ...readEnvFile('.env'), ...readEnvFile('.env.local'), ...process.env }
const YOUTUBE_KEY = env.VITE_YOUTUBE_API_KEY
const TMDB_TOKEN = env.VITE_TMDB_TOKEN
if (!YOUTUBE_KEY || !TMDB_TOKEN) {
  console.error('Set VITE_YOUTUBE_API_KEY and VITE_TMDB_TOKEN in .env.local first.')
  process.exit(1)
}

const OUT = args.out || `${root}public/free-movies.json`
const PAGES = Number(args.pages) || 60
const CONCURRENCY = 6
const MAX_SOURCES_PER_MOVIE = 3
/** These channels publish Indian films and Hollywood films dubbed into Hindi; a match in any other language is almost certainly a coincidence. */
const LANGUAGES = new Set(['hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'pa', 'gu', 'bh', 'or', 'ur', 'en'])
const today = new Date().toISOString().slice(0, 10)
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/* ── API helpers ─────────────────────────────────────────── */
const fetchWithRetry = async (url, options) => {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fetch(url, { ...options, signal: AbortSignal.timeout(30_000) })
    } catch (error) {
      if (attempt >= 5) throw error
      await sleep(1000 * attempt)
    }
  }
}

const youtube = async (path, params) => {
  const url = new URL(`https://www.googleapis.com/youtube/v3/${path}`)
  Object.entries({ ...params, key: YOUTUBE_KEY }).forEach(([k, v]) => v !== undefined && url.searchParams.set(k, v))
  const res = await fetchWithRetry(url, { headers: { Referer: env.YOUTUBE_REFERER || 'http://localhost:5173/' } })
  const json = await res.json()
  if (!res.ok) {
    const reason = json.error?.errors?.[0]?.reason
    const error = new Error(`YouTube ${path} failed: ${res.status} ${reason || ''}`)
    error.status = res.status
    error.reason = reason
    throw error
  }
  return json
}

/** Some ISPs (e.g. Jio) return a dead address for api.themoviedb.org, so its IP is looked up over DNS-over-HTTPS and used directly. */
let tmdbAddress = null
const resolveTmdbAddress = async () => {
  if (!tmdbAddress) {
    const res = await fetchWithRetry('https://dns.google/resolve?name=api.themoviedb.org&type=A')
    const record = (await res.json()).Answer?.find((answer) => answer.type === 1)
    if (!record) throw new Error('Could not resolve api.themoviedb.org')
    tmdbAddress = record.data
  }
  return tmdbAddress
}

const tmdbRequest = async (url) => {
  const host = await resolveTmdbAddress()
  return new Promise((resolve, reject) => {
    const request = https.request(
      { host, servername: url.hostname, path: `${url.pathname}${url.search}`, method: 'GET', timeout: 30_000, headers: { Host: url.hostname, Authorization: `Bearer ${TMDB_TOKEN}`, accept: 'application/json' } },
      (res) => {
        let body = ''
        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          body += chunk
        })
        res.on('end', () => resolve({ status: res.statusCode, body }))
      }
    )
    request.on('timeout', () => request.destroy(new Error('TMDB request timed out')))
    request.on('error', reject)
    request.end()
  })
}

const tmdb = async (path, params = {}) => {
  const url = new URL(`https://api.themoviedb.org/3${path}`)
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    let res
    try {
      res = await tmdbRequest(url)
    } catch (error) {
      if (attempt === 4) throw error
      await sleep(800 * attempt)
      continue
    }
    if (res.status === 200) return JSON.parse(res.body)
    if (res.status === 404) return null
    if (res.status === 429 || res.status >= 500) {
      await sleep(400 * attempt * attempt)
      continue
    }
    throw new Error(`TMDB ${path} failed: ${res.status}`)
  }
  throw new Error(`TMDB ${path} kept failing`)
}

const searchCache = new Map()
const detailsCache = new Map()

const searchMovies = async (name) => {
  const key = normalizeText(name)
  if (!searchCache.has(key)) searchCache.set(key, tmdb('/search/movie', { query: name, include_adult: 'false', language: 'en-US' }).then((res) => res?.results || []))
  return searchCache.get(key)
}

const movieDetails = (id) => {
  if (!detailsCache.has(id)) detailsCache.set(id, tmdb(`/movie/${id}`, { language: 'en-US' }))
  return detailsCache.get(id)
}

/* ── YouTube listing ─────────────────────────────────────── */
const blockedInIndia = (restriction) => !!restriction && (restriction.blocked?.includes('IN') || (restriction.allowed && !restriction.allowed.includes('IN')))

async function* uploadPages(channelId) {
  let playlistId = `UULF${channelId.slice(2)}`
  let pageToken
  for (let page = 0; page < PAGES; page += 1) {
    let res
    try {
      res = await youtube('playlistItems', { part: 'contentDetails', playlistId, maxResults: 50, pageToken })
    } catch (error) {
      if (error.status === 404 && page === 0 && playlistId.startsWith('UULF')) {
        playlistId = `UU${channelId.slice(2)}`
        page -= 1
        continue
      }
      throw error
    }
    yield res.items.map((item) => item.contentDetails.videoId)
    pageToken = res.nextPageToken
    if (!pageToken) return
  }
}

/** Embeddable, public, complete films from one channel (newest first). */
async function listFullMovies(channel) {
  const found = []
  const rejected = { notEmbeddable: 0 }
  let scanned = 0
  for await (const ids of uploadPages(channel.id)) {
    scanned += ids.length
    const { items } = await youtube('videos', { part: 'snippet,contentDetails,status', id: ids.join(','), maxResults: 50 })
    for (const video of items) {
      const minutes = Math.round(isoDurationSeconds(video.contentDetails?.duration) / 60)
      if (minutes < MIN_FEATURE_MINUTES || minutes > MAX_FEATURE_MINUTES || !FILM_HINT.test(video.snippet?.title || '')) continue
      if (video.status?.embeddable !== true) {
        rejected.notEmbeddable += 1
        continue
      }
      const usable =
        video.status?.privacyStatus === 'public' &&
        video.snippet?.liveBroadcastContent === 'none' &&
        !blockedInIndia(video.contentDetails?.regionRestriction) &&
        video.contentDetails?.contentRating?.ytRating !== 'ytAgeRestricted'
      if (usable) found.push({ videoId: video.id, title: video.snippet.title, minutes })
    }
  }
  return { found, scanned, rejected }
}

/* ── Matching ────────────────────────────────────────────── */
async function resolveMovie(upload) {
  const parsed = parseVideoTitle(upload.title)
  for (const name of parsed.names) {
    const results = await searchMovies(name)
    const named = results.filter((r) => matchTitle(name, r) && yearFits(parsed.year, r.release_date)).slice(0, 6)
    const details = (await Promise.all(named.map((r) => movieDetails(r.id)))).filter(Boolean)
    const movie = pickMovie(name, parsed.year, details, upload.minutes)
    if (movie) return { movie, dubbedHindi: parsed.dubbedHindi }
  }
  return null
}

const mapPool = async (items, worker) => {
  const results = new Array(items.length)
  let next = 0
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (next < items.length) {
        const index = next
        next += 1
        results[index] = await worker(items[index])
      }
    })
  )
  return results
}

/* ── Main ────────────────────────────────────────────────── */
const wanted = (args.only || '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
const channels = FREE_MOVIE_CHANNELS.map((channel, index) => ({ ...channel, index })).filter((c) => !wanted.length || wanted.some((w) => c.name.toLowerCase().includes(w)))

const movies = new Map()

const writeIndex = () => {
  const list = [...movies.values()].sort((a, b) => b.d.localeCompare(a.d) || a.id - b.id)
  list.forEach((entry) => entry.s.sort((a, b) => a[1] - b[1]))
  const index = { version: 1, generatedAt: today, channels: FREE_MOVIE_CHANNELS.map((c) => c.name), movies: list }
  writeFileSync(OUT, `${JSON.stringify(index)}\n`)
  return list.length
}

for (const channel of channels) {
  try {
    const { found, scanned, rejected } = await listFullMovies(channel)
    const matches = await mapPool(found, resolveMovie)
    let matched = 0
    matches.forEach((match, i) => {
      if (!match) return
      matched += 1
      const { movie, dubbedHindi } = match
      if (!movie.poster_path || !movie.release_date || movie.release_date > today || !LANGUAGES.has(movie.original_language)) return
      const entry = movies.get(movie.id) || {
        id: movie.id,
        t: movie.title,
        p: movie.poster_path,
        d: movie.release_date,
        l: movie.original_language,
        r: Math.round((movie.vote_average || 0) * 10) / 10,
        s: [],
      }
      const duplicate = entry.s.some((s) => s[0] === found[i].videoId)
      if (!duplicate && entry.s.length < MAX_SOURCES_PER_MOVIE) {
        entry.s.push(dubbedHindi ? [found[i].videoId, channel.index, found[i].minutes, 'hi'] : [found[i].videoId, channel.index, found[i].minutes])
      }
      movies.set(movie.id, entry)
    })
    console.log(`${channel.name.padEnd(26)} scanned ${String(scanned).padStart(5)}  full-length ${String(found.length).padStart(4)}  matched ${String(matched).padStart(4)}  embedding off ${rejected.notEmbeddable}`)
    writeIndex()
  } catch (error) {
    console.error(`${channel.name}: ${error.message}${error.cause ? ` (${error.cause.code || error.cause.message})` : ''}`)
    if (error.reason === 'quotaExceeded') break
  }
}

console.log(`\n${writeIndex()} films from ${channels.length} channels -> ${OUT}`)
