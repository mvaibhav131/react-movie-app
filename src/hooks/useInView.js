import { useEffect, useState } from 'react'

/** Returns [setRef, inView]. Use `once` to stop observing after the first intersection. */
export default function useInView({ rootMargin = '240px', threshold = 0, once = true } = {}) {
  const [node, setNode] = useState(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    if (!node) return undefined
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return undefined
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          if (once) observer.disconnect()
        } else if (!once) {
          setInView(false)
        }
      },
      { rootMargin, threshold }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [node, rootMargin, threshold, once])

  return [setNode, inView]
}
