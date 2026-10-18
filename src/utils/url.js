/** Returns the URL string when it is an absolute https URL without credentials; otherwise null. */
export const safeHttpsUrl = (value) => {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.toString()
  } catch {
    return null
  }
}

export const hostOf = (value) => {
  try {
    return new URL(value).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

// Keep Latin letters, digits and the Indic scripts used for regional titles (Devanagari, Tamil, Telugu, Kannada, Malayalam).
// The Indic ranges intentionally include their combining vowel signs, which is what this rule warns about.
// eslint-disable-next-line no-misleading-character-class
const NOT_WORD = new RegExp('[^a-z0-9\\u0900-\\u097f\\u0b80-\\u0bff\\u0c00-\\u0c7f\\u0c80-\\u0cff\\u0d00-\\u0d7f ]+', 'g')

/** Drops the Latin combining diacritics produced by NFKD so "Amélie" compares equal to "Amelie". */
const stripDiacritics = (text) =>
  [...text.normalize('NFKD')]
    .filter((char) => {
      const code = char.charCodeAt(0)
      return code < 0x300 || code > 0x36f
    })
    .join('')

/** Normalises a title for comparisons: lowercase, no diacritics/punctuation, no leading article. */
export const normalizeText = (value) =>
  stripDiacritics(String(value || ''))
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(NOT_WORD, ' ')
    .replace(/^(the|a|an)\s+/, '')
    .replace(/\s+/g, ' ')
    .trim()
