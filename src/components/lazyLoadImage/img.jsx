import { useCallback, useState } from 'react'
import './style.scss'
import PosterFallback from '../../assets/no-poster.svg'

/**
 * Responsive, lazily loaded image with a stable box (no layout shift) and a fallback on error.
 * Pass `priority` for above-the-fold art (disables lazy loading and raises fetch priority).
 */
const Img = ({ src, srcSet, sizes, alt = '', className = '', ratio, priority = false, fit = 'cover', position, fallback = PosterFallback }) => {
  const [status, setStatus] = useState(src ? 'loading' : 'error')
  const [lastSrc, setLastSrc] = useState(src)

  if (src !== lastSrc) {
    setLastSrc(src)
    setStatus(src ? 'loading' : 'error')
  }

  // Cached images can finish loading before React attaches onLoad.
  const imgRef = useCallback((node) => {
    if (node && node.complete && node.naturalWidth > 0) setStatus('loaded')
  }, [])

  const failed = status === 'error'
  return (
    <span className={`img img--${status} ${className}`.trim()} style={ratio ? { aspectRatio: ratio } : undefined}>
      <img
        ref={imgRef}
        src={failed ? fallback : src}
        srcSet={failed ? undefined : srcSet}
        sizes={failed ? undefined : sizes}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        {...(priority ? { fetchpriority: 'high' } : {})}
        draggable="false"
        style={{ objectFit: failed ? 'contain' : fit, objectPosition: position }}
        onLoad={() => setStatus((s) => (s === 'error' ? s : 'loaded'))}
        onError={() => setStatus('error')}
      />
    </span>
  )
}

export default Img
