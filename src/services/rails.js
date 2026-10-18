import { discoverTitles, fetchList } from './discover'
import { fetchData } from '../utils/api'
import { normalizeTitle, dedupeTitles, titleKey, sortTitles } from './normalize'
import { listCatalogTitles } from './catalog'
import { freeMovieToTitle, listFreeMovies } from './freeMovies'

/**
 * Loaders for the curated rails. Each one resolves { results: Title[] } and takes an AbortSignal,
 * so they can be passed straight to <TitleRail load=... />.
 */
export const rails = {
  latestReleased: (signal) => discoverTitles({ mediaType: 'movie', sort: 'latest', minVotes: 5, releaseType: '2|3' }, { signal }),

  bollywood: (signal) => discoverTitles({ mediaType: 'movie', language: 'hi', sort: 'latest', minVotes: 3 }, { signal }),

  hollywood: (signal) =>
    discoverTitles({ mediaType: 'movie', language: 'en', originCountry: 'US', sort: 'latest', minVotes: 15, releaseType: '3' }, { signal }),

  byLanguage: (language, sort = 'latest') => (signal) => discoverTitles({ mediaType: 'movie', language, sort, minVotes: 1 }, { signal }),

  latestHindiWebSeries: (signal) => discoverTitles({ mediaType: 'tv', ott: true, language: 'hi', sort: 'latest', minVotes: 1 }, { signal }),

  latestHindiTv: (signal) => discoverTitles({ mediaType: 'tv', language: 'hi', sort: 'latest', minVotes: 1 }, { signal }),

  topRatedMovies: (signal) => fetchList('/movie/top_rated', {}, { signal }, 'movie'),

  comingSoon: (signal) => discoverTitles({ mediaType: 'movie', upcoming: true, sort: 'popularity', minVotes: undefined }, { signal }),
}

/** Newest films that play free on VM Flix (from the official-channel index). */
export const loadFreeRail = (language) => async () => ({
  results: (await listFreeMovies({ language })).slice(0, 20).map(freeMovieToTitle).filter(Boolean),
})

/** Titles available to play on VM Flix (from the licensed catalogue), newest first. */
export const loadCatalogRail = async (signal) => {
  const entries = await listCatalogTitles()
  const settled = await Promise.allSettled(entries.map((entry) => fetchData(`/${entry.mediaType}/${entry.tmdbId}`, undefined, { signal })))
  const results = []
  settled.forEach((outcome, i) => {
    if (outcome.status !== 'fulfilled') return
    const title = normalizeTitle({ ...outcome.value, media_type: entries[i].mediaType })
    if (title?.posterPath) results.push(title)
  })
  return { results }
}

/**
 * Recommendations seeded from what the viewer saved or watched, topped up with their preferred language.
 * `seeds` are Title-like objects; `exclude` is a Set of title keys to omit.
 */
export const loadRecommendations = async ({ seeds, language, exclude }, signal) => {
  const lists = await Promise.allSettled(
    seeds.slice(0, 4).map((seed) => fetchList(`/${seed.mediaType}/${seed.id}/recommendations`, {}, { signal }, seed.mediaType))
  )
  const pool = lists.filter((l) => l.status === 'fulfilled').flatMap((l) => l.value.results)
  if (language && language !== 'any') {
    try {
      const extra = await discoverTitles({ mediaType: 'movie', language, sort: 'popularity', minVotes: 20 }, { signal })
      pool.push(...extra.results)
    } catch {
      /* optional top-up */
    }
  }
  const unique = dedupeTitles(pool).filter((t) => !exclude.has(titleKey(t)))
  return { results: sortTitles(unique, 'popularity').slice(0, 20) }
}
