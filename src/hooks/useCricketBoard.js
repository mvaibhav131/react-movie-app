import { useCallback, useEffect, useRef } from 'react'
import useAsync from './useAsync'
import { loadCricketBoard } from '../services/cricket/cricketService'

const REFRESH_MS = 60 * 1000

/** Cricket matches with auto-refresh while the tab is visible. Previous data stays on screen during a refresh. */
export default function useCricketBoard() {
  const forceNext = useRef(false)
  const state = useAsync(
    (signal) => {
      const force = forceNext.current
      forceNext.current = false
      return loadCricketBoard({ signal, force })
    },
    [],
    { keepPrevious: true }
  )
  const { reload } = state

  useEffect(() => {
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') reload()
    }, REFRESH_MS)
    return () => clearInterval(timer)
  }, [reload])

  const refresh = useCallback(() => {
    forceNext.current = true
    reload()
  }, [reload])

  return { ...state, refresh }
}
