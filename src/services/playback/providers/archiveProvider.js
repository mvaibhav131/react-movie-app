import { normalizeText } from '../../../utils/url'
import { session } from '../../../utils/storage'

/**
 * Internet Archive provider: public-domain / openly licensed feature films only.
 *
 * Safeguards, because the Archive also hosts uploads that are not cleared for streaming:
 *  - searches the curated `feature_films` collection only
 *  - requires an exact normalised title match AND a release year within one year
 *  - requires a public-domain or Creative Commons `licenseurl` on the item
 */
const SEARCH_URL = 'https://archive.org/advancedsearch.php'
const META_URL = 'https://archive.org/metadata'
const CACHE_PREFIX = 'vmflix:archive:'
const CACHE_TTL_MS = 60 * 60 * 1000
const MIN_AGE_YEARS = 25
const OPEN_LICENSE = /creativecommons\.org\/(publicdomain|licenses)\//i
const MP4_FORMATS = new Set(['512Kb MPEG4', 'MPEG4', 'h.264', 'h.264 HD', 'HD MPEG4', 'h.264 IA'])

const stripYear = (text) => normalizeText(text).replace(/\b(18|19|20)\d{2}\b/g, '').replace(/\s+/g, ' ').trim()

export const titleMatches = (candidate, wanted) => {
  const a = stripYear(candidate)
  const b = stripYear(wanted)
  return !!a && a === b
}

const encodePath = (name) => name.split('/').map(encodeURIComponent).join('/')

export const sourcesFromFiles = (identifier, files, license) =>
  (files || [])
    .filter((file) => file.name?.toLowerCase().endsWith('.mp4') && MP4_FORMATS.has(file.format) && file.private !== 'true')
    .map((file) => {
      const height = Number(file.height) || undefined
      return {
        id: `archive-${identifier}-${file.name}`,
        provider: 'archive',
        kind: 'mp4',
        url: `https://archive.org/download/${encodeURIComponent(identifier)}/${encodePath(file.name)}`,
        label: height ? `${height}p` : file.format,
        height,
        size: Number(file.size) || undefined,
        audioLanguage: undefined,
        downloadable: false,
        license,
        pageUrl: `https://archive.org/details/${encodeURIComponent(identifier)}`,
      }
    })
    .sort((a, b) => (b.height || 0) - (a.height || 0))

const readCache = (key) => {
  const hit = session.read(CACHE_PREFIX + key)
  return hit && Date.now() - hit.at < CACHE_TTL_MS ? hit.value : undefined
}

export const archiveProvider = {
  id: 'archive',
  async findSources({ mediaType, title, year, signal }) {
    if (mediaType !== 'movie' || !title || !year) return []
    if (new Date().getFullYear() - year < MIN_AGE_YEARS) return []

    const cacheKey = `${normalizeText(title)}:${year}`
    const cached = readCache(cacheKey)
    if (cached) return cached

    const escaped = title.replace(/["\\]/g, ' ')
    const query = `title:("${escaped}") AND mediatype:movies AND collection:(feature_films) AND year:[${year - 1} TO ${year + 1}]`
    const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&fl[]=identifier&fl[]=title&fl[]=year&fl[]=licenseurl&fl[]=downloads&rows=8&sort[]=downloads+desc&output=json`
    const search = await fetch(url, { signal }).then((r) => (r.ok ? r.json() : Promise.reject(new Error('Archive search failed'))))

    const docs = (search?.response?.docs || []).filter((doc) => titleMatches(doc.title, title) && OPEN_LICENSE.test(String(doc.licenseurl || '')))
    let found = []
    for (const doc of docs.slice(0, 3)) {
      const meta = await fetch(`${META_URL}/${encodeURIComponent(doc.identifier)}`, { signal }).then((r) => (r.ok ? r.json() : null))
      const sources = sourcesFromFiles(doc.identifier, meta?.files, { name: 'Public domain', url: doc.licenseurl })
      if (sources.length) {
        found = sources
        break
      }
    }
    session.write(CACHE_PREFIX + cacheKey, { at: Date.now(), value: found })
    return found
  },
}
