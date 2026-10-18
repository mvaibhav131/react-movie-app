import { beforeEach, describe, expect, it, vi } from 'vitest'
import { rankSources } from './ranking'
import { parseHlsTracks } from './hlsTracks'
import { markFailed, hasFailed, clearFailures } from './failures'
import { sourcesFromFiles, titleMatches } from './providers/archiveProvider'

vi.mock('./capabilities', () => ({ supportsSource: (s) => s.kind !== 'webm' }))

const src = (id, kind, extra = {}) => ({ id, kind, url: `https://cdn.example/${id}`, provider: 'catalog', ...extra })

describe('rankSources', () => {
  it('prefers adaptive HLS over progressive files', () => {
    const ranked = rankSources([src('mp4', 'mp4', { height: 1080 }), src('hls', 'hls')])
    expect(ranked[0].id).toBe('hls')
  })

  it('picks the highest resolution for "auto" and the closest to a preference otherwise', () => {
    const files = [src('a', 'mp4', { height: 360 }), src('b', 'mp4', { height: 720 }), src('c', 'mp4', { height: 1080 })]
    expect(rankSources(files, { quality: 'auto' })[0].id).toBe('c')
    expect(rankSources(files, { quality: '720' })[0].id).toBe('b')
    expect(rankSources(files, { quality: '480' })[0].id).toBe('a')
  })

  it('trusts the catalogue over the Internet Archive when everything else is equal', () => {
    const ranked = rankSources([src('arc', 'mp4', { height: 480, provider: 'archive' }), src('cat', 'mp4', { height: 480 })])
    expect(ranked[0].id).toBe('cat')
  })
})

describe('failure memory', () => {
  beforeEach(() => clearFailures())

  it('remembers failed sources so they are not retried', () => {
    const s = src('x', 'mp4')
    expect(hasFailed(s)).toBe(false)
    markFailed(s)
    expect(hasFailed(s)).toBe(true)
    expect(hasFailed(src('y', 'mp4'))).toBe(false)
  })
})

describe('buildQueue', () => {
  beforeEach(() => clearFailures())

  it('drops unsupported formats and sources that already failed', async () => {
    const { buildQueue } = await import('./index')
    const sources = [src('hls', 'hls'), src('webm', 'webm', { height: 720 }), src('mp4', 'mp4', { height: 480 })]
    markFailed(sources[0])
    expect(buildQueue(sources).map((s) => s.id)).toEqual(['mp4'])
  })
})

describe('HLS manifest parsing', () => {
  const manifest = [
    '#EXTM3U',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="en",NAME="English",DEFAULT=YES',
    '#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID="a",LANGUAGE="hi",NAME="Hindi"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="t",LANGUAGE="es",NAME="Spanish; Castilian",URI="es.m3u8"',
    '#EXT-X-MEDIA:TYPE=SUBTITLES,GROUP-ID="t",LANGUAGE="fr",NAME="French",URI="fr.m3u8"',
    '#EXT-X-STREAM-INF:BANDWIDTH=900000,RESOLUTION=640x360,AUDIO="a"',
    'low.m3u8',
    '#EXT-X-STREAM-INF:BANDWIDTH=3000000,RESOLUTION=1920x1080,AUDIO="a"',
    'high.m3u8',
  ].join('\n')

  it('reads audio languages, subtitle languages (names with commas/semicolons) and the top resolution', () => {
    const tracks = parseHlsTracks(manifest)
    expect(tracks.audio.map((t) => t.lang)).toEqual(['en', 'hi'])
    expect(tracks.subtitles.map((t) => t.label)).toEqual(['Spanish; Castilian', 'French'])
    expect(tracks.maxHeight).toBe(1080)
  })

  it('copes with empty or invalid manifests', () => {
    expect(parseHlsTracks('')).toEqual({ audio: [], subtitles: [], maxHeight: 0 })
    expect(parseHlsTracks(undefined).maxHeight).toBe(0)
  })
})

describe('Internet Archive matching', () => {
  it('requires the same title once articles, years and punctuation are ignored', () => {
    expect(titleMatches('Night of the Living Dead', 'Night of the Living Dead')).toBe(true)
    expect(titleMatches('Nosferatu (1922)', 'Nosferatu')).toBe(true)
    expect(titleMatches('The General', 'General')).toBe(true)
    expect(titleMatches('Avatar: The Way of Water', 'Avatar')).toBe(false)
    expect(titleMatches('Nosferatu, eine Symphonie des Grauens', 'Nosferatu')).toBe(false)
  })

  it('builds playable MP4 sources from item files and encodes nested paths', () => {
    const files = [
      { name: 'Content/movie.mp4', format: 'h.264', height: '720', size: '1000', source: 'derivative' },
      { name: 'movie_512kb.mp4', format: '512Kb MPEG4', size: '500' },
      { name: 'movie.ogv', format: 'Ogg Video' },
      { name: 'secret.mp4', format: 'h.264', private: 'true' },
    ]
    const out = sourcesFromFiles('some id', files, { name: 'Public domain' })
    expect(out.map((s) => s.label)).toEqual(['720p', '512Kb MPEG4'])
    expect(out[0].url).toBe('https://archive.org/download/some%20id/Content/movie.mp4')
    expect(out.every((s) => s.provider === 'archive' && s.downloadable === false)).toBe(true)
  })
})
