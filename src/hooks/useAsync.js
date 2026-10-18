import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '../utils/api'

/**
 * Runs an async function whenever `deps` change, cancelling the previous run.
 * `fn` receives an AbortSignal. Returns { data, error, loading, reload }.
 */
export default function useAsync(fn, deps, { enabled = true, keepPrevious = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: enabled })
  const [nonce, setNonce] = useState(0)
  const fnRef = useRef(fn)
  fnRef.current = fn

  useEffect(() => {
    if (!enabled) {
      setState((s) => (s.loading ? { ...s, loading: false } : s))
      return undefined
    }
    const controller = new AbortController()
    setState((s) => ({ data: keepPrevious ? s.data : null, error: null, loading: true }))
    Promise.resolve()
      .then(() => fnRef.current(controller.signal))
      .then((data) => {
        if (!controller.signal.aborted) setState({ data, error: null, loading: false })
      })
      .catch((error) => {
        if (controller.signal.aborted || isAbortError(error)) return
        setState((s) => ({ data: keepPrevious ? s.data : null, error, loading: false }))
      })
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
