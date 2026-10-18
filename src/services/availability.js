import { isUpcoming } from '../utils/dates'
import { languageLabel } from '../config/languages'
import { findCatalogTitle } from './catalog'
import { buildQueue, findPlayableSources } from './playback'
import { probeSource } from './playback/probe'
import { parseHlsTracks } from './playback/hlsTracks'

/**
 * What can a viewer actually do with a title?
 *   playable    streams on VM Flix from a licensed / public-domain source
 *   trailer     only the trailer can be watched here
 *   upcoming    not released yet
 *   unavailable nothing to watch right now
 */

/** Best YouTube trailer: official trailers first, then teasers, newest first. */
export const pickTrailer = (videos) => {
  const youtube = (videos?.results || []).filter((v) => v.site === 'YouTube' && v.key)
  const rank = (v) => (v.type === 'Trailer' ? 2 : v.type === 'Teaser' ? 1 : 0) * 10 + (v.official ? 5 : 0)
  return [...youtube].sort((a, b) => rank(b) - rank(a) || String(b.published_at).localeCompare(String(a.published_at)))[0] || null
}

export const resolveAvailability = async ({ mediaType, id, title, year, releaseDate, videos }, { signal } = {}) => {
  const upcoming = isUpcoming(releaseDate)
  const trailer = pickTrailer(videos)

  let queue = []
  let playableEpisodes = null
  if (!upcoming) {
    if (mediaType === 'tv') {
      const entry = await findCatalogTitle('tv', id)
      if (entry?.episodes.length) {
        playableEpisodes = new Set(entry.episodes.map((e) => `${e.season}x${e.episode}`))
        queue = buildQueue(entry.episodes.flatMap((e) => e.sources.map((s) => ({ ...s, provider: 'catalog', license: entry.license }))))
      }
    } else {
      const sources = await findPlayableSources({ mediaType, id, title, year }, { signal })
      queue = buildQueue(sources)
    }
  }

  let tracks = { audio: [], subtitles: [], maxHeight: 0 }
  const lead = queue[0]
  if (lead?.kind === 'hls') {
    const probe = await probeSource(lead, { signal })
    if (probe.manifest) tracks = parseHlsTracks(probe.manifest)
  } else if (lead) {
    tracks = {
      audio: lead.audioLanguage ? [{ lang: lead.audioLanguage, label: languageLabel(lead.audioLanguage) }] : [],
      subtitles: (lead.subtitles || []).map((s) => ({ lang: s.lang, label: s.label })),
      maxHeight: Math.max(...queue.map((s) => s.height || 0)),
    }
  }

  const status = upcoming ? 'upcoming' : queue.length ? 'playable' : trailer ? 'trailer' : 'unavailable'
  return {
    status,
    upcoming,
    trailer,
    sources: queue,
    playableEpisodes,
    license: queue[0]?.license || null,
    pageUrl: queue.find((s) => s.pageUrl)?.pageUrl || null,
    tracks,
    downloadable: queue.some((s) => s.downloadable),
  }
}
