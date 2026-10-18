import './style.scss'

const colorFor = (value) => (value >= 7 ? 'var(--green)' : value >= 5 ? 'var(--orange)' : 'var(--red)')

/** Compact circular score (0-10). Renders nothing when there is no rating yet. */
const RatingBadge = ({ rating, size = 'md' }) => {
  const value = Number(rating)
  if (!Number.isFinite(value) || value <= 0) return null
  return (
    <span
      className={`ratingBadge ratingBadge--${size}`}
      role="img"
      aria-label={`Rated ${value.toFixed(1)} out of 10`}
      style={{ '--rating-color': colorFor(value) }}
    >
      <svg viewBox="0 0 36 36" aria-hidden="true">
        <circle className="ratingBadge__track" cx="18" cy="18" r="15.5" />
        <circle className="ratingBadge__value" cx="18" cy="18" r="15.5" pathLength="100" strokeDasharray={`${value * 10} 100`} />
      </svg>
      <b>{value.toFixed(1)}</b>
    </span>
  )
}

export default RatingBadge
