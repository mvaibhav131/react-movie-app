/**
 * In-app downloads, for sources whose licence AND host allow saving a copy (`downloadable: true`).
 *
 * Files stream into the browser's Cache Storage, so memory use stays flat for large videos.
 * We never touch DRM-protected or third-party streams: only direct files the catalogue marks downloadable.
 * Hosts must send CORS headers (otherwise progress cannot be read); that is probed before starting.
 */
const CACHE_NAME = 'vmflix-downloads-v1'
const EMIT_INTERVAL_MS = 250
const STORAGE_HEADROOM = 1.1

const tasks = new Map()
const listeners = new Set()
let snapshot = []
let lastEmit = 0

const rebuild = () => {
  snapshot = [...tasks.values()].map(({ controller: _controller, ...rest }) => rest)
}

const emit = (force = false) => {
  const now = Date.now()
  if (!force && now - lastEmit < EMIT_INTERVAL_MS) return
  lastEmit = now
  rebuild()
  listeners.forEach((fn) => fn())
}

export const subscribeDownloads = (fn) => {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Stable snapshot for useSyncExternalStore. */
export const getDownloadTasks = () => snapshot

export const downloadsSupported = () => typeof window !== 'undefined' && 'caches' in window && !!navigator.storage?.estimate

const cacheKey = (id) => new Request(new URL(`/__vmflix_download__/${encodeURIComponent(id)}`, window.location.origin).toString())

export const makeDownloadId = ({ mediaType, tmdbId, season, episode, sourceId }) => `${mediaType}:${tmdbId}:${season ?? 0}x${episode ?? 0}:${sourceId}`

/** Checks CORS access and returns the real file size when the host reports it. */
export const probeDownload = async (source, { signal } = {}) => {
  try {
    const res = await fetch(source.url, { headers: { Range: 'bytes=0-0' }, signal })
    if (!res.ok && res.status !== 206) return { ok: false, reason: `The host responded with ${res.status}.` }
    const total = Number(res.headers.get('Content-Range')?.split('/')[1]) || Number(res.headers.get('Content-Length')) || source.size
    return { ok: true, size: total && total > 1 ? total : source.size }
  } catch (error) {
    if (error?.name === 'AbortError') throw error
    return { ok: false, reason: 'The host does not allow saving this file inside the app.' }
  }
}

export const storageEstimate = async () => {
  const { usage = 0, quota = 0 } = await navigator.storage.estimate()
  return { available: Math.max(0, quota - usage), quota }
}

const update = (id, patch, force = false) => {
  const task = tasks.get(id)
  if (!task) return
  Object.assign(task, patch)
  emit(force)
}

/**
 * Starts (or restarts) a download. `onDone(record)` receives the metadata to persist.
 * Resolves when finished, failed or cancelled; never rejects.
 */
export const startDownload = async ({ id, source, meta }, { onDone } = {}) => {
  if (tasks.get(id)?.status === 'downloading') return
  const controller = new AbortController()
  tasks.set(id, { id, meta, label: source.label, status: 'preparing', loaded: 0, total: source.size || 0, error: null, controller })
  emit(true)

  try {
    const probe = await probeDownload(source, { signal: controller.signal })
    if (!probe.ok) throw new Error(probe.reason)
    if (probe.size) {
      const { available } = await storageEstimate()
      if (available < probe.size * STORAGE_HEADROOM) throw new Error('Not enough free storage on this device for this file.')
    }
    update(id, { total: probe.size || 0, status: 'downloading' }, true)

    const response = await fetch(source.url, { signal: controller.signal })
    if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}).`)
    const reader = response.body.getReader()
    const counted = new ReadableStream({
      async pull(stream) {
        const { done, value } = await reader.read()
        if (done) {
          stream.close()
          return
        }
        const task = tasks.get(id)
        if (task) {
          task.loaded += value.byteLength
          emit()
        }
        stream.enqueue(value)
      },
      cancel: (reason) => reader.cancel(reason),
    })

    const mime = response.headers.get('Content-Type') || (source.kind === 'webm' ? 'video/webm' : 'video/mp4')
    const cache = await caches.open(CACHE_NAME)
    await cache.put(cacheKey(id), new Response(counted, { headers: { 'Content-Type': mime } }))

    const finished = tasks.get(id)
    update(id, { status: 'done', total: finished.loaded }, true)
    onDone?.({ id, ...meta, label: source.label, mime, size: finished.loaded, savedAt: Date.now(), status: 'done' })
  } catch (error) {
    await deleteDownloadFile(id)
    if (controller.signal.aborted || error?.name === 'AbortError') {
      tasks.delete(id)
      emit(true)
    } else {
      update(id, { status: 'failed', error: error?.message || 'Download failed.' }, true)
    }
  }
}

export const cancelDownload = (id) => tasks.get(id)?.controller.abort()

export const dismissDownloadTask = (id) => {
  tasks.delete(id)
  emit(true)
}

export const deleteDownloadFile = async (id) => {
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.delete(cacheKey(id))
  } catch {
    /* nothing stored */
  }
}

export const hasDownloadFile = async (id) => {
  try {
    const cache = await caches.open(CACHE_NAME)
    return !!(await cache.match(cacheKey(id)))
  } catch {
    return false
  }
}

/** Object URL for offline playback. The caller must revoke it with URL.revokeObjectURL. */
export const openDownload = async (id) => {
  const cache = await caches.open(CACHE_NAME)
  const response = await cache.match(cacheKey(id))
  if (!response) return null
  return URL.createObjectURL(await response.blob())
}
