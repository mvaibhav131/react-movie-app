import { normalizeText } from '../../utils/url.js'

const LANGUAGES = 'hindi|marathi|tamil|telugu|kannada|malayalam|bhojpuri|punjabi|gujarati|bengali|odia|urdu|english'
const LABELS = `${LANGUAGES}|movies?|films?|full|new|latest|super\\s*hit|superhit|blockbuster|hit|classic|bollywood|hollywood|tollywood|kollywood|mollywood|sandalwood`
const LANGUAGE_NOISE = new RegExp(`(?:\\b(?:new|latest)\\s+)?\\b(?:${LANGUAGES})\\s+(?:dubbed|dub|full|new|latest|super\\s*hit|blockbuster|movies?|films?)\\b`, 'gi')
const FULL_BEFORE_LANGUAGE = new RegExp(`\\bfull\\s+(?=(?:${LANGUAGES})\\b)`, 'gi')
const TRAILING_LABEL = new RegExp(`\\s+(?:${LABELS})$`, 'i')
const ONLY_LABELS = new RegExp(`^(?:${LABELS})$`, 'i')

/** Uploads worth considering: the title calls it a film (length and the TMDB runtime do the real filtering). */
export const FILM_HINT = /\b(?:full|movies?|films?)\b/i
const FULL_MOVIE_ALL = /\bfull\s*(?:hd\s*)?(?:movie|film)s?\b/gi
const HINDI_DUBBED = /\bhindi\s+dubbed\b|\bdubbed\s+in\s+hindi\b|\bhindi\s+dub\b/i

/** Allowed gap between a film's TMDB runtime and the upload's length, in minutes. */
export const RUNTIME_TOLERANCE = { exact: 20, prefix: 12 }
/** A one-word name like "Video" matches unrelated films too easily, so without a year in the title the TMDB entry must be well known. */
export const SINGLE_WORD_MIN_VOTES = 15
export const MIN_FEATURE_MINUTES = 65
export const MAX_FEATURE_MINUTES = 260

/** "PT1H52M30S" -> 6750 seconds. Returns 0 for anything else (live streams are "P0D"). */
export const isoDurationSeconds = (iso) => {
  const match = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || ''))
  if (!match) return 0
  const [days, hours, minutes, seconds] = match.slice(1).map((n) => Number(n) || 0)
  return days * 86400 + hours * 3600 + minutes * 60 + seconds
}

const cleanSegment = (segment) => {
  let text = segment
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ')
    .replace(FULL_MOVIE_ALL, ' ')
    .replace(FULL_BEFORE_LANGUAGE, ' ')
    .replace(LANGUAGE_NOISE, ' ')
    .replace(/\b(?:dubbed|super\s*hit|superhit|blockbuster)\b/gi, ' ')
    .replace(/\b(?:hd|4k|uhd|1080p|720p|480p)\b/gi, ' ')
    .replace(/\b(?:with\s+)?english\s+subtitles?\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  let year = null
  for (let previous = ''; previous !== text; ) {
    previous = text
    text = text.replace(TRAILING_LABEL, '').trim()
    const trailingYear = /\s+(19[3-9]\d|20[0-3]\d)$/.exec(text)
    if (trailingYear) {
      year = Number(trailingYear[1])
      text = text.slice(0, trailingYear.index).trim()
    }
  }
  return { name: text, year }
}

const usable = (name) => name.length > 1 && !/^\d+$/.test(name) && !ONLY_LABELS.test(name)

/**
 * Pulls the film's name out of an upload title such as
 * "Pushpa Full Movie Hindi Dubbed | Allu Arjun | Sukumar" or "Hum Saath-Saath Hain (HD) - Full Movie".
 * A name in brackets ("Khakhi Aur Khiladi (Kaththi)") is offered too, since dubs often carry the original title there.
 * @returns {{ names: string[], year: number | null, dubbedHindi: boolean }}
 */
export const parseVideoTitle = (title) => {
  const text = String(title || '')
  const yearInBrackets = /[([](19[3-9]\d|20[0-3]\d)[)\]]/.exec(text)
  const segments = text.split(/\s+[|\-–—~•]\s+|\s*\|\s*/).map((s) => s.trim())
  const yearSegment = segments.find((s) => /^(19[3-9]\d|20[0-3]\d)$/.test(s))
  const cleaned = segments.map(cleanSegment)
  const inBrackets = [...text.matchAll(/[([]([^)\]]{3,40})[)\]]/g)].map((m) => cleanSegment(m[1]).name)
  // A number is a name only as the first segment ("1920 Full Movie"); later ones are release years.
  const fromSegments = cleaned.filter((c, i) => usable(c.name) || (i === 0 && /^\d{2,4}$/.test(c.name))).map((c) => c.name)
  const names = [...new Set([...fromSegments.slice(0, 2), ...inBrackets.filter(usable).slice(0, 1)])]
  const trailingYear = cleaned.find((c) => c.year)?.year
  return {
    names,
    year: yearInBrackets ? Number(yearInBrackets[1]) : yearSegment ? Number(yearSegment) : trailingYear || null,
    dubbedHindi: HINDI_DUBBED.test(text),
  }
}

/**
 * How a TMDB movie's name relates to a name parsed from an upload title:
 * "exact", "prefix" (one is the other plus a subtitle, e.g. "Pushpa" / "Pushpa: The Rise") or null.
 */
export const matchTitle = (name, movie) => {
  const wanted = normalizeText(name)
  if (!wanted) return null
  const known = [movie.title, movie.original_title].filter(Boolean).map(normalizeText)
  if (known.includes(wanted)) return 'exact'
  const related = known.some((n) => Math.min(n.length, wanted.length) >= 5 && (n.startsWith(`${wanted} `) || wanted.startsWith(`${n} `)))
  return related ? 'prefix' : null
}

export const runtimeFits = (runtimeMinutes, uploadMinutes, tolerance = RUNTIME_TOLERANCE.exact) =>
  runtimeMinutes > 0 && Math.abs(runtimeMinutes - uploadMinutes) <= tolerance

/** Years in the upload title must agree with TMDB (one year of slack for festival / late releases). */
export const yearFits = (year, releaseDate) => !year || !releaseDate || Math.abs(Number(releaseDate.slice(0, 4)) - year) <= 1

/**
 * Picks the TMDB movie an upload most likely is: exact names beat prefix names and the runtime must agree.
 * `candidates` are TMDB movie details ({ id, title, original_title, release_date, runtime, popularity, vote_count }).
 * Returns null when two films share the name and nothing separates them, because guessing would play the wrong film.
 */
export const pickMovie = (parsedName, year, candidates, uploadMinutes) => {
  const gap = (movie) => Math.abs(movie.runtime - uploadMinutes)
  const oneWord = normalizeText(parsedName).split(' ').length === 1
  const ranked = candidates
    .map((movie) => ({ movie, kind: matchTitle(parsedName, movie) }))
    .filter(
      ({ movie, kind }) =>
        kind &&
        yearFits(year, movie.release_date) &&
        runtimeFits(movie.runtime, uploadMinutes, RUNTIME_TOLERANCE[kind]) &&
        (year || !oneWord || (movie.vote_count || 0) >= SINGLE_WORD_MIN_VOTES)
    )
    .sort((a, b) => (a.kind === 'exact' ? 0 : 1) - (b.kind === 'exact' ? 0 : 1) || gap(a.movie) - gap(b.movie) || (b.movie.popularity || 0) - (a.movie.popularity || 0))
  const [best, second] = ranked
  if (!best) return null
  if (!year && second && second.kind === best.kind && gap(second.movie) - gap(best.movie) < 10) return null
  return best.movie
}
