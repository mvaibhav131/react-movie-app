import { useId, useRef, useState } from 'react'
import './style.scss'

/**
 * Segmented control built on the WAI-ARIA tabs pattern (arrow keys move between options).
 * Use `value` (a label from `data`) to control it, or omit it and read selections via `onTabChange(label, index)`.
 */
const SwitchTab = ({ data, onTabChange, value, label = 'Options', className = '' }) => {
  const [internal, setInternal] = useState(0)
  const baseId = useId()
  const refs = useRef([])
  const selected = value !== undefined ? Math.max(0, data.indexOf(value)) : internal

  const select = (index) => {
    setInternal(index)
    onTabChange?.(data[index], index)
  }

  const onKeyDown = (event, index) => {
    const last = data.length - 1
    let next = index
    if (event.key === 'ArrowRight') next = index === last ? 0 : index + 1
    else if (event.key === 'ArrowLeft') next = index === 0 ? last : index - 1
    else if (event.key === 'Home') next = 0
    else if (event.key === 'End') next = last
    else return
    event.preventDefault()
    select(next)
    refs.current[next]?.focus()
  }

  return (
    <div className={`switchingTabs ${className}`.trim()}>
      <div className="tabItems" role="tablist" aria-label={label}>
        {data.map((tab, index) => (
          <button
            key={tab}
            id={`${baseId}-${index}`}
            ref={(el) => {
              refs.current[index] = el
            }}
            type="button"
            role="tab"
            aria-selected={selected === index}
            tabIndex={selected === index ? 0 : -1}
            className={`tabItem ${selected === index ? 'active' : ''}`}
            onClick={() => select(index)}
            onKeyDown={(event) => onKeyDown(event, index)}
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}

export default SwitchTab
