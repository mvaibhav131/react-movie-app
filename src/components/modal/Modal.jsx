import { useRef } from 'react'
import { createPortal } from 'react-dom'
import { IoClose } from 'react-icons/io5'
import useFocusTrap from '../../hooks/useFocusTrap'
import useScrollLock from '../../hooks/useScrollLock'
import './style.scss'

/**
 * Accessible dialog: focus is trapped and restored, Escape and backdrop press close it, page scroll is locked.
 * size: "video" (16:9 stage), "player" (video + details), "md" (centered card) or "sheet" (bottom sheet on phones, card on desktop).
 * Video and player dialogs get a header bar so the close button never covers an embedded player's own controls.
 */
const Modal = ({ open, onClose, title, size = 'md', children, className = '' }) => {
  const panelRef = useRef(null)
  useScrollLock(open)
  useFocusTrap(panelRef, open, onClose)
  if (!open) return null

  const closeButton = (extra = '') => (
    <button type="button" className={`modal__close ${extra}`.trim()} aria-label="Close" onClick={onClose}>
      <IoClose />
    </button>
  )

  return createPortal(
    <div className="modal">
      <div className="modal__backdrop" onMouseDown={onClose} aria-hidden="true" />
      <div ref={panelRef} className={`modal__panel modal__panel--${size} ${className}`.trim()} role="dialog" aria-modal="true" aria-label={title}>
        {size === 'video' || size === 'player' ? (
          <div className="modal__bar">
            <span className="modal__barTitle">{title}</span>
            {closeButton('modal__close--bar')}
          </div>
        ) : (
          closeButton()
        )}
        {children}
      </div>
    </div>,
    document.body
  )
}

export default Modal
