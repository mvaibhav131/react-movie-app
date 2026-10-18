import { memo, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { IoPlay } from 'react-icons/io5'
import { normalizeTitle } from '../../services/normalize'
import { posterSrcSet, backdropSrcSet, tmdbImage } from '../../utils/api'
import { languageLabel } from '../../config/languages'
import { formatRating, trustedRating } from '../../utils/format'
import useFreeMovieIds from '../../hooks/useFreeMovieIds'
import Img from '../lazyLoadImage/Img'
import RatingBadge from '../ratingBadge/RatingBadge'
import MyListButton from '../myListButton/MyListButton'
import './style.scss'

const POSTER_SIZES = '(min-width: 1600px) 210px, (min-width: 768px) 190px, 30vw'
const LANDSCAPE_SIZES = '(min-width: 768px) 340px, 62vw'

/**
 * Reusable title card used by rails, grids and search results.
 * Accepts raw TMDB results or normalised titles.
 */
const MovieCard = memo(function MovieCard({
  data,
  mediaType,
  endpoint,
  variant = 'poster',
  progress = 0,
  subtitle,
  badge,
  to,
  showRating = true,
  showList = true,
  priority = false,
}) {
  const item = useMemo(() => normalizeTitle(data, mediaType || endpoint), [data, mediaType, endpoint])
  const freeIds = useFreeMovieIds()
  if (!item) return null

  const label = badge || (item.mediaType === 'movie' && freeIds?.has(item.id) ? 'Free' : null)
  const landscape = variant === 'landscape'
  const art = landscape ? item.backdropPath || item.posterPath : item.posterPath
  const href = to || `/${item.mediaType}/${item.id}`
  const lang = item.language && item.language !== 'en' ? languageLabel(item.language) : ''
  const meta = subtitle || [item.year, lang, item.mediaType === 'tv' ? 'TV' : ''].filter(Boolean).join(' · ')
  const rating = trustedRating(item)
  const ratingText = formatRating(rating)

  return (
    <article className={`movieCard movieCard--${variant}`}>
      <Link to={href} className="movieCard__link" aria-label={`${item.title}${item.year ? `, ${item.year}` : ''}${ratingText ? `, rated ${ratingText}` : ''}`}>
        <div className="movieCard__art">
          <Img
            src={tmdbImage(art, landscape ? 'w780' : 'w342')}
            srcSet={landscape ? backdropSrcSet(art) : posterSrcSet(art)}
            sizes={landscape ? LANDSCAPE_SIZES : POSTER_SIZES}
            ratio={landscape ? '16 / 9' : '2 / 3'}
            priority={priority}
          />
          <span className="movieCard__shade" aria-hidden="true" />
          {showRating && <span className="movieCard__rating"><RatingBadge rating={rating} size="sm" /></span>}
          {label && <span className="badge badge--accent movieCard__badge">{label}</span>}
          <span className="movieCard__play" aria-hidden="true">
            <IoPlay />
          </span>
          {progress > 0 && (
            <span className="movieCard__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
              <i style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }} />
            </span>
          )}
        </div>
        <div className="movieCard__meta">
          <h3 className="movieCard__title">{item.title}</h3>
          {meta && <p className="movieCard__sub">{meta}</p>}
        </div>
      </Link>
      {showList && <MyListButton item={item} variant="card" />}
    </article>
  )
})

export default MovieCard
