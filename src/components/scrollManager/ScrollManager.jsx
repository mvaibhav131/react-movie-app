import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map()
const RESTORE_TIMEOUT_MS = 2500

/**
 * Scrolls to the top on forward navigation (new path), restores the previous scroll offset on back/forward,
 * and leaves the scroll position alone when only the query string changes (filters).
 */
const ScrollManager = () => {
  const { pathname, key } = useLocation()
  const navigationType = useNavigationType()
  const previousPath = useRef(pathname)

  useEffect(() => {
    if ('scrollRestoration' in window.history) window.history.scrollRestoration = 'manual'
  }, [])

  useEffect(() => {
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => positions.set(key, window.scrollY))
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [key])

  useEffect(() => {
    const samePath = previousPath.current === pathname
    previousPath.current = pathname

    if (navigationType === 'POP') {
      const target = positions.get(key) || 0
      if (!target) {
        window.scrollTo(0, 0)
        return undefined
      }
      // The page may still be loading data, so keep trying until it is tall enough.
      const startedAt = performance.now()
      let frame = 0
      const attempt = () => {
        window.scrollTo(0, target)
        if (Math.abs(window.scrollY - target) > 4 && performance.now() - startedAt < RESTORE_TIMEOUT_MS) {
          frame = requestAnimationFrame(attempt)
        }
      }
      attempt()
      return () => cancelAnimationFrame(frame)
    }

    if (!samePath) {
      window.scrollTo(0, 0)
      document.getElementById('main')?.focus({ preventScroll: true })
    }
    return undefined
  }, [key, pathname, navigationType])

  return null
}

export default ScrollManager
