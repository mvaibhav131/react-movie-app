import { useEffect, useRef } from 'react'

/** Calls `onDismiss` on Escape or a pointer press outside `ref` while `active`. */
export default function useDismiss(ref, onDismiss, active = true) {
  const dismissRef = useRef(onDismiss)
  dismissRef.current = onDismiss

  useEffect(() => {
    if (!active) return undefined
    const onPointer = (event) => {
      if (ref.current && !ref.current.contains(event.target)) dismissRef.current()
    }
    const onKey = (event) => {
      if (event.key === 'Escape') dismissRef.current()
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [ref, active])
}
