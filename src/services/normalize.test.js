import { describe, expect, it } from 'vitest'
import { dedupeTitles, mergeTitles, normalizeList, normalizeTitle, sortTitles, titleKey, toStoredTitle } from './normalize'

const movie = (id, date, extra = {}) => ({ id, title: `Movie ${id}`, release_date: date, poster_path: `/p${id}.jpg`, vote_average: 7, genre_ids: [28], original_language: 'mr', popularity: id, ...extra })

describe('normalizeTitle', () => {
  it('maps TMDB fields and validates the date', () => {
    const t = normalizeTitle(movie(1, '2026-01-02'), 'movie')
    expect(t).toMatchObject({ id: 1, mediaType: 'movie', title: 'Movie 1', year: 2026, language: 'mr', posterPath: '/p1.jpg' })
    expect(normalizeTitle(movie(2, ''), 'movie').releaseDate).toBeNull()
  })

  it('infers TV from name / first_air_date and honours multi-search media_type', () => {
    expect(normalizeTitle({ id: 5, name: 'Show', first_air_date: '2020-01-01' }).mediaType).toBe('tv')
    expect(normalizeTitle({ id: 6, media_type: 'tv', name: 'S' }).mediaType).toBe('tv')
  })

  it('drops people and unknown types', () => {
    expect(normalizeTitle({ id: 1, media_type: 'person', name: 'Actor' })).toBeNull()
    expect(normalizeTitle(null)).toBeNull()
  })

  it('is idempotent so stored titles can be re-normalised', () => {
    const once = normalizeTitle(movie(3, '2025-06-06'), 'movie')
    expect(normalizeTitle(once)).toEqual(once)
  })

  it('reads genre ids from a details payload', () => {
    expect(normalizeTitle({ id: 9, title: 'X', genres: [{ id: 35 }, { id: 18 }] }, 'movie').genreIds).toEqual([35, 18])
  })
})

describe('lists', () => {
  it('removes duplicates, posterless entries and unreleased titles', () => {
    const list = normalizeList(
      [movie(1, '2026-01-01'), movie(1, '2026-01-01'), movie(2, '2099-01-01'), { ...movie(3, '2026-02-02'), poster_path: null }, movie(4, '2026-03-03')],
      'movie',
      { releasedBy: '2026-10-18' }
    )
    expect(list.map((t) => t.id)).toEqual([1, 4])
  })

  it('dedupes by media type and id', () => {
    const a = normalizeTitle({ id: 1, title: 'A', media_type: 'movie' })
    const b = normalizeTitle({ id: 1, name: 'B', media_type: 'tv' })
    expect(dedupeTitles([a, a, b])).toHaveLength(2)
    expect(titleKey(a)).toBe('movie:1')
  })

  it('keeps latest-first order after merging a second page', () => {
    const page1 = normalizeList([movie(1, '2026-09-01'), movie(2, '2026-03-01')], 'movie')
    const page2 = normalizeList([movie(3, '2026-06-01'), movie(4, '2025-12-01'), movie(1, '2026-09-01')], 'movie')
    expect(mergeTitles(page1, page2, 'latest').map((t) => t.id)).toEqual([1, 3, 2, 4])
  })

  it('sorts by rating then vote count and leaves "none" untouched', () => {
    const items = normalizeList([movie(1, '2026-01-01', { vote_average: 6, vote_count: 10 }), movie(2, '2026-01-01', { vote_average: 8, vote_count: 5 }), movie(3, '2026-01-01', { vote_average: 8, vote_count: 50 })], 'movie')
    expect(sortTitles(items, 'rating').map((t) => t.id)).toEqual([3, 2, 1])
    expect(sortTitles(items, 'none').map((t) => t.id)).toEqual([1, 2, 3])
  })
})

describe('toStoredTitle', () => {
  it('keeps only the fields needed for My List and progress', () => {
    const stored = toStoredTitle(movie(7, '2026-01-01', { overview: 'long text', popularity: 3 }))
    expect(Object.keys(stored).sort()).toEqual(['backdropPath', 'genreIds', 'id', 'language', 'mediaType', 'posterPath', 'rating', 'releaseDate', 'title', 'voteCount', 'year'])
  })
})
