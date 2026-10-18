import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { IoChevronBack, IoChevronForward, IoInformationCircleOutline, IoStar } from 'react-icons/io5'
import { fetchList } from '../../../services/discover'
import { backdropSrcSet, posterSrcSet, tmdbImage } from '../../../utils/api'
import { languageLabel } from '../../../config/languages'
import { formatRating } from '../../../utils/format'
import { selectGenres } from '../../../store/selectors'
import useAsync from '../../../hooks/useAsync'
import useMediaQuery from '../../../hooks/useMediaQuery'
import ContentWrapper from '../../../components/contentWrapper/ContentWrapper'
import MyListButton from '../../../components/myListButton/MyListButton'
import { ErrorState } from '../../../components/states/States'
import './style.scss'

const MAX_SLIDES = 6
const ROTATE_MS = 8000
const SWIPE_PX = 48

const HeroBanner = () => {
  const { data, loading, error, reload } = useAsync((signal) => fetchList('/trending/all/day', {}, { signal }), [])
  const genres = useSelector(selectGenres)
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const slides = useMemo(() => (data?.results || []).filter((t) => t.backdropPath && t.overview).slice(0, MAX_SLIDES), [data])
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [visited, setVisited] = useState(() => new Set([0, 1]))
  const touchStart = useRef(null)

  const goTo = useCallback(
    (next) => {
      if (!slides.length) return
      const target = (next + slides.length) % slides.length
      setIndex(target)
      setVisited((prev) => new Set(prev).add(target).add((target + 1) % slides.length))
    },
    [slides.length]
  )

  useEffect(() => {
    const onVisibility = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [])

  const rotating = slides.length > 1 && !hovered && !hidden && !reducedMotion
  useEffect(() => {
    if (!rotating) return undefined
    const timer = setInterval(() => goTo(index + 1), ROTATE_MS)
    return () => clearInterval(timer)
  }, [rotating, index, goTo])

  if (loading) {
    return (
      <section className="hero hero--loading" aria-busy="true" aria-label="Featured titles">
        <div className="skeleton hero__skeleton" />
      </section>
    )
  }

  if (error || !slides.length) {
    return (
      <section className="hero hero--empty" aria-label="Featured titles">
        <ContentWrapper>
          <ErrorState error={error || { message: 'No featured titles are available right now.' }} onRetry={reload} title="Featured titles unavailable" />
        </ContentWrapper>
      </section>
    )
  }

  const active = slides[index]
  const genreNames = (active.genreIds || [])
    .map((id) => genres[id]?.name)
    .filter(Boolean)
    .slice(0, 3)
  const meta = [active.mediaType === 'tv' ? 'TV Series' : 'Movie', active.year, active.language && active.language !== 'en' ? languageLabel(active.language) : ''].filter(Boolean)

  const onPointerDown = (event) => {
    touchStart.current = event.clientX
  }
  const onPointerUp = (event) => {
    if (touchStart.current == null) return
    const dx = event.clientX - touchStart.current
    touchStart.current = null
    if (Math.abs(dx) > SWIPE_PX) goTo(index + (dx < 0 ? 1 : -1))
  }

  return (
    <section
      className="hero"
      aria-roledescription="carousel"
      aria-label="Featured titles"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => {
        touchStart.current = null
      }}
    >
      <div className="hero__media" aria-hidden="true">
        {slides.map((slide, i) =>
          visited.has(i) ? (
            <picture key={`${slide.mediaType}-${slide.id}`} className={`hero__slide ${i === index ? 'isActive' : ''}`}>
              <source media="(max-width: 767px)" srcSet={posterSrcSet(slide.posterPath)} sizes="100vw" />
              <img
                src={tmdbImage(slide.backdropPath, 'w1280')}
                srcSet={backdropSrcSet(slide.backdropPath)}
                sizes="100vw"
                alt=""
                decoding="async"
                loading={i === 0 ? 'eager' : 'lazy'}
                {...(i === 0 ? { fetchpriority: 'high' } : {})}
                draggable="false"
              />
            </picture>
          ) : null
        )}
        <div className="hero__scrim" />
      </div>

      <ContentWrapper className="hero__wrap">
        <div className="hero__content" key={`${active.mediaType}-${active.id}`} aria-live={rotating ? 'off' : 'polite'}>
          <p className="hero__eyebrow">
            <span className="badge badge--accent">Trending now</span>
            <span>{meta.join(' · ')}</span>
          </p>
          <h1 className="hero__title">{active.title}</h1>
          <p className="hero__facts">
            {formatRating(active.rating) && (
              <span className="hero__rating">
                <IoStar aria-hidden="true" /> {formatRating(active.rating)}
              </span>
            )}
            {genreNames.length > 0 && <span>{genreNames.join(' · ')}</span>}
          </p>
          <p className="hero__overview">{active.overview}</p>
          <div className="hero__actions">
            <Link to={`/${active.mediaType}/${active.id}`} className="btn btn--primary btn--lg">
              <IoInformationCircleOutline /> More info
            </Link>
            <MyListButton item={active} variant="icon" className="btn--lg" />
          </div>
        </div>
      </ContentWrapper>

      {slides.length > 1 && (
        <>
          <button type="button" className="hero__arrow hero__arrow--prev" aria-label="Previous featured title" onClick={() => goTo(index - 1)}>
            <IoChevronBack />
          </button>
          <button type="button" className="hero__arrow hero__arrow--next" aria-label="Next featured title" onClick={() => goTo(index + 1)}>
            <IoChevronForward />
          </button>
          <div className="hero__dots" role="group" aria-label="Choose featured title">
            {slides.map((slide, i) => (
              <button key={`${slide.mediaType}-${slide.id}`} type="button" className={`hero__dot ${i === index ? 'isActive' : ''}`} aria-label={`Show ${slide.title}`} aria-current={i === index} onClick={() => goTo(i)} />
            ))}
          </div>
        </>
      )}
    </section>
  )
}

export default HeroBanner
