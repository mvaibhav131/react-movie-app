import { fetchData } from '../utils/api'
import { todayISO, addDaysISO, addYearsISO } from '../utils/dates'
import { IN_OTT_PROVIDERS } from '../config/languages'
import { normalizeList, sortTitles, mergeTitles, dedupeTitles } from './normalize'

export const SORT_OPTIONS = [
  { value: 'latest', label: 'Latest' },
  { value: 'popularity', label: 'Popularity' },
  { value: 'rating', label: 'Rating' },
  { value: 'year_desc', label: 'Release year (newest)' },
  { value: 'year_asc', label: 'Release year (oldest)' },
]

const SORT_PARAM = {
  movie: {
    latest: 'primary_release_date.desc',
    popularity: 'popularity.desc',
    rating: 'vote_average.desc',
    year_desc: 'primary_release_date.desc',
    year_asc: 'primary_release_date.asc',
  },
  tv: {
    latest: 'first_air_date.desc',
    popularity: 'popularity.desc',
    rating: 'vote_average.desc',
    year_desc: 'first_air_date.desc',
    year_asc: 'first_air_date.asc',
  },
}

const SMALL_CATALOGUE = new Set(['mr', 'bh'])
const MID_CATALOGUE = new Set(['ta', 'te', 'kn', 'ml', 'bn', 'pa', 'gu'])

/** Rating sorts need a vote floor or 10/10 titles with a single vote dominate. */
const minVotesFor = (sort, language) => {
  if (sort !== 'rating') return 1
  if (SMALL_CATALOGUE.has(language)) return 10
  if (MID_CATALOGUE.has(language)) return 50
  return 300
}

/**
 * Builds /discover query params. Every list excludes unreleased titles unless `upcoming` is set,
 * so "Latest" never mixes in future-dated entries.
 */
export const buildDiscoverParams = ({
  mediaType = 'movie',
  language,
  genres = [],
  year,
  sort = 'popularity',
  page = 1,
  upcoming = false,
  ott = false,
  since,
  until,
  minVotes,
  releaseType,
  originCountry,
  today = todayISO(),
} = {}) => {
  const dateField = mediaType === 'movie' ? 'primary_release_date' : 'first_air_date'
  const params = {
    include_adult: false,
    include_video: false,
    page,
    sort_by: SORT_PARAM[mediaType][sort] || SORT_PARAM[mediaType].popularity,
    with_original_language: language,
    with_origin_country: originCountry,
    with_genres: genres.length ? genres.join('|') : undefined,
    'vote_count.gte': upcoming ? undefined : minVotes ?? minVotesFor(sort, language),
  }

  if (upcoming) {
    params[`${dateField}.gte`] = addDaysISO(today, 1)
    if (until) params[`${dateField}.lte`] = until
    // Popular upcoming titles are the useful ones; date order is applied locally afterwards.
    params.sort_by = sort === 'latest' || sort === 'year_asc' ? `${dateField}.asc` : 'popularity.desc'
    if (mediaType === 'movie') params.with_release_type = releaseType || '2|3'
  } else {
    params[`${dateField}.lte`] = until && until < today ? until : today
    if (since) params[`${dateField}.gte`] = since
    if (mediaType === 'movie') {
      params['with_runtime.gte'] = 60
      if (releaseType) params.with_release_type = releaseType
    }
  }

  if (year) {
    if (mediaType === 'movie') params.primary_release_year = year
    else params.first_air_date_year = year
  }

  if (ott) {
    params.watch_region = 'IN'
    params.with_watch_providers = IN_OTT_PROVIDERS.join('|')
    params.with_watch_monetization_types = 'flatrate'
    if (mediaType === 'tv') {
      params.with_type = '4|2'
      params.without_genres = '10767,10763'
    }
  }
  return params
}

/**
 * @param {Parameters<typeof buildDiscoverParams>[0]} options
 * @param {{ signal?: AbortSignal }} [fetchOptions]
 * @returns {Promise<{ results: import('./normalize').Title[], page: number, totalPages: number, totalResults: number }>}
 */
export const discoverTitles = async (options = {}, fetchOptions = {}) => {
  const mediaType = options.mediaType || 'movie'
  const today = options.today || todayISO()
  const params = buildDiscoverParams({ ...options, mediaType, today })
  const data = await fetchData(`/discover/${mediaType}`, params, fetchOptions)
  const upcoming = !!options.upcoming
  const results = normalizeList(data.results, mediaType, { releasedBy: upcoming ? null : today })
  const sort = upcoming ? 'year_asc' : options.sort || 'popularity'
  return {
    results: sortTitles(results, sort),
    page: data.page || 1,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || 0,
  }
}

/** Fetches the same page from several languages and merges them into one correctly ordered list. */
export const discoverAcrossLanguages = async (languages, options = {}, fetchOptions = {}) => {
  const settled = await Promise.allSettled(
    languages.map((language) => discoverTitles({ ...options, language }, fetchOptions))
  )
  const ok = settled.filter((s) => s.status === 'fulfilled').map((s) => s.value)
  if (!ok.length) throw settled.find((s) => s.status === 'rejected')?.reason || new Error('No results')
  return {
    results: mergeTitles([], ok.flatMap((r) => r.results), options.sort || 'popularity'),
    page: Math.max(...ok.map((r) => r.page)),
    totalPages: Math.max(...ok.map((r) => r.totalPages)),
    totalResults: ok.reduce((sum, r) => sum + r.totalResults, 0),
  }
}

/** Generic wrapper for TMDB list endpoints (/trending, /movie/top_rated, /tv/popular ...). */
export const fetchList = async (path, params = {}, fetchOptions = {}, fallbackType) => {
  const data = await fetchData(path, params, fetchOptions)
  return {
    results: normalizeList(data.results, fallbackType),
    page: data.page || 1,
    totalPages: Math.min(data.total_pages || 1, 500),
    totalResults: data.total_results || 0,
  }
}

export const searchTitles = async (query, { page = 1, mediaType = 'multi', signal } = {}) => {
  const q = query.trim()
  if (!q) return { results: [], page: 1, totalPages: 0, totalResults: 0 }
  const data = await fetchData(`/search/${mediaType}`, { query: q, page, include_adult: false }, { signal })
  return {
    results: normalizeList(data.results, mediaType === 'multi' ? undefined : mediaType, { requirePoster: false }),
    page: data.page || 1,
    totalPages: data.total_pages || 0,
    totalResults: data.total_results || 0,
  }
}

/**
 * TMDB search cannot filter by language, so scan a few result pages and keep titles whose
 * original language matches. Stops early once `limit` matches are found.
 */
export const searchWithinLanguage = async (query, language, { mediaType = 'movie', limit = 24, maxPages = 4, signal } = {}) => {
  const matches = []
  let totalPages = 1
  for (let page = 1; page <= Math.min(maxPages, totalPages) && matches.length < limit; page += 1) {
    const res = await searchTitles(query, { page, mediaType, signal })
    totalPages = res.totalPages
    matches.push(...res.results.filter((item) => item.language === language))
    if (!res.results.length) break
  }
  return dedupeTitles(matches)
}

/** Windows used by "Latest" rails that want recent but not obscure titles. */
export const recentWindow = (days) => addDaysISO(todayISO(), -days)
export const yearsAgo = (years) => addYearsISO(todayISO(), -years)
