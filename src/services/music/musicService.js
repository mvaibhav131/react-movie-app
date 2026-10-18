import { YOUTUBE_API_KEY } from '../../config/env'
import { channelsFor } from '../../config/music'
import { local } from '../../utils/storage'

/**
 * @typedef {Object} Track
 * @property {string} id            YouTube video id
 * @property {string} title         cleaned song title
 * @property {string} artist        best guess from the title, else the channel
 * @property {string} channel       label channel name
 * @property {string} channelId
 * @property {string[]} languages
 * @property {boolean} devotional
 * @property {string} publishedAt   ISO
 * @property {number} views
 * @property {number} duration      seconds
 * @property {string} thumbnail
 */

const API = 'https://www.googleapis.com/youtube/v3'
const CACHE_PREFIX = 'vmflix:music:v1:'
const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const MIN_SECONDS = 90
const MAX_SECONDS = 15 * 60
const UPLOADS_PER_CHANNEL = 30
const NOT_A_SONG = /\b(teaser|trailer|promo|making|behind the scenes|reaction|jukebox|nonstop|mashup|status|shorts?|interview|bts|audio launch|press)\b/i

export const musicConfigured = () => !!YOUTUBE_API_KEY

/** Compact copy of a track for storage (favourites, recents, playlists). */
export const toStoredTrack = (t) => ({ id: t.id, title: t.title, artist: t.artist, channel: t.channel, thumbnail: t.thumbnail, duration: t.duration })

export class MusicError extends Error {
  constructor(message, code = 'MUSIC_ERROR') {
    super(message)
    this.name = 'MusicError'
    this.code = code
  }
}

/** "PT4M12S" -> 252 */
export const parseDuration = (iso) => {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(iso || '')
  if (!match) return 0
  const [d, h, m, s] = match.slice(1).map((part) => Number(part) || 0)
  return d * 86400 + h * 3600 + m * 60 + s
}

// Bracketed tags such as "(Full Video)", "[Official Music Video]" or "(Lyrical)".
const TAGS = /[([][^)\]]*\b(video|lyric|lyrical|lyrics|audio|official|song|full|hd|4k)\b[^)\]]*[)\]]/gi
// Unbracketed boilerplate. Standalone words like "Song" are left alone because they are often part of the title.
const PHRASES = /\b(full video song|video song|official (music )?video|lyrical video|lyric video|audio song|full song|official audio)\b/gi
const QUALITY = /\b(4k|8k|uhd|1080p|hd)\b/gi
const CREDIT_PREFIX = /^(from|movie|film|album|ft\.?|feat\.?)[:\s]+/i

/**
 * Splits typical label titles such as "Tum Hi Ho (Full Video) | Aashiqui 2 | Arijit Singh | Mithoon".
 * The first segment is the song; up to two following segments (usually the film and the singer) become the artist line.
 */
export const parseTitle = (rawTitle, channelName) => {
  const parts = String(rawTitle || '')
    .replace(TAGS, ' ')
    .split(/\s*[|\u2022]\s*|\s+-\s+/)
    .map((p) => p.replace(PHRASES, ' ').replace(QUALITY, ' ').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  const title = parts[0] || String(rawTitle || '').trim()
  const credits = parts
    .slice(1)
    .map((p) => p.replace(CREDIT_PREFIX, '').trim())
    .filter((p) => p && p.length < 60)
    .slice(0, 2)
  return { title, artist: credits.join(' · ') || channelName }
}

const pickThumb = (id) => `https://i.ytimg.com/vi/${encodeURIComponent(id)}/mqdefault.jpg`

export const normalizeTrack = (item, details, channel) => {
  const id = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId
  const { title, artist } = parseTitle(item.snippet?.title, channel.name)
  return {
    id,
    title,
    artist,
    channel: channel.name,
    channelId: channel.channelId,
    languages: channel.languages,
    devotional: !!channel.devotional,
    publishedAt: item.contentDetails?.videoPublishedAt || item.snippet?.publishedAt || '',
    views: Number(details?.statistics?.viewCount) || 0,
    duration: parseDuration(details?.contentDetails?.duration),
    thumbnail: pickThumb(id),
  }
}

const call = async (path, params, signal) => {
  const url = new URL(`${API}/${path}`)
  Object.entries({ ...params, key: YOUTUBE_API_KEY }).forEach(([k, v]) => url.searchParams.set(k, v))
  let res
  try {
    res = await fetch(url, { signal })
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    throw new MusicError('Couldn’t reach YouTube. Check your connection.', 'NETWORK')
  }
  if (res.ok) return res.json()
  const body = await res.json().catch(() => ({}))
  const reason = body?.error?.errors?.[0]?.reason
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') {
    throw new MusicError('Today’s YouTube request quota has been used up. Music will be back tomorrow.', 'QUOTA')
  }
  if (res.status === 400 || res.status === 403) throw new MusicError('The YouTube API key was rejected. Check VITE_YOUTUBE_API_KEY and its referrer restrictions.', 'BAD_KEY')
  throw new MusicError(`YouTube request failed (${res.status}).`, 'HTTP')
}

const memory = new Map()

/** Latest uploads from one label, filtered to embeddable full-length songs. Cached for six hours. */
export const loadChannelTracks = (channel, { signal } = {}) => {
  const key = CACHE_PREFIX + channel.channelId
  const stored = local.read(key)
  if (stored && Date.now() - stored.at < CACHE_TTL_MS) return Promise.resolve(stored.tracks)
  if (memory.has(key)) return memory.get(key)

  const task = (async () => {
    const uploads = await call('playlistItems', { part: 'snippet,contentDetails', playlistId: channel.playlistId, maxResults: UPLOADS_PER_CHANNEL }, signal)
    const items = (uploads.items || []).filter((i) => i.contentDetails?.videoId && i.snippet?.title && i.snippet.title !== 'Private video' && i.snippet.title !== 'Deleted video')
    if (!items.length) return []
    const details = await call('videos', { part: 'contentDetails,statistics,status', id: items.map((i) => i.contentDetails.videoId).join(',') }, signal)
    const byId = new Map((details.items || []).map((d) => [d.id, d]))
    const tracks = items
      .map((item) => ({ item, detail: byId.get(item.contentDetails.videoId) }))
      .filter(({ detail }) => detail?.status?.embeddable && detail.status.privacyStatus === 'public')
      .map(({ item, detail }) => normalizeTrack(item, detail, channel))
      .filter((t) => t.duration >= MIN_SECONDS && t.duration <= MAX_SECONDS && !NOT_A_SONG.test(t.title))
    local.write(key, { at: Date.now(), tracks })
    return tracks
  })().finally(() => memory.delete(key))

  memory.set(key, task)
  return task
}

const DAY = 24 * 3600 * 1000

const sorters = {
  latest: (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  views: (a, b) => b.views - a.views,
  trending: (a, b) => b.views / Math.max(1, (Date.now() - Date.parse(b.publishedAt)) / DAY + 2) - a.views / Math.max(1, (Date.now() - Date.parse(a.publishedAt)) / DAY + 2),
}

/** Applies a category's ordering / keyword rules to loaded tracks. */
export const shapeCategory = (category, tracks, limit = 24) => {
  const seen = new Set()
  const unique = tracks.filter((t) => !seen.has(t.id) && seen.add(t.id))
  const matched = category.match ? unique.filter((t) => category.match.test(`${t.title} ${t.artist}`)) : unique
  const windowed = category.sort === 'trending' ? matched.filter((t) => Date.now() - Date.parse(t.publishedAt) < 45 * DAY) : matched
  return [...windowed].sort(sorters[category.sort] || sorters.latest).slice(0, limit)
}

/** Loads every channel that feeds the category (optionally narrowed to a language) and shapes the result. */
export const loadCategory = async (category, { language, signal, limit } = {}) => {
  const channels = channelsFor(category, language)
  const settled = await Promise.allSettled(channels.map((c) => loadChannelTracks(c, { signal })))
  const failures = settled.filter((s) => s.status === 'rejected')
  const tracks = settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value)
  if (!tracks.length && failures.length) throw failures[0].reason
  return shapeCategory(category, tracks, limit)
}

export const loadLanguageSongs = (languageId, { signal, limit = 60 } = {}) =>
  loadCategory({ id: `lang-${languageId}`, sort: 'latest', exclude: 'devotional', languages: [languageId] }, { language: languageId, signal, limit })

/* ── Search (YouTube search costs 100 quota units, so it is cached and deliberately rationed) ── */

const SEARCH_TTL_MS = 30 * 60 * 1000
const SEARCH_BUDGET_KEY = 'vmflix:music:search-budget'
const SEARCHES_PER_DAY = 40

const spendSearch = () => {
  const today = new Date().toISOString().slice(0, 10)
  const budget = local.read(SEARCH_BUDGET_KEY, { day: today, used: 0 })
  const state = budget.day === today ? budget : { day: today, used: 0 }
  if (state.used >= SEARCHES_PER_DAY) return false
  local.write(SEARCH_BUDGET_KEY, { ...state, used: state.used + 1 })
  return true
}

export const searchMusic = async (query, { language, signal } = {}) => {
  const q = query.trim()
  if (q.length < 3) return []
  const cacheKey = `${CACHE_PREFIX}search:${language || 'all'}:${q.toLowerCase()}`
  const hit = local.read(cacheKey)
  if (hit && Date.now() - hit.at < SEARCH_TTL_MS) return hit.tracks

  // Free, quota-friendly path first: filter what is already loaded from the label channels.
  const loaded = await Promise.all(channelsFor({}, language).map((c) => loadChannelTracks(c, { signal }).catch(() => [])))
  const needle = q.toLowerCase()
  const matches = loaded.flat().filter((t) => `${t.title} ${t.artist} ${t.channel}`.toLowerCase().includes(needle))
  if (matches.length >= 6) return shapeCategory({ sort: 'views' }, matches, 30)

  if (!spendSearch()) return shapeCategory({ sort: 'views' }, matches, 30)
  const data = await call(
    'search',
    { part: 'snippet', type: 'video', videoCategoryId: '10', videoEmbeddable: 'true', maxResults: 20, regionCode: 'IN', q: language ? `${q} ${language} song` : `${q} song` },
    signal
  )
  const ids = (data.items || []).map((i) => i.id?.videoId).filter(Boolean)
  if (!ids.length) return shapeCategory({ sort: 'views' }, matches, 30)
  const details = await call('videos', { part: 'contentDetails,statistics,status', id: ids.join(',') }, signal)
  const byId = new Map((details.items || []).map((d) => [d.id, d]))
  const results = (data.items || [])
    .map((item) => ({ item, detail: byId.get(item.id?.videoId) }))
    .filter(({ detail }) => detail?.status?.embeddable)
    .map(({ item, detail }) =>
      normalizeTrack({ contentDetails: { videoId: item.id.videoId, videoPublishedAt: item.snippet.publishedAt }, snippet: item.snippet }, detail, {
        name: item.snippet.channelTitle,
        channelId: item.snippet.channelId,
        languages: language ? [language] : [],
      })
    )
    .filter((t) => t.duration >= 60 && t.duration <= MAX_SECONDS)
  const merged = shapeCategory({ sort: 'views' }, [...matches, ...results], 30)
  local.write(cacheKey, { at: Date.now(), tracks: merged })
  return merged
}
