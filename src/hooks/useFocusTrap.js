import { useEffect, useRef } from 'react'

const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

/**
 * Keeps keyboard focus inside `containerRef` while `active`, closes on Escape and
 * returns focus to the previously focused element afterwards.
 */
export default function useFocusTrap(containerRef, active, onEscape) {
  const escapeRef = useRef(onEscape)
  escapeRef.current = onEscape

  useEffect(() => {
    const container = containerRef.current
    if (!active || !container) return undefined
    const previous = document.activeElement

    const focusables = () => [...container.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null || el === document.activeElement)
    const start = container.querySelector('[data-autofocus]') || focusables()[0]
    if (start) start.focus()
    else {
      container.setAttribute('tabindex', '-1')
      container.focus()
    }

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        escapeRef.current?.()
        return
      }
      if (event.key !== 'Tab') return
      const list = focusables()
      if (!list.length) {
        event.preventDefault()
        return
      }
      const first = list[0]
      const last = list[list.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    container.addEventListener('keydown', onKeyDown)
    return () => {
      container.removeEventListener('keydown', onKeyDown)
      if (previous && document.contains(previous)) previous.focus?.()
    }
  }, [active, containerRef])
}
