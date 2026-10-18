import { memo, useRef, useState } from 'react'
import { clamp, formatClock } from '../../utils/format'

/**
 * Pointer-driven seek bar with buffered ranges, a hover/drag time bubble and slider keyboard support.
 * Seeks on release so dragging does not hammer the decoder.
 */
const SeekBar = memo(function SeekBar({ currentTime, duration, buffered, onSeek, disabled }) {
  const trackRef = useRef(null)
  const [drag, setDrag] = useState(null)
  const [hover, setHover] = useState(null)

  const ratioAt = (event) => {
    const rect = trackRef.current.getBoundingClientRect()
    return clamp((event.clientX - rect.left) / rect.width, 0, 1)
  }

  const onPointerDown = (event) => {
    if (disabled || !duration) return
    event.currentTarget.setPointerCapture(event.pointerId)
    setDrag(ratioAt(event))
  }
  const onPointerMove = (event) => {
    if (!duration) return
    const ratio = ratioAt(event)
    if (drag !== null) setDrag(ratio)
    else if (event.pointerType === 'mouse') setHover(ratio)
  }
  const finish = (event) => {
    if (drag === null) return
    onSeek(ratioAt(event) * duration)
    setDrag(null)
  }

  const onKeyDown = (event) => {
    if (!duration) return
    const steps = { ArrowLeft: -5, ArrowRight: 5, PageDown: -duration * 0.1, PageUp: duration * 0.1 }
    if (event.key in steps) {
      event.preventDefault()
      event.stopPropagation()
      onSeek(clamp(currentTime + steps[event.key], 0, duration))
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      event.stopPropagation()
      onSeek(event.key === 'Home' ? 0 : duration)
    }
  }

  const played = duration ? (drag ?? currentTime / duration) : 0
  const bubble = drag ?? hover

  return (
    <div
      className={`seekBar ${drag !== null ? 'isDragging' : ''}`}
      role="slider"
      tabIndex={0}
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={Math.round(duration) || 0}
      aria-valuenow={Math.round(drag !== null ? drag * duration : currentTime) || 0}
      aria-valuetext={`${formatClock(drag !== null ? drag * duration : currentTime)} of ${formatClock(duration)}`}
      aria-disabled={disabled || !duration}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finish}
      onPointerCancel={() => setDrag(null)}
      onPointerLeave={() => setHover(null)}
      onKeyDown={onKeyDown}
    >
      <div ref={trackRef} className="seekBar__track">
        <div className="seekBar__buffer" style={{ transform: `scaleX(${duration ? clamp(buffered / duration, 0, 1) : 0})` }} />
        <div className="seekBar__played" style={{ transform: `scaleX(${clamp(played, 0, 1)})` }} />
        <div className="seekBar__thumb" style={{ left: `${clamp(played, 0, 1) * 100}%` }} />
        {bubble !== null && duration > 0 && (
          <div className="seekBar__bubble" style={{ left: `${bubble * 100}%` }}>
            {formatClock(bubble * duration)}
          </div>
        )}
      </div>
    </div>
  )
})

export default SeekBar
