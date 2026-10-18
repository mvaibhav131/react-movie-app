import { archiveProvider } from './providers/archiveProvider'
import { catalogProvider } from './providers/catalogProvider'
import { youtubeProvider } from './providers/youtubeProvider'
import { supportsSource } from './capabilities'
import { hasFailed, markFailed } from './failures'
import { probeSource } from './probe'
import { rankSources } from './ranking'

/**
 * Central playback service. UI code never talks to providers directly.
 *
 * Providers are tried in parallel and must only return content VM Flix is licensed or
 * otherwise permitted to stream. Add a provider by implementing { id, findSources(ctx) }
 * and appending it to PROVIDERS; order does not matter, ranking decides.
 */
const PROVIDERS = [catalogProvider, archiveProvider, youtubeProvider]
const PROVIDER_TIMEOUT_MS = 9000

const withTimeout = (promise, ms) =>
  Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject(new Error('Provider timed out')), ms))])

/**
 * @param {{ mediaType: 'movie'|'tv', id: number|string, title?: string, year?: number, season?: number, episode?: number }} ctx
 * @returns {Promise<import('../catalog').CatalogSource[]>} every source any provider offers (unfiltered)
 */
export const findPlayableSources = async (ctx, { signal } = {}) => {
  const settled = await Promise.allSettled(PROVIDERS.map((p) => withTimeout(p.findSources({ ...ctx, signal }), PROVIDER_TIMEOUT_MS)))
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
  return settled.filter((s) => s.status === 'fulfilled').flatMap((s) => s.value)
}

/** Best-first playback queue: only formats this browser can decode, skipping sources that recently failed. */
export const buildQueue = (sources, { quality = 'auto' } = {}) =>
  rankSources(
    sources.filter((s) => supportsSource(s) && !hasFailed(s)),
    { quality }
  )

/**
 * Returns the first queued source that passes a reachability probe (checking at most `limit` of them),
 * recording the ones that do not. Resolves null when nothing is playable.
 */
export const firstHealthySource = async (queue, { signal, limit = 3 } = {}) => {
  for (const source of queue.slice(0, limit)) {
    const result = await probeSource(source, { signal })
    if (result.ok) return { source, probe: result }
    markFailed(source)
  }
  return null
}
