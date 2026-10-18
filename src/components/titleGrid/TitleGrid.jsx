import MovieCard from '../movieCard/MovieCard'
import Spinner from '../spinner/Spinner'
import { EmptyState, ErrorState } from '../states/States'
import './style.scss'

const SKELETONS = 18

/**
 * Responsive poster grid with skeletons, empty/error states and an infinite-scroll sentinel.
 * Feed it the object returned by useInfiniteTitles.
 */
const TitleGrid = ({
  items,
  loading,
  loadingMore,
  error,
  hasMore,
  sentinelRef,
  retry,
  endpoint,
  emptyTitle = 'No titles found',
  emptyMessage = 'Try changing or clearing your filters.',
  emptyAction,
  renderBadge,
}) => {
  if (loading) {
    return (
      <div className="titleGrid" aria-busy="true">
        {Array.from({ length: SKELETONS }, (_, i) => (
          <div key={i} className="titleGrid__skeleton" aria-hidden="true">
            <div className="skeleton skeletonCard__art" />
            <div className="skeleton skeletonCard__line" />
            <div className="skeleton skeletonCard__line skeletonCard__line--short" />
          </div>
        ))}
      </div>
    )
  }

  if (error && !items.length) return <ErrorState error={error} onRetry={retry} title="Couldn't load titles" />
  if (!items.length) return <EmptyState title={emptyTitle} message={emptyMessage} action={emptyAction} />

  return (
    <>
      <div className="titleGrid">
        {items.map((item, index) => (
          <MovieCard key={`${item.mediaType}:${item.id}`} data={item} endpoint={endpoint} priority={index < 4} badge={renderBadge?.(item)} />
        ))}
      </div>
      {error && <ErrorState error={error} onRetry={retry} compact title="Couldn't load more" />}
      {loadingMore && <Spinner />}
      <div ref={sentinelRef} className="titleGrid__sentinel" aria-hidden="true" />
      {!hasMore && items.length > 0 && !error && <p className="titleGrid__end">You&apos;ve reached the end.</p>}
    </>
  )
}

export default TitleGrid
