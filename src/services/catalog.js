import { CATALOG_URL } from '../config/env'
import { safeHttpsUrl } from '../utils/url'
import { validDate } from '../utils/dates'

/**
 * Licensed-content manifest.
 *
 * VM Flix only plays titles listed here (plus public-domain items resolved from the Internet Archive).
 * Add entries only for content you hold the rights to stream, or that carries an open licence.
 *
 * @typedef {Object} CatalogSource
 * @property {string} id
 * @property {'hls' | 'mp4' | 'webm'} kind
 * @property {string} url                    https URL
 * @property {string} [label]                shown in the quality menu, e.g. "480p"
 * @property {number} [height]               vertical resolution for progressive files
 * @property {number} [size]                 bytes, for download size display
 * @property {string} [audioLanguage]        ISO 639-1
 * @property {boolean} [downloadable]        true only if the licence AND the host allow saving the file
 * @property {Array<{ lang: string, label: string, url: string }>} [subtitles]   WebVTT files served with CORS
 *
 * @typedef {Object} CatalogTitle
 * @property {number} tmdbId
 * @property {'movie' | 'tv'} mediaType
 * @property {string} addedAt                YYYY-MM-DD
 * @property {{ name: string, url?: string, credit?: string }} license
 * @property {CatalogSource[]} [sources]
 * @property {Array<{ season: number, episode: number, sources: CatalogSource[] }>} [episodes]
 */

const KINDS = new Set(['hls', 'mp4', 'webm'])
const RETRY_AFTER_MS = 30_000

const sanitizeSource = (raw, index) => {
  const url = safeHttpsUrl(raw?.url)
  if (!url || !KINDS.has(raw?.kind)) return null
  return {
    id: String(raw.id || `src-${index}`),
    kind: raw.kind,
    url,
    label: raw.label || '',
    height: Number(raw.height) || undefined,
    size: Number(raw.size) || undefined,
    audioLanguage: raw.audioLanguage || undefined,
    downloadable: raw.downloadable === true && raw.kind !== 'hls',
    subtitles: (raw.subtitles || [])
      .map((s) => ({ lang: String(s.lang || ''), label: String(s.label || s.lang || ''), url: safeHttpsUrl(s.url) }))
      .filter((s) => s.url && s.lang),
  }
}

const sanitizeSources = (list) => (Array.isArray(list) ? list.map(sanitizeSource).filter(Boolean) : [])

/** @returns {{ titles: CatalogTitle[] }} */
export const sanitizeCatalog = (raw) => {
  const titles = (Array.isArray(raw?.titles) ? raw.titles : [])
    .filter((t) => Number.isInteger(t?.tmdbId) && (t.mediaType === 'movie' || t.mediaType === 'tv'))
    .map((t) => ({
      tmdbId: t.tmdbId,
      mediaType: t.mediaType,
      addedAt: validDate(t.addedAt) || '1970-01-01',
      license: { name: String(t.license?.name || 'Licensed'), url: safeHttpsUrl(t.license?.url) || undefined, credit: t.license?.credit },
      sources: sanitizeSources(t.sources),
      episodes: (Array.isArray(t.episodes) ? t.episodes : [])
        .map((e) => ({ season: Number(e.season), episode: Number(e.episode), sources: sanitizeSources(e.sources) }))
        .filter((e) => e.season >= 0 && e.episode >= 0 && e.sources.length),
    }))
    .filter((t) => t.sources.length || t.episodes.length)
  return { titles }
}

let cache = null
let failedAt = 0

export const loadCatalog = async ({ force = false } = {}) => {
  if (cache && !force) return cache
  if (!force && failedAt && Date.now() - failedAt < RETRY_AFTER_MS) return { titles: [] }
  cache = fetch(CATALOG_URL, { cache: 'no-cache' })
    .then((res) => {
      if (!res.ok) throw new Error(`Catalogue request failed (${res.status})`)
      return res.json()
    })
    .then(sanitizeCatalog)
    .catch(() => {
      cache = null
      failedAt = Date.now()
      return { titles: [] }
    })
  return cache
}

/** Newest additions first. */
export const listCatalogTitles = async () => {
  const { titles } = await loadCatalog()
  return [...titles].sort((a, b) => (a.addedAt < b.addedAt ? 1 : a.addedAt > b.addedAt ? -1 : b.tmdbId - a.tmdbId))
}

export const findCatalogTitle = async (mediaType, id) => {
  const { titles } = await loadCatalog()
  return titles.find((t) => t.mediaType === mediaType && t.tmdbId === Number(id)) || null
}

/** Sources for a movie, or for one episode of a series. */
export const catalogSourcesFor = async ({ mediaType, id, season, episode }) => {
  const entry = await findCatalogTitle(mediaType, id)
  if (!entry) return { entry: null, sources: [] }
  if (mediaType === 'tv') {
    const match = entry.episodes.find((e) => e.season === Number(season) && e.episode === Number(episode))
    return { entry, sources: match?.sources || [] }
  }
  return { entry, sources: entry.sources }
}
