import { useCallback, useEffect, useMemo } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { addSearchTerm } from '../../store/librarySlice'
import { selectSearchHistory } from '../../store/selectors'
import { searchTitles } from '../../services/discover'
import { languageLabel } from '../../config/languages'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import useInfiniteTitles from '../../hooks/useInfiniteTitles'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import TitleGrid from '../../components/titleGrid/TitleGrid'
import { EmptyState } from '../../components/states/States'

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'movie', label: 'Movies' },
  { value: 'tv', label: 'TV Shows' },
]

const SearchResult = () => {
  const { query: routeQuery } = useParams()
  const [params, setParams] = useSearchParams()
  const query = (routeQuery || params.get('q') || '').trim()
  const type = TYPES.some((t) => t.value === params.get('type')) ? params.get('type') : 'all'
  const lang = params.get('lang') || ''
  const history = useSelector(selectSearchHistory)
  const dispatch = useDispatch()
  useDocumentTitle(query ? `Search: ${query}` : 'Search')

  useEffect(() => {
    if (query) dispatch(addSearchTerm(query))
  }, [query, dispatch])

  const fetchPage = useCallback((page, signal) => searchTitles(query, { page, signal }), [query])
  const list = useInfiniteTitles(fetchPage, [query], { sort: 'none', enabled: query.length > 0 })

  const languages = useMemo(() => {
    const counts = new Map()
    list.items.forEach((t) => t.language && counts.set(t.language, (counts.get(t.language) || 0) + 1))
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([code]) => code)
  }, [list.items])

  const items = useMemo(
    () => list.items.filter((t) => (type === 'all' || t.mediaType === type) && (!lang || t.language === lang)),
    [list.items, type, lang]
  )

  const setFilter = (key, value) => {
    const next = new URLSearchParams(params)
    if (value && value !== 'all') next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  if (!query) {
    return (
      <div className="pageBody">
        <PageHeader title="Search" intro="Find movies, TV shows and web series. Press / anywhere to open search." />
        <ContentWrapper>
          {history.length > 0 ? (
            <div className="chipRow" aria-label="Recent searches">
              {history.map((term) => (
                <Link key={term} className="chip" to={`/search/${encodeURIComponent(term)}`}>
                  {term}
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState title="Start typing to search" message="Use the search button in the header." />
          )}
        </ContentWrapper>
      </div>
    )
  }

  return (
    <div className="pageBody">
      <PageHeader title={`Results for “${query}”`} intro={!list.loading && !list.error ? `${items.length}${list.hasMore ? '+' : ''} ${items.length === 1 ? 'title' : 'titles'} found` : undefined}>
        <div className="chipRow" role="group" aria-label="Filter results">
          {TYPES.map((t) => (
            <button key={t.value} type="button" className="chip" aria-pressed={type === t.value} onClick={() => setFilter('type', t.value)}>
              {t.label}
            </button>
          ))}
          {languages.length > 1 && <span className="srOnly">Language filters</span>}
          {languages.length > 1 &&
            languages.map((code) => (
              <button key={code} type="button" className="chip" aria-pressed={lang === code} onClick={() => setFilter('lang', lang === code ? '' : code)}>
                {languageLabel(code)}
              </button>
            ))}
        </div>
      </PageHeader>
      <ContentWrapper>
        <TitleGrid
          {...list}
          items={items}
          emptyTitle={`No results for “${query}”`}
          emptyMessage="Check the spelling, try a shorter title, or remove the filters."
        />
      </ContentWrapper>
    </div>
  )
}

export default SearchResult
