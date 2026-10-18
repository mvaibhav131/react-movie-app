import { useEffect } from 'react'

let locks = 0

/** Locks page scroll while `active` (modals, drawers). Reference-counted so nested locks work. */
export default function useScrollLock(active) {
  useEffect(() => {
    if (!active) return undefined
    locks += 1
    document.body.classList.add('scrollLocked')
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks === 0) document.body.classList.remove('scrollLocked')
    }
  }, [active])
}
