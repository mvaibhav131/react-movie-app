import { useEffect, useRef, useState } from 'react'
import { IoCheckmark, IoChevronBack, IoChevronForward, IoSettingsOutline } from 'react-icons/io5'
import useDismiss from '../../hooks/useDismiss'

/**
 * Settings popover with speed, quality, subtitle and audio sub-menus.
 * Each menu is { label, value (display text), options: [{ id, label }], selected (id), onSelect(id) }; omit a menu to hide it.
 */
const SettingsMenu = ({ open, onToggle, onClose, menus }) => {
  const rootRef = useRef(null)
  const [page, setPage] = useState(null)
  useDismiss(rootRef, onClose, open)

  useEffect(() => {
    if (!open) setPage(null)
  }, [open])

  const available = Object.entries(menus).filter(([, menu]) => menu && menu.options.length > 0)
  const current = page ? menus[page] : null

  return (
    <div className="vpSettings" ref={rootRef}>
      <button type="button" className="vp__btn" aria-label="Settings" aria-haspopup="menu" aria-expanded={open} onClick={onToggle}>
        <IoSettingsOutline />
      </button>
      {open && (
        <div className="vpSettings__panel" role="menu" aria-label="Player settings">
          {!current ? (
            available.map(([key, menu]) => (
              <button key={key} type="button" role="menuitem" className="vpSettings__row" onClick={() => setPage(key)}>
                <span>{menu.label}</span>
                <span className="vpSettings__value">
                  {menu.value} <IoChevronForward aria-hidden="true" />
                </span>
              </button>
            ))
          ) : (
            <>
              <button type="button" className="vpSettings__row vpSettings__row--back" onClick={() => setPage(null)}>
                <IoChevronBack aria-hidden="true" /> {current.label}
              </button>
              <div className="vpSettings__list" role="group" aria-label={current.label}>
                {current.options.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitemradio"
                    aria-checked={option.id === current.selected}
                    className="vpSettings__row"
                    onClick={() => {
                      current.onSelect(option.id)
                      setPage(null)
                      onClose()
                    }}
                  >
                    <span>{option.label}</span>
                    {option.id === current.selected && <IoCheckmark aria-hidden="true" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default SettingsMenu
