import { validDate, compareReleaseDesc, compareReleaseAsc } from '../utils/dates'

/**
 * @typedef {Object} Title
 * @property {number} id
 * @property {'movie' | 'tv'} mediaType
 * @property {string} title
 * @property {string} overview
 * @property {string | null} posterPath
 * @property {string | null} backdropPath
 * @property {string | null} releaseDate  YYYY-MM-DD or null when unknown
 * @property {number | null} year
 * @property {number} rating  0-10
 * @property {number} voteCount
 * @property {number} popularity
 * @property {number[]} genreIds
 * @property {string} language  original language (ISO 639-1)
 */

export const titleKey = (item) => `${item.mediaType}:${item.id}`

/** Converts a TMDB result (or an already-normalised Title) into a Title. Returns null for people/unknown types. */
export const normalizeTitle = (raw, fallbackType) => {
  if (!raw || raw.id == null) return null
  const mediaType =
    raw.mediaType || raw.media_type || fallbackType || (raw.name || raw.first_air_date !== undefined ? 'tv' : 'movie')
  if (mediaType !== 'movie' && mediaType !== 'tv') return null
  const releaseDate = validDate(raw.releaseDate ?? raw.release_date ?? raw.first_air_date)
  return {
    id: raw.id,
    mediaType,
    title: raw.title || raw.name || raw.original_title || raw.original_name || 'Untitled',
    overview: raw.overview || '',
    posterPath: raw.posterPath ?? raw.poster_path ?? null,
    backdropPath: raw.backdropPath ?? raw.backdrop_path ?? null,
    releaseDate,
    year: releaseDate ? Number(releaseDate.slice(0, 4)) : null,
    rating: Number(raw.rating ?? raw.vote_average) || 0,
    voteCount: raw.voteCount ?? raw.vote_count ?? 0,
    popularity: raw.popularity || 0,
    genreIds: raw.genreIds || raw.genre_ids || (raw.genres ? raw.genres.map((g) => g.id) : []),
    language: raw.language || raw.original_language || '',
  }
}

export const dedupeTitles = (list) => {
  const seen = new Set()
  return list.filter((item) => {
    const key = titleKey(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * Normalises a TMDB `results` array: drops people, entries without art, duplicates and (optionally) unreleased titles.
 * @param {any[]} results
 * @param {'movie' | 'tv'} [fallbackType]
 * @param {{ requirePoster?: boolean, releasedBy?: string | null }} [options]
 * @returns {Title[]}
 */
export const normalizeList = (results, fallbackType, { requirePoster = true, releasedBy = null } = {}) => {
  const items = (results || [])
    .map((raw) => normalizeTitle(raw, fallbackType))
    .filter(Boolean)
    .filter((item) => (requirePoster ? !!item.posterPath : true))
    .filter((item) => (releasedBy ? !!item.releaseDate && item.releaseDate <= releasedBy : true))
  return dedupeTitles(items)
}

const COMPARATORS = {
  latest: compareReleaseDesc,
  year_desc: compareReleaseDesc,
  year_asc: compareReleaseAsc,
  popularity: (a, b) => b.popularity - a.popularity,
  rating: (a, b) => b.rating - a.rating || b.voteCount - a.voteCount,
}

/** Stable client-side sort that mirrors the server-side sort keys. `none` keeps the incoming order. */
export const sortTitles = (list, sort = 'popularity') => {
  if (sort === 'none') return [...list]
  return [...list].sort(COMPARATORS[sort] || COMPARATORS.popularity)
}

/** Appends new items, skipping ones already present, then re-applies the sort so merged pages stay ordered. */
export const mergeTitles = (existing, incoming, sort) => sortTitles(dedupeTitles([...existing, ...incoming]), sort)

/** Compact record used for My List / Continue Watching persistence. */
export const toStoredTitle = (item) => {
  const t = normalizeTitle(item)
  return {
    id: t.id,
    mediaType: t.mediaType,
    title: t.title,
    posterPath: t.posterPath,
    backdropPath: t.backdropPath,
    releaseDate: t.releaseDate,
    year: t.year,
    rating: t.rating,
    voteCount: t.voteCount,
    language: t.language,
    genreIds: t.genreIds,
  }
}
