/** Original-language codes (TMDB uses ISO 639-1; "bh" is Bhojpuri). */
export const LANGUAGE_NAMES = {
  hi: 'Hindi',
  mr: 'Marathi',
  ta: 'Tamil',
  te: 'Telugu',
  kn: 'Kannada',
  ml: 'Malayalam',
  bn: 'Bengali',
  pa: 'Punjabi',
  gu: 'Gujarati',
  bh: 'Bhojpuri',
  ur: 'Urdu',
  en: 'English',
  ko: 'Korean',
  ja: 'Japanese',
  es: 'Spanish',
  fr: 'French',
  de: 'German',
  zh: 'Chinese',
  xx: 'No spoken language',
}

let displayNames
const intlName = (code) => {
  try {
    displayNames ||= new Intl.DisplayNames(['en'], { type: 'language' })
    const name = displayNames.of(code)
    return name && name !== code ? name : ''
  } catch {
    return ''
  }
}

export const languageLabel = (code) => LANGUAGE_NAMES[code] || (code ? intlName(code) || code.toUpperCase() : '')

export const SOUTH_INDIAN = [
  { code: 'ta', label: 'Tamil', slug: 'tamil' },
  { code: 'te', label: 'Telugu', slug: 'telugu' },
  { code: 'kn', label: 'Kannada', slug: 'kannada' },
  { code: 'ml', label: 'Malayalam', slug: 'malayalam' },
]

export const BROWSE_LANGUAGES = [
  'hi',
  'en',
  'mr',
  'ta',
  'te',
  'kn',
  'ml',
  'bn',
  'pa',
  'gu',
  'bh',
].map((code) => ({ code, label: LANGUAGE_NAMES[code] }))

/** TMDB genre ids shared by the curated Marathi / South Indian filters. */
export const GENRE = {
  action: 28,
  comedy: 35,
  drama: 18,
  romance: 10749,
  thriller: 53,
  family: 10751,
  horror: 27,
  fantasy: 14,
  history: 36,
  music: 10402,
}

/** TMDB watch-provider ids for Indian OTT platforms (verified via /watch/providers/tv?watch_region=IN). */
export const IN_OTT_PROVIDERS = [8, 119, 232, 2336, 237, 532, 315, 515, 309, 482]
