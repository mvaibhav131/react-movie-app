import { afterEach, describe, expect, it, vi } from 'vitest'
import { findFreeMovie, freeMovieToTitle, isInLanguage, listFreeMovies, loadFreeMovies, sanitizeFreeIndex } from './index'
import { buildQueue } from '../playback'
import { youtubeProvider } from '../playback/providers/youtubeProvider'

const raw = {
  version: 1,
  generatedAt: '2026-10-18',
  channels: ['Pen Movies', 'Goldmines'],
  movies: [
    { id: 11, t: 'Drishyam 2', p: '/a.jpg', d: '2022-11-18', l: 'hi', r: 7.4, s: [['abcdefghijk', 0, 140]] },
    { id: 12, t: 'Pushpa', p: '/b.jpg', d: '2021-12-17', l: 'te', r: 7, s: [['bbbbbbbbbbb', 1, 175, 'hi'], ['bad id!', 1, 170]] },
    { id: 13, t: 'No playable video', p: '/c.jpg', d: '2020-01-01', l: 'hi', r: 5, s: [['short', 0, 100]] },
    { id: 'x', t: 'Bad id', p: '/d.jpg', d: '2020-01-01', s: [['ccccccccccc', 0, 90]] },
  ],
}

afterEach(() => vi.unstubAllGlobals())

describe('sanitizeFreeIndex', () => {
  it('keeps valid films and maps channel names, dubs and video ids', () => {
    const { movies, generatedAt } = sanitizeFreeIndex(raw)
    expect(generatedAt).toBe('2026-10-18')
    expect(movies.map((m) => m.id)).toEqual([11, 12])
    expect(movies[0].sources[0]).toMatchObject({ videoId: 'abcdefghijk', channel: 'Pen Movies', minutes: 140 })
    expect(movies[1].sources).toEqual([{ videoId: 'bbbbbbbbbbb', channel: 'Goldmines', minutes: 175, dubbed: 'hi' }])
  })

  it('survives garbage', () => {
    expect(sanitizeFreeIndex(null).movies).toEqual([])
    expect(sanitizeFreeIndex({ movies: 'nope' }).movies).toEqual([])
  })
})

describe('language and listing', () => {
  const [drishyam, pushpa] = sanitizeFreeIndex(raw).movies

  it('counts Hindi dubs as Hindi', () => {
    expect(isInLanguage(pushpa, 'hi')).toBe(true)
    expect(isInLanguage(pushpa, 'te')).toBe(true)
    expect(isInLanguage(drishyam, 'te')).toBe(false)
    expect(isInLanguage(drishyam, '')).toBe(true)
  })

  it('filters by language and title', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => raw })))
    await loadFreeMovies({ force: true })
    expect((await listFreeMovies({ language: 'hi' })).map((m) => m.id)).toEqual([11, 12])
    expect((await listFreeMovies({ language: 'te' })).map((m) => m.id)).toEqual([12])
    expect((await listFreeMovies({ query: 'drish' })).map((m) => m.id)).toEqual([11])
  })

  it('turns a film into a card-ready title', () => {
    expect(freeMovieToTitle(drishyam)).toMatchObject({ id: 11, mediaType: 'movie', title: 'Drishyam 2', posterPath: '/a.jpg', year: 2022, language: 'hi' })
  })
})

describe('youtube provider', () => {
  it('offers the official-channel uploads as youtube sources', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => raw })))
    await loadFreeMovies({ force: true })
    expect((await findFreeMovie(12))?.title).toBe('Pushpa')

    const sources = await youtubeProvider.findSources({ mediaType: 'movie', id: 12 })
    expect(sources).toHaveLength(1)
    expect(sources[0]).toMatchObject({ kind: 'youtube', provider: 'youtube', videoId: 'bbbbbbbbbbb', url: 'https://www.youtube.com/watch?v=bbbbbbbbbbb', audioLanguage: 'hi' })
    expect(sources[0].license.credit).toBe('Goldmines')

    expect(await youtubeProvider.findSources({ mediaType: 'movie', id: 999 })).toEqual([])
    expect(await youtubeProvider.findSources({ mediaType: 'tv', id: 12 })).toEqual([])
  })

  it('lets youtube sources into the playback queue', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => raw })))
    await loadFreeMovies({ force: true })
    const queue = buildQueue(await youtubeProvider.findSources({ mediaType: 'movie', id: 11 }))
    expect(queue).toHaveLength(1)
    expect(queue[0].kind).toBe('youtube')
  })
})
