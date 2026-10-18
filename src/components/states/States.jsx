import { IoAlertCircleOutline, IoSearchOutline, IoRefresh } from 'react-icons/io5'
import './style.scss'

export const EmptyState = ({ icon, title, message, action, compact = false }) => (
  <div className={`stateBox ${compact ? 'stateBox--compact' : ''}`} role="status">
    <span className="stateBox__icon" aria-hidden="true">
      {icon || <IoSearchOutline />}
    </span>
    {title && <h3 className="stateBox__title">{title}</h3>}
    {message && <p className="stateBox__msg">{message}</p>}
    {action}
  </div>
)

export const ErrorState = ({ error, title = 'Something went wrong', onRetry, compact = false }) => {
  const missingToken = error?.code === 'NO_TOKEN' || error?.code === 'UNAUTHORIZED'
  return (
    <div className={`stateBox stateBox--error ${compact ? 'stateBox--compact' : ''}`} role="alert">
      <span className="stateBox__icon" aria-hidden="true">
        <IoAlertCircleOutline />
      </span>
      <h3 className="stateBox__title">{missingToken ? 'TMDB access is not configured' : title}</h3>
      <p className="stateBox__msg">{error?.message || 'Please check your connection and try again.'}</p>
      {onRetry && !missingToken && (
        <button type="button" className="btn btn--outline btn--sm" onClick={onRetry}>
          <IoRefresh /> Try again
        </button>
      )}
    </div>
  )
}
