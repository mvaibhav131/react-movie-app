import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { normalizeTrack, parseDuration, parseTitle, shapeCategory } from './musicService'
import { MUSIC_CATEGORIES, MUSIC_CHANNELS, MUSIC_LANGUAGES, channelsFor } from '../../config/music'

describe('parseDuration', () => {
  it('converts ISO-8601 durations to seconds', () => {
    expect(parseDuration('PT4M12S')).toBe(252)
    expect(parseDuration('PT1H2M3S')).toBe(3723)
    expect(parseDuration('PT45S')).toBe(45)
    expect(parseDuration('P0D')).toBe(0)
    expect(parseDuration('nonsense')).toBe(0)
  })
})

describe('parseTitle', () => {
  it('splits label-style titles into song and a film / singer credit line', () => {
    expect(parseTitle('Tum Hi Ho (Full Video) | Aashiqui 2 | Arijit Singh | Mithoon', 'T-Series')).toEqual({ title: 'Tum Hi Ho', artist: 'Aashiqui 2 · Arijit Singh' })
  })

  it('never strips the word "Song" from a real title', () => {
    expect(parseTitle('Song | Singer', 'Label')).toEqual({ title: 'Song', artist: 'Singer' })
    expect(parseTitle('Love Song Full Video Song | Film', 'Label').title).toBe('Love Song')
  })

  it('strips tags and quality markers and falls back to the channel name', () => {
    expect(parseTitle('Kesariya [Official Video] 4K', 'Sony Music India')).toEqual({ title: 'Kesariya', artist: 'Sony Music India' })
    expect(parseTitle('', 'X').artist).toBe('X')
  })

  it('drops "From ..." prefixes in credits', () => {
    expect(parseTitle('Deva Deva | From Brahmastra | Arijit Singh', 'Saregama').artist).toBe('Brahmastra · Arijit Singh')
  })
})

describe('normalizeTrack', () => {
  it('builds a track from playlist item + video details', () => {
    const track = normalizeTrack(
      { contentDetails: { videoId: 'abc123', videoPublishedAt: '2026-10-10T10:00:00Z' }, snippet: { title: 'Song | Singer' } },
      { statistics: { viewCount: '1234567' }, contentDetails: { duration: 'PT3M30S' } },
      { name: 'Label', channelId: 'UC1', languages: ['hindi'], devotional: false }
    )
    expect(track).toMatchObject({ id: 'abc123', title: 'Song', artist: 'Singer', views: 1234567, duration: 210, languages: ['hindi'] })
    expect(track.thumbnail).toBe('https://i.ytimg.com/vi/abc123/mqdefault.jpg')
  })
})

describe('shapeCategory', () => {
  const NOW = Date.parse('2026-10-18T00:00:00Z')
  const day = 86400000
  const track = (id, title, daysAgo, views) => ({ id, title, artist: 'A', publishedAt: new Date(NOW - daysAgo * day).toISOString(), views })

  beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(NOW))
  afterEach(() => vi.restoreAllMocks())

  const tracks = [track('1', 'Old Hit', 400, 9_000_000), track('2', 'Fresh Love Song', 2, 50_000), track('3', 'Party Remix', 5, 400_000), track('4', 'Newest', 1, 10)]

  it('orders "latest" categories by publish date and removes duplicates', () => {
    const out = shapeCategory({ sort: 'latest' }, [...tracks, tracks[0]])
    expect(out.map((t) => t.id)).toEqual(['4', '2', '3', '1'])
  })

  it('applies mood keywords and view ordering', () => {
    const romantic = MUSIC_CATEGORIES.find((c) => c.id === 'romantic')
    expect(shapeCategory(romantic, tracks).map((t) => t.id)).toEqual(['2'])
    const party = MUSIC_CATEGORIES.find((c) => c.id === 'party')
    expect(shapeCategory(party, tracks).map((t) => t.id)).toEqual(['3'])
  })

  it('limits "trending" to recent uploads and weighs views by age', () => {
    const trending = MUSIC_CATEGORIES.find((c) => c.id === 'trending')
    expect(shapeCategory(trending, tracks).map((t) => t.id)).toEqual(['3', '2', '4'])
  })
})

describe('music configuration', () => {
  it('uses uploads playlists derived from verified channel ids', () => {
    MUSIC_CHANNELS.forEach((c) => {
      expect(c.channelId).toMatch(/^UC[\w-]{22}$/)
      expect(c.playlistId).toBe(`UU${c.channelId.slice(2)}`)
      expect(c.longFormPlaylistId).toBe(`UULF${c.channelId.slice(2)}`)
    })
  })

  it('keeps at least one embeddable label per language so every language shelf can play in the app', () => {
    MUSIC_LANGUAGES.forEach((language) => {
      const channels = MUSIC_CHANNELS.filter((c) => c.languages.includes(language.id) && !c.devotional)
      expect(channels.some((c) => c.embed), language.id).toBe(true)
    })
  })

  it('keeps devotional labels out of general categories and feeds the devotional shelf', () => {
    const hindi = MUSIC_CATEGORIES.find((c) => c.id === 'latest-hindi')
    expect(channelsFor(hindi).some((c) => c.devotional)).toBe(false)
    const devotional = MUSIC_CATEGORIES.find((c) => c.id === 'devotional')
    expect(channelsFor(devotional).every((c) => c.devotional)).toBe(true)
  })

  it('narrows channels by language', () => {
    const marathi = channelsFor({ languages: null }, 'marathi')
    expect(marathi.length).toBeGreaterThan(1)
    expect(marathi.every((c) => c.languages.includes('marathi'))).toBe(true)
  })
})
