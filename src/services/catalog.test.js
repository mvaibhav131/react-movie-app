import { afterEach, describe, expect, it, vi } from 'vitest'
import { sanitizeCatalog } from './catalog'

describe('sanitizeCatalog', () => {
  const entry = (overrides = {}) => ({
    tmdbId: 1,
    mediaType: 'movie',
    addedAt: '2026-10-18',
    license: { name: 'CC BY', url: 'https://creativecommons.org/licenses/by/3.0/' },
    sources: [{ id: 'a', kind: 'mp4', url: 'https://cdn.example/a.mp4', height: 720 }],
    ...overrides,
  })

  it('keeps well-formed entries', () => {
    const { titles } = sanitizeCatalog({ titles: [entry()] })
    expect(titles).toHaveLength(1)
    expect(titles[0].sources[0]).toMatchObject({ id: 'a', kind: 'mp4', height: 720, downloadable: false })
  })

  it('rejects insecure, credentialed and scripted URLs and unknown formats', () => {
    const bad = entry({
      sources: [
        { id: 'http', kind: 'mp4', url: 'http://cdn.example/a.mp4' },
        { id: 'js', kind: 'mp4', url: 'javascript:alert(1)' },
        { id: 'cred', kind: 'mp4', url: 'https://user:pw@cdn.example/a.mp4' },
        { id: 'dash', kind: 'dash', url: 'https://cdn.example/a.mpd' },
      ],
    })
    expect(sanitizeCatalog({ titles: [bad] }).titles).toHaveLength(0)
  })

  it('only honours downloadable on progressive files', () => {
    const { titles } = sanitizeCatalog({
      titles: [
        entry({
          sources: [
            { id: 'p', kind: 'webm', url: 'https://cdn.example/p.webm', downloadable: true },
            { id: 'h', kind: 'hls', url: 'https://cdn.example/h.m3u8', downloadable: true },
          ],
        }),
      ],
    })
    expect(titles[0].sources.map((s) => s.downloadable)).toEqual([true, false])
  })

  it('drops entries with a bad id or type and tolerates garbage input', () => {
    expect(sanitizeCatalog({ titles: [entry({ tmdbId: 'x' }), entry({ mediaType: 'person' })] }).titles).toHaveLength(0)
    expect(sanitizeCatalog(null).titles).toEqual([])
    expect(sanitizeCatalog({ titles: 'nope' }).titles).toEqual([])
  })

  it('supports episodic content', () => {
    const { titles } = sanitizeCatalog({
      titles: [{ tmdbId: 2, mediaType: 'tv', addedAt: '2026-01-01', episodes: [{ season: 1, episode: 2, sources: [{ id: 'e', kind: 'mp4', url: 'https://cdn.example/e.mp4' }] }] }],
    })
    expect(titles[0].episodes[0]).toMatchObject({ season: 1, episode: 2 })
  })
})

describe('catalogue loading', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.resetModules()
  })

  it('lists newest additions first and finds titles by id', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          titles: [entry(1, '2026-01-01'), entry(2, '2026-10-01'), entry(3, '2026-10-01')],
        }),
      }))
    )
    function entry(id, addedAt) {
      return { tmdbId: id, mediaType: 'movie', addedAt, sources: [{ id: `s${id}`, kind: 'mp4', url: `https://cdn.example/${id}.mp4` }] }
    }
    const { listCatalogTitles, findCatalogTitle } = await import('./catalog')
    expect((await listCatalogTitles()).map((t) => t.tmdbId)).toEqual([3, 2, 1])
    expect((await findCatalogTitle('movie', '2'))?.tmdbId).toBe(2)
    expect(await findCatalogTitle('tv', 2)).toBeNull()
  })

  it('degrades to an empty catalogue when the manifest cannot be loaded', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404 })))
    const { listCatalogTitles } = await import('./catalog')
    expect(await listCatalogTitles()).toEqual([])
  })
})
