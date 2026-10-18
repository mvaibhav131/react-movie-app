import { useCallback, useEffect, useRef, useState } from 'react'
import { isAbortError } from '../utils/api'
import { mergeTitles } from '../services/normalize'
import useInView from './useInView'

const MAX_EMPTY_PAGES = 3

/**
 * Paginated title list. `fetchPage(page, signal)` must resolve { results, totalPages }.
 * The list is re-sorted after every merge so ordering stays correct across pages.
 * Pass `deps` that describe the query: when they change the list resets to page 1.
 */
export default function useInfiniteTitles(fetchPage, deps, { sort = 'popularity', enabled = true } = {}) {
  const [state, setState] = useState({ items: [], page: 0, totalPages: 1, loading: enabled, loadingMore: false, error: null })
  const fetchRef = useRef(fetchPage)
  fetchRef.current = fetchPage
  const generation = useRef(0)
  const controllerRef = useRef(null)
  const emptyStreak = useRef(0)
  const [sentinelRef, sentinelVisible] = useInView({ rootMargin: '600px', once: false })

  const load = useCallback(
    (page, reset) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller
      const mine = generation.current
      setState((s) => (reset ? { items: [], page: 0, totalPages: 1, loading: true, loadingMore: false, error: null } : { ...s, loadingMore: true, error: null }))
      Promise.resolve()
        .then(() => fetchRef.current(page, controller.signal))
        .then((res) => {
          if (mine !== generation.current) return
          setState((s) => {
            const before = reset ? [] : s.items
            const items = mergeTitles(before, res.results, sort)
            emptyStreak.current = items.length === before.length ? emptyStreak.current + 1 : 0
            return { items, page, totalPages: res.totalPages, loading: false, loadingMore: false, error: null }
          })
        })
        .catch((error) => {
          if (mine !== generation.current || isAbortError(error)) return
          setState((s) => ({ ...s, loading: false, loadingMore: false, error }))
        })
    },
    [sort]
  )

  useEffect(() => {
    generation.current += 1
    emptyStreak.current = 0
    if (!enabled) {
      controllerRef.current?.abort()
      setState({ items: [], page: 0, totalPages: 1, loading: false, loadingMore: false, error: null })
      return undefined
    }
    load(1, true)
    return () => controllerRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, enabled, load])

  const hasMore = state.page > 0 && state.page < state.totalPages && emptyStreak.current < MAX_EMPTY_PAGES

  const loadMore = useCallback(() => {
    if (state.loading || state.loadingMore || !hasMore) return
    load(state.page + 1, false)
  }, [state.loading, state.loadingMore, state.page, hasMore, load])

  useEffect(() => {
    if (sentinelVisible && !state.error) loadMore()
  }, [sentinelVisible, state.items.length, state.loadingMore, state.error, loadMore])

  const retry = useCallback(() => load(state.page + 1 || 1, state.page === 0), [load, state.page])

  return { ...state, hasMore, loadMore, sentinelRef, retry }
}
