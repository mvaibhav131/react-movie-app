import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { IoClose } from 'react-icons/io5'
import { removeFromMyList } from '../../store/librarySlice'
import { selectMyList } from '../../store/selectors'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import MovieCard from '../../components/movieCard/MovieCard'
import { EmptyState } from '../../components/states/States'
import '../../components/titleGrid/style.scss'
import './style.scss'

const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
]

const SORTS = {
  added: (a, b) => (b.addedAt || 0) - (a.addedAt || 0),
  title: (a, b) => a.title.localeCompare(b.title),
  year: (a, b) => (b.year || 0) - (a.year || 0),
}

const Section = ({ title, items, onRemove }) =>
  items.length ? (
    <section className="myList__section" aria-label={title}>
      <h2 className="myList__heading">
        {title} <span>{items.length}</span>
      </h2>
      <div className="titleGrid">
        {items.map((item) => (
          <div key={`${item.mediaType}:${item.id}`} className="myList__item">
            <MovieCard data={item} showList={false} />
            <button type="button" className="myList__remove" aria-label={`Remove ${item.title} from My List`} onClick={() => onRemove(item)}>
              <IoClose />
            </button>
          </div>
        ))}
      </div>
    </section>
  ) : null

const MyList = () => {
  useDocumentTitle('My List')
  const list = useSelector(selectMyList)
  const dispatch = useDispatch()
  const [filter, setFilter] = useState('all')
  const [sort, setSort] = useState('added')

  const { movies, shows } = useMemo(() => {
    const sorted = [...list].sort(SORTS[sort])
    return { movies: sorted.filter((t) => t.mediaType === 'movie'), shows: sorted.filter((t) => t.mediaType === 'tv') }
  }, [list, sort])

  return (
    <div className="pageBody">
      <PageHeader title="My List" intro={list.length ? `${list.length} saved ${list.length === 1 ? 'title' : 'titles'}, stored on this device.` : undefined}>
        {list.length > 0 && (
          <div className="myList__controls">
            <div className="chipRow" role="group" aria-label="Show">
              {FILTERS.map((f) => (
                <button key={f.value} type="button" className="chip" aria-pressed={filter === f.value} onClick={() => setFilter(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>
            <label className="myList__sort">
              <span className="srOnly">Sort by</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)} aria-label="Sort My List">
                <option value="added">Recently added</option>
                <option value="title">Title A–Z</option>
                <option value="year">Release year</option>
              </select>
            </label>
          </div>
        )}
      </PageHeader>
      <ContentWrapper>
        {list.length === 0 ? (
          <EmptyState
            title="Your list is empty"
            message="Tap the + on any movie or show to save it here for later."
            action={
              <Link to="/movies" className="btn btn--primary">
                Browse movies
              </Link>
            }
          />
        ) : (
          <>
            {filter !== 'tv' && <Section title="Movies" items={movies} onRemove={(item) => dispatch(removeFromMyList(item))} />}
            {filter !== 'movie' && <Section title="TV Shows" items={shows} onRemove={(item) => dispatch(removeFromMyList(item))} />}
            {((filter === 'movie' && !movies.length) || (filter === 'tv' && !shows.length)) && (
              <EmptyState title={`No ${filter === 'movie' ? 'movies' : 'shows'} saved yet`} message="Switch the filter to see everything in your list." />
            )}
          </>
        )}
      </ContentWrapper>
    </div>
  )
}

export default MyList
