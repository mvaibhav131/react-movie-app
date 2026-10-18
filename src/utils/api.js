import { TMDB_API_BASE, TMDB_TOKEN, TMDB_IMAGE_BASE } from '../config/env'

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'API_ERROR' } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

const DEFAULT_TTL = 5 * 60 * 1000
const MAX_CACHE_ENTRIES = 300
const cache = new Map()
const inflight = new Map()

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const buildUrl = (path, params) => {
  const url = new URL(TMDB_API_BASE + path)
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    url.searchParams.set(key, String(value))
  })
  url.searchParams.sort()
  return url.toString()
}

const abortError = () => new DOMException('The operation was aborted.', 'AbortError')

const withSignal = (promise, signal) => {
  if (!signal) return promise
  if (signal.aborted) return Promise.reject(abortError())
  return new Promise((resolve, reject) => {
    const onAbort = () => reject(abortError())
    signal.addEventListener('abort', onAbort, { once: true })
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort)
        resolve(value)
      },
      (error) => {
        signal.removeEventListener('abort', onAbort)
        reject(error)
      }
    )
  })
}

const requestWithRetry = async (url, retries = 2) => {
  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${TMDB_TOKEN}`, Accept: 'application/json' },
      })
      if (response.ok) return await response.json()
      if (response.status === 401) {
        throw new ApiError('TMDB rejected the access token. Check VITE_TMDB_TOKEN.', { status: 401, code: 'UNAUTHORIZED' })
      }
      if (response.status === 404) {
        throw new ApiError('Not found', { status: 404, code: 'NOT_FOUND' })
      }
      const retriable = response.status === 429 || response.status >= 500
      lastError = new ApiError(`Request failed (${response.status})`, { status: response.status })
      if (!retriable || attempt === retries) throw lastError
      const retryAfter = Number(response.headers.get('Retry-After'))
      await sleep(retryAfter > 0 ? Math.min(retryAfter, 5) * 1000 : 400 * 3 ** attempt)
    } catch (error) {
      if (error instanceof ApiError && !(error.status === 429 || error.status >= 500)) throw error
      lastError = error instanceof ApiError ? error : new ApiError('Network error. Check your connection.', { code: 'NETWORK' })
      if (attempt === retries) throw lastError
      await sleep(400 * 3 ** attempt)
    }
  }
  throw lastError
}

/**
 * GET a TMDB v3 endpoint. Responses are cached and concurrent identical calls share one request.
 * Rejects with ApiError on failure (never resolves with an error object).
 * @param {string} path
 * @param {Record<string, string | number | boolean | null | undefined>} [params]
 * @param {{ signal?: AbortSignal, ttl?: number, force?: boolean }} [options]
 */
export const fetchData = async (path, params, options = {}) => {
  const { signal, ttl = DEFAULT_TTL, force = false } = options
  if (!TMDB_TOKEN) {
    throw new ApiError('TMDB access token is missing. Add VITE_TMDB_TOKEN to .env.local.', { code: 'NO_TOKEN' })
  }
  const url = buildUrl(path, params)
  const now = Date.now()
  const hit = cache.get(url)
  if (!force && hit && now - hit.at < hit.ttl) return hit.data

  let pending = inflight.get(url)
  if (!pending || force) {
    pending = requestWithRetry(url)
      .then((data) => {
        cache.set(url, { at: Date.now(), ttl, data })
        if (cache.size > MAX_CACHE_ENTRIES) cache.delete(cache.keys().next().value)
        return data
      })
      .finally(() => inflight.delete(url))
    inflight.set(url, pending)
  }
  return withSignal(pending, signal)
}

export const clearApiCache = () => cache.clear()

export const isAbortError = (error) => error?.name === 'AbortError'

const POSTER_SIZES = [185, 342, 500, 780]
const BACKDROP_SIZES = [300, 780, 1280]

/** @param {string | null | undefined} path @param {string} size e.g. "w342" | "original" */
export const tmdbImage = (path, size = 'w342') => (path ? `${TMDB_IMAGE_BASE}/${size}${path}` : '')

export const posterSrcSet = (path) =>
  path ? POSTER_SIZES.map((w) => `${tmdbImage(path, `w${w}`)} ${w}w`).join(', ') : undefined

export const backdropSrcSet = (path) =>
  path ? BACKDROP_SIZES.map((w) => `${tmdbImage(path, `w${w}`)} ${w}w`).join(', ') : undefined
