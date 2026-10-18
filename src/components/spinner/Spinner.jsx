import './style.scss'

const Spinner = ({ initial = false, label = 'Loading' }) => (
  <div className={`loadingSpinner ${initial ? 'initial' : ''}`} role="status" aria-live="polite">
    <svg className="spinner" viewBox="0 0 50 50" aria-hidden="true">
      <circle className="path" cx="25" cy="25" r="20" fill="none" strokeWidth="4" />
    </svg>
    <span className="srOnly">{label}</span>
  </div>
)

export default Spinner
