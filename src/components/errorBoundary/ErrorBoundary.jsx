import { Component } from 'react'
import { IoAlertCircleOutline } from 'react-icons/io5'
import './style.scss'

/** Catches render errors in a route subtree; `resetKey` (e.g. the pathname) clears the error on navigation. */
export default class ErrorBoundary extends Component {
  state = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error) {
    return { error }
  }

  static getDerivedStateFromProps(props, state) {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey }
    return null
  }

  componentDidCatch(error, info) {
    console.error('Render error:', error, info?.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="errorBoundary" role="alert">
        <IoAlertCircleOutline aria-hidden="true" />
        <h2>This page hit a problem</h2>
        <p>Something unexpected happened while showing this screen. Your data is safe.</p>
        <div className="errorBoundary__actions">
          <button type="button" className="btn btn--primary" onClick={() => window.location.reload()}>
            Reload page
          </button>
          <a className="btn btn--outline" href="/">
            Go to home
          </a>
        </div>
      </div>
    )
  }
}
