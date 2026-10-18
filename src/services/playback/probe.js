const withTimeout = (ms, signal) => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  signal?.addEventListener('abort', () => controller.abort(), { once: true })
  return { signal: controller.signal, done: () => clearTimeout(timer) }
}

/**
 * Cheap reachability check before a source is handed to the player.
 * Returns { ok, reason?, size? }. When the host sends no CORS headers the result is inconclusive,
 * so the source is let through and the player's own error handling decides.
 */
export const probeSource = async (source, { signal, timeoutMs = 7000 } = {}) => {
  // YouTube's embed cannot be fetched cross-origin; its player reports unavailable videos itself.
  if (source.kind === 'youtube') return { ok: true }
  const guard = withTimeout(timeoutMs, signal)
  try {
    if (source.kind === 'hls') {
      const res = await fetch(source.url, { signal: guard.signal })
      if (!res.ok) return { ok: false, reason: `Stream responded with ${res.status}` }
      const text = await res.text()
      return text.trimStart().startsWith('#EXTM3U') ? { ok: true, manifest: text } : { ok: false, reason: 'Not a valid HLS playlist' }
    }
    const res = await fetch(source.url, { headers: { Range: 'bytes=0-1' }, signal: guard.signal })
    if (!res.ok && res.status !== 206) return { ok: false, reason: `File responded with ${res.status}` }
    const total = Number(res.headers.get('Content-Range')?.split('/')[1])
    return { ok: true, size: Number.isFinite(total) ? total : undefined }
  } catch (error) {
    if (signal?.aborted) throw error
    if (error?.name === 'AbortError') return { ok: false, reason: 'Timed out' }
    // TypeError: blocked by CORS or offline. The <video> element can still play cross-origin files.
    return source.kind === 'hls' ? { ok: false, reason: 'Stream is not reachable' } : { ok: true, inconclusive: true }
  } finally {
    guard.done()
  }
}
