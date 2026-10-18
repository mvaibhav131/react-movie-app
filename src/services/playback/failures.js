import { session } from '../../utils/storage'

const KEY = 'vmflix:failed-sources'
const TTL_MS = 10 * 60 * 1000

const read = () => {
  const now = Date.now()
  const all = session.read(KEY, {})
  return Object.fromEntries(Object.entries(all).filter(([, at]) => now - at < TTL_MS))
}

/** Remembers a source that failed to load so it is not retried for a few minutes. */
export const markFailed = (source) => {
  session.write(KEY, { ...read(), [source.url]: Date.now() })
}

export const hasFailed = (source) => source.url in read()

export const clearFailures = () => session.remove(KEY)
