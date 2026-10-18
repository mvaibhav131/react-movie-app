import { YOUTUBE_API_KEY } from '../../config/env'
import { CRICKET_VIDEO_CHANNELS } from '../../config/cricketVideos'
import { local } from '../../utils/storage'
import { parseDuration } from '../music/musicService'

/**
 * Free cricket videos from official channels (highlights, full-match replays, live streams).
 *
 * @typedef {Object} CricketVideo
 * @property {string} id            YouTube video id
 * @property {string} title
 * @property {string} channel
 * @property {'live' | 'upcoming' | 'replay' | 'highlights'} kind
 * @property {string} publishedAt   ISO
 * @property {number | null} startsAt  epoch ms for scheduled streams
 * @property {number} duration      seconds (0 while live)
 * @property {number} views
 * @property {string} thumbnail
 */

const API = 'https://www.googleapis.com/youtube/v3'
const CACHE_KEY = 'vmflix:cricket-videos:v1'
const CACHE_TTL_MS = 15 * 60 * 1000
const VIDEOS_PER_CHANNEL = 20
const LIVE_PER_CHANNEL = 8
const MIN_SECONDS = 75
const REPLAY_SECONDS = 30 * 60
const SOON_MS = 36 * 3600 * 1000
const MAX_VIDEOS = 72

export const cricketVideosConfigured = () => !!YOUTUBE_API_KEY

/** live > scheduled soon > replay/highlights. Anything else (shorts, unfinished, far-off events) is dropped. */
export const classifyVideo = (detail, now = Date.now()) => {
  const state = detail?.snippet?.liveBroadcastContent
  if (state === 'live') return 'live'
  if (state === 'upcoming') {
    const start = Date.parse(detail.liveStreamingDetails?.scheduledStartTime)
    return start && start > now - 3_600_000 && start - now < SOON_MS ? 'upcoming' : null
  }
  const seconds = parseDuration(detail?.contentDetails?.duration)
  if (seconds < MIN_SECONDS) return null
  return seconds >= REPLAY_SECONDS ? 'replay' : 'highlights'
}

/** @returns {CricketVideo | null} null unless the video is public and embeddable */
export const normalizeVideo = (detail, channel, now = Date.now()) => {
  if (!detail?.id || !detail.status?.embeddable || detail.status.privacyStatus !== 'public') return null
  const kind = classifyVideo(detail, now)
  if (!kind) return null
  const start = Date.parse(detail.liveStreamingDetails?.scheduledStartTime)
  return {
    id: detail.id,
    title: String(detail.snippet?.title || '').trim(),
    channel: channel.name,
    kind,
    publishedAt: detail.snippet?.publishedAt || '',
    startsAt: kind === 'upcoming' && start ? start : null,
    duration: kind === 'live' || kind === 'upcoming' ? 0 : parseDuration(detail.contentDetails?.duration),
    views: Number(detail.statistics?.viewCount) || 0,
    thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(detail.id)}/mqdefault.jpg`,
  }
}

const ORDER = { live: 0, upcoming: 1, replay: 2, highlights: 2 }

/** Live first, then the soonest scheduled stream, then everything else newest first. */
export const rankVideos = (videos) => {
  const seen = new Set()
  return videos
    .filter((v) => !seen.has(v.id) && seen.add(v.id))
    .sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || (a.kind === 'upcoming' ? a.startsAt - b.startsAt : a.kind === 'live' ? b.views - a.views : Date.parse(b.publishedAt) - Date.parse(a.publishedAt)))
}

export class CricketVideoError extends Error {
  constructor(message, code = 'CRICKET_VIDEOS') {
    super(message)
    this.name = 'CricketVideoError'
    this.code = code
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
    throw new CricketVideoError('Couldn’t reach YouTube. Check your connection.', 'NETWORK')
  }
  if (res.ok) return res.json()
  const reason = (await res.json().catch(() => ({})))?.error?.errors?.[0]?.reason
  if (res.status === 404 || reason === 'playlistNotFound') return { items: [] }
  if (reason === 'quotaExceeded' || reason === 'dailyLimitExceeded' || reason === 'rateLimitExceeded') throw new CricketVideoError('Today’s YouTube request quota has been used up.', 'QUOTA')
  throw new CricketVideoError(`YouTube request failed (${res.status}).`, 'HTTP')
}

const loadChannel = async (channel, signal) => {
  const [videos, live] = await Promise.all([
    call('playlistItems', { part: 'contentDetails', playlistId: channel.videosPlaylistId, maxResults: VIDEOS_PER_CHANNEL }, signal),
    call('playlistItems', { part: 'contentDetails', playlistId: channel.livePlaylistId, maxResults: LIVE_PER_CHANNEL }, signal),
  ])
  const ids = [...new Set([...(live.items || []), ...(videos.items || [])].map((i) => i.contentDetails?.videoId).filter(Boolean))]
  if (!ids.length) return []
  const details = await call('videos', { part: 'snippet,contentDetails,statistics,status,liveStreamingDetails', id: ids.join(',') }, signal)
  const now = Date.now()
  return (details.items || []).map((detail) => normalizeVideo(detail, channel, now)).filter(Boolean)
}

/**
 * Every channel is fetched in parallel; one failing channel does not hide the rest. Cached for 15 minutes,
 * and the last saved list is returned (marked stale) when YouTube cannot be reached.
 * @returns {Promise<{ at: number, videos: CricketVideo[], stale?: boolean }>}
 */
export const loadOfficialVideos = async ({ signal, force = false } = {}) => {
  const cached = local.read(CACHE_KEY)
  if (!force && cached && Date.now() - cached.at < CACHE_TTL_MS) return cached
  try {
    const settled = await Promise.allSettled(CRICKET_VIDEO_CHANNELS.map((channel) => loadChannel(channel, signal)))
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const videos = rankVideos(settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value)).slice(0, MAX_VIDEOS)
    const failure = settled.find((s) => s.status === 'rejected')
    if (!videos.length && failure) throw failure.reason
    const result = { at: Date.now(), videos }
    local.write(CACHE_KEY, result)
    return result
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    if (cached) return { ...cached, stale: true }
    throw error
  }
}
