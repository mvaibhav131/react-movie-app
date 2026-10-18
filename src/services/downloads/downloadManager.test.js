import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const SOURCE = { id: 'src', kind: 'webm', url: 'https://cdn.example/film.webm', label: '240p' }
const META = { mediaType: 'movie', tmdbId: 1, title: 'Film', posterPath: null, season: null, episode: null }

const chunk = (n) => new Uint8Array(n).fill(1)

const streamOf = (sizes, { delayMs = 0, signal } = {}) => {
  let i = 0
  return new ReadableStream({
    async pull(controller) {
      if (delayMs) await new Promise((r) => setTimeout(r, delayMs))
      if (signal?.aborted) {
        controller.error(new DOMException('Aborted', 'AbortError'))
        return
      }
      if (i >= sizes.length) controller.close()
      else controller.enqueue(chunk(sizes[i++]))
    },
  })
}

const installBrowserApis = (quota = 1e9) => {
  const stored = new Map()
  const cache = {
    put: vi.fn(async (request, response) => stored.set(request.url, await response.arrayBuffer())),
    match: vi.fn(async (request) => (stored.has(request.url) ? new Response(stored.get(request.url)) : undefined)),
    delete: vi.fn(async (request) => stored.delete(request.url)),
  }
  vi.stubGlobal('caches', { open: async () => cache })
  Object.defineProperty(navigator, 'storage', { value: { estimate: async () => ({ usage: 0, quota }) }, configurable: true })
  return { stored, cache }
}

const load = async () => import('./downloadManager')

describe('download manager', () => {
  beforeEach(() => {
    vi.resetModules()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('builds stable ids', async () => {
    const { makeDownloadId } = await load()
    expect(makeDownloadId({ mediaType: 'tv', tmdbId: 5, season: 1, episode: 2, sourceId: 'x' })).toBe('tv:5:1x2:x')
    expect(makeDownloadId({ mediaType: 'movie', tmdbId: 5, sourceId: 'x' })).toBe('movie:5:0x0:x')
  })

  it('streams a file into storage, reports progress and the final size', async () => {
    const { stored } = installBrowserApis()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init = {}) => {
        if (init.headers?.Range) return new Response('x', { status: 206, headers: { 'Content-Range': 'bytes 0-0/600' } })
        return new Response(streamOf([100, 200, 300]), { status: 200, headers: { 'Content-Type': 'video/webm' } })
      })
    )
    const { startDownload, getDownloadTasks, hasDownloadFile, deleteDownloadFile, openDownload } = await load()
    const done = vi.fn()
    URL.createObjectURL = vi.fn(() => 'blob:mock')

    await startDownload({ id: 'movie:1:0x0:src', source: SOURCE, meta: META }, { onDone: done })

    expect(done).toHaveBeenCalledWith(expect.objectContaining({ id: 'movie:1:0x0:src', size: 600, mime: 'video/webm', status: 'done', title: 'Film' }))
    expect(getDownloadTasks()[0]).toMatchObject({ status: 'done', loaded: 600, total: 600 })
    expect(stored.size).toBe(1)
    expect(await hasDownloadFile('movie:1:0x0:src')).toBe(true)
    expect(await openDownload('movie:1:0x0:src')).toBe('blob:mock')

    await deleteDownloadFile('movie:1:0x0:src')
    expect(await hasDownloadFile('movie:1:0x0:src')).toBe(false)
  })

  it('cancels cleanly without leaving a partial file or a failure message', async () => {
    const { stored } = installBrowserApis()
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_url, init = {}) => {
        if (init.headers?.Range) return new Response('x', { status: 206, headers: { 'Content-Range': 'bytes 0-0/10000' } })
        return new Response(streamOf(Array(50).fill(100), { delayMs: 5, signal: init.signal }), { status: 200 })
      })
    )
    const { startDownload, cancelDownload, getDownloadTasks } = await load()
    const done = vi.fn()
    const running = startDownload({ id: 'movie:1:0x0:src', source: SOURCE, meta: META }, { onDone: done })
    await new Promise((r) => setTimeout(r, 40))
    cancelDownload('movie:1:0x0:src')
    await running

    expect(done).not.toHaveBeenCalled()
    expect(getDownloadTasks()).toHaveLength(0)
    expect(stored.size).toBe(0)
  })

  it('explains when the host blocks in-app downloads (no CORS)', async () => {
    installBrowserApis()
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))))
    const { startDownload, getDownloadTasks } = await load()
    await startDownload({ id: 'movie:1:0x0:src', source: SOURCE, meta: META })
    expect(getDownloadTasks()[0]).toMatchObject({ status: 'failed' })
    expect(getDownloadTasks()[0].error).toMatch(/does not allow saving/i)
  })

  it('refuses to start when there is not enough free storage', async () => {
    installBrowserApis(100)
    vi.stubGlobal('fetch', vi.fn(async () => new Response('x', { status: 206, headers: { 'Content-Range': 'bytes 0-0/5000' } })))
    const { startDownload, getDownloadTasks } = await load()
    await startDownload({ id: 'movie:1:0x0:src', source: SOURCE, meta: META })
    expect(getDownloadTasks()[0]).toMatchObject({ status: 'failed' })
    expect(getDownloadTasks()[0].error).toMatch(/not enough free storage/i)
  })
})
