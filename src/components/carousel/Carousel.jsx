import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import ContentWrapper from '../contentWrapper/ContentWrapper'
import MovieCard from '../movieCard/MovieCard'
import { ErrorState } from '../states/States'
import './style.scss'

const SKELETON_COUNT = 8
const prefersReducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Horizontal, swipeable rail of cards.
 * `data` may hold raw TMDB results or normalised titles; `endpoint` is the fallback media type for raw results.
 */
const Carousel = ({
  title,
  data,
  loading = false,
  error,
  onRetry,
  endpoint,
  seeAllTo,
  actions,
  variant = 'poster',
  renderItem,
  hideWhenEmpty = false,
  emptyText = 'Nothing to show here yet.',
  className = '',
}) => {
  const trackRef = useRef(null)
  const headingId = useId()
  const [edge, setEdge] = useState({ start: true, end: false })
  const items = Array.isArray(data) ? data : []

  const updateEdges = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft >= el.scrollWidth - el.clientWidth - 4 })
  }, [])

  useEffect(() => {
    const el = trackRef.current
    if (!el) return undefined
    updateEdges()
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(updateEdges)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateEdges) : null
    observer?.observe(el)
    return () => {
      el.removeEventListener('scroll', onScroll)
      observer?.disconnect()
      cancelAnimationFrame(frame)
    }
  }, [updateEdges, items.length, loading])

  const scrollBy = (direction) => {
    const el = trackRef.current
    el?.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }

  if (!loading && !error && !items.length && hideWhenEmpty) return null

  return (
    <section className={`carousel carousel--${variant} ${className}`.trim()} aria-labelledby={title ? headingId : undefined}>
      {(title || actions || seeAllTo) && (
        <ContentWrapper>
          <header className="carousel__head">
            {title && (
              <h2 id={headingId} className="carousel__title">
                {title}
              </h2>
            )}
            <div className="carousel__tools">
              {actions}
              {seeAllTo && (
                <Link to={seeAllTo} className="carousel__all">
                  See all <IoChevronForward aria-hidden="true" />
                </Link>
              )}
            </div>
          </header>
        </ContentWrapper>
      )}

      <div className="carousel__viewport">
        {!loading && items.length > 0 && (
          <>
            <button type="button" className="carousel__nav carousel__nav--prev" aria-label="Scroll left" disabled={edge.start} onClick={() => scrollBy(-1)}>
              <IoChevronBack />
            </button>
            <button type="button" className="carousel__nav carousel__nav--next" aria-label="Scroll right" disabled={edge.end} onClick={() => scrollBy(1)}>
              <IoChevronForward />
            </button>
          </>
        )}

        {error ? (
          <ContentWrapper>
            <ErrorState error={error} onRetry={onRetry} compact title="Couldn't load this row" />
          </ContentWrapper>
        ) : !loading && !items.length ? (
          <ContentWrapper>
            <p className="carousel__empty">{emptyText}</p>
          </ContentWrapper>
        ) : (
          <ul ref={trackRef} className="carousel__track" aria-busy={loading || undefined}>
            {loading
              ? Array.from({ length: SKELETON_COUNT }, (_, i) => (
                  <li key={i} className="carousel__item" aria-hidden="true">
                    <div className="skeletonCard">
                      <div className="skeleton skeletonCard__art" />
                      <div className="skeleton skeletonCard__line" />
                      <div className="skeleton skeletonCard__line skeletonCard__line--short" />
                    </div>
                  </li>
                ))
              : items.map((item, index) => (
                  <li key={`${item.mediaType || item.media_type || endpoint}:${item.id}`} className="carousel__item">
                    {renderItem ? renderItem(item, index) : <MovieCard data={item} endpoint={endpoint} variant={variant} />}
                  </li>
                ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default Carousel
