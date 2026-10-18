import { FREE_MOVIES_URL } from '../../config/env'
import { validDate } from '../../utils/dates'
import { normalizeTitle } from '../normalize'

/**
 * Films that official YouTube channels publish for free, matched to TMDB ids by scripts/buildFreeMovies.mjs.
 * They play through YouTube's own embedded player; nothing is hosted or re-streamed by VM Flix.
 *
 * @typedef {Object} FreeSource
 * @property {string} videoId
 * @property {string} channel        name of the official channel
 * @property {number} minutes
 * @property {'hi'} [dubbed]         set when the upload is titled as a Hindi dub
 *
 * @typedef {Object} FreeMovie
 * @property {number} id             TMDB id
 * @property {string} title
 * @property {string} posterPath
 * @property {string} releaseDate    YYYY-MM-DD
 * @property {string} language       original language
 * @property {number} rating
 * @property {FreeSource[]} sources  best first
 */

const VIDEO_ID = /^[\w-]{11}$/
const RETRY_AFTER_MS = 30_000

/** @returns {{ generatedAt: string, movies: FreeMovie[] }} */
export const sanitizeFreeIndex = (raw) => {
  const channels = Array.isArray(raw?.channels) ? raw.channels.map(String) : []
  const movies = (Array.isArray(raw?.movies) ? raw.movies : [])
    .filter((m) => Number.isInteger(m?.id) && typeof m.t === 'string' && typeof m.p === 'string' && validDate(m.d))
    .map((m) => ({
      id: m.id,
      title: m.t,
      posterPath: m.p,
      releaseDate: m.d,
      language: String(m.l || ''),
      rating: Number(m.r) || 0,
      sources: (Array.isArray(m.s) ? m.s : [])
        .filter((s) => Array.isArray(s) && VIDEO_ID.test(s[0]))
        .map((s) => ({ videoId: s[0], channel: channels[s[1]] || 'YouTube', minutes: Number(s[2]) || 0, dubbed: s[3] === 'hi' ? 'hi' : undefined })),
    }))
    .filter((m) => m.sources.length)
  return { generatedAt: validDate(raw?.generatedAt) || '', movies }
}

let cache = null
let failedAt = 0

export const loadFreeMovies = async ({ force = false } = {}) => {
  if (cache && !force) return cache
  if (!force && failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return { generatedAt: '', movies: [] }
  cache = fetch(FREE_MOVIES_URL, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`Free movie index request failed (${res.status})`)
      return res.json()
    })
    .then(sanitizeFreeIndex)
    .catch(() => {
      cache = null
      failedAt = Date.now()
      return { generatedAt: '', movies: [] }
    })
  return cache
}

/** @returns {Promise<FreeMovie | null>} */
export const findFreeMovie = async (tmdbId) => {
  const { movies } = await loadFreeMovies()
  return movies.find((m) => m.id === Number(tmdbId)) || null
}

export const FREE_LANGUAGES = [
  { code: 'hi', label: 'Hindi' },
  { code: 'mr', label: 'Marathi' },
  { code: 'ta', label: 'Tamil' },
  { code: 'te', label: 'Telugu' },
  { code: 'kn', label: 'Kannada' },
  { code: 'ml', label: 'Malayalam' },
  { code: 'en', label: 'English' },
]

/** Hindi includes Hindi-dubbed uploads of films from other languages. */
export const isInLanguage = (movie, code) => !code || movie.language === code || (code === 'hi' && movie.sources.some((s) => s.dubbed === 'hi'))

/** Newest first. `language` is an ISO code or '' for every language. */
export const listFreeMovies = async ({ language = '', query = '' } = {}) => {
  const { movies } = await loadFreeMovies()
  const needle = query.trim().toLowerCase()
  return movies.filter((m) => isInLanguage(m, language) && (!needle || m.title.toLowerCase().includes(needle)))
}

/** A Title (same shape as TMDB results) so cards and rails can render it. */
export const freeMovieToTitle = (movie) =>
  normalizeTitle({ id: movie.id, title: movie.title, poster_path: movie.posterPath, release_date: movie.releaseDate, vote_average: movie.rating, original_language: movie.language }, 'movie')
