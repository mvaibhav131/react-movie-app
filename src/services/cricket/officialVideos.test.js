import { describe, expect, it } from 'vitest'
import { CRICKET_VIDEO_CHANNELS } from '../../config/cricketVideos'
import { classifyVideo, normalizeVideo, rankVideos } from './officialVideos'

const NOW = Date.parse('2026-10-18T10:00:00Z')
const channel = { name: 'ICC' }

const detail = (overrides = {}) => ({
  id: 'abcdefghijk',
  snippet: { title: 'Match highlights', publishedAt: '2026-10-17T08:00:00Z', liveBroadcastContent: 'none' },
  contentDetails: { duration: 'PT8M20S' },
  statistics: { viewCount: '1500' },
  status: { embeddable: true, privacyStatus: 'public' },
  ...overrides,
})

describe('classifyVideo', () => {
  it('splits finished videos into highlights and full-match replays', () => {
    expect(classifyVideo(detail(), NOW)).toBe('highlights')
    expect(classifyVideo(detail({ contentDetails: { duration: 'PT3H10M8S' } }), NOW)).toBe('replay')
  })

  it('drops shorts and promos', () => {
    expect(classifyVideo(detail({ contentDetails: { duration: 'PT42S' } }), NOW)).toBe(null)
  })

  it('recognises live streams and only near-term scheduled ones', () => {
    expect(classifyVideo(detail({ snippet: { liveBroadcastContent: 'live' } }), NOW)).toBe('live')
    const soon = { snippet: { liveBroadcastContent: 'upcoming' }, liveStreamingDetails: { scheduledStartTime: '2026-10-18T14:00:00Z' } }
    const far = { snippet: { liveBroadcastContent: 'upcoming' }, liveStreamingDetails: { scheduledStartTime: '2026-12-01T14:00:00Z' } }
    expect(classifyVideo(detail(soon), NOW)).toBe('upcoming')
    expect(classifyVideo(detail(far), NOW)).toBe(null)
  })
})

describe('normalizeVideo', () => {
  it('keeps public embeddable videos', () => {
    expect(normalizeVideo(detail(), channel, NOW)).toMatchObject({ id: 'abcdefghijk', channel: 'ICC', kind: 'highlights', duration: 500, views: 1500 })
  })

  it('refuses videos that cannot be embedded or are not public', () => {
    expect(normalizeVideo(detail({ status: { embeddable: false, privacyStatus: 'public' } }), channel, NOW)).toBe(null)
    expect(normalizeVideo(detail({ status: { embeddable: true, privacyStatus: 'unlisted' } }), channel, NOW)).toBe(null)
  })

  it('stores the start time of scheduled streams', () => {
    const scheduled = detail({ snippet: { title: 'Final', liveBroadcastContent: 'upcoming' }, liveStreamingDetails: { scheduledStartTime: '2026-10-18T14:00:00Z' } })
    expect(normalizeVideo(scheduled, channel, NOW)).toMatchObject({ kind: 'upcoming', startsAt: Date.parse('2026-10-18T14:00:00Z'), duration: 0 })
  })
})

describe('rankVideos', () => {
  const video = (id, kind, extra = {}) => ({ id, kind, publishedAt: '2026-10-10T00:00:00Z', startsAt: null, views: 0, ...extra })

  it('puts live first, then the soonest scheduled stream, then the newest videos', () => {
    const ranked = rankVideos([
      video('old', 'highlights', { publishedAt: '2026-10-01T00:00:00Z' }),
      video('later', 'upcoming', { startsAt: 200 }),
      video('new', 'replay', { publishedAt: '2026-10-17T00:00:00Z' }),
      video('now', 'live', { views: 5 }),
      video('sooner', 'upcoming', { startsAt: 100 }),
    ])
    expect(ranked.map((v) => v.id)).toEqual(['now', 'sooner', 'later', 'new', 'old'])
  })

  it('removes duplicates', () => {
    expect(rankVideos([video('a', 'highlights'), video('a', 'replay')])).toHaveLength(1)
  })
})

describe('channels', () => {
  it('derives the automatic playlists from the channel id', () => {
    const icc = CRICKET_VIDEO_CHANNELS.find((c) => c.id === 'icc')
    expect(icc.videosPlaylistId).toBe(`UULF${icc.channelId.slice(2)}`)
    expect(icc.livePlaylistId).toBe(`UULV${icc.channelId.slice(2)}`)
  })
})
