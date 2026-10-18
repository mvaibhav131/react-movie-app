import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IoClose, IoSearchOutline } from 'react-icons/io5'
import { GENRE } from '../../config/languages'
import { discoverTitles, recentWindow, searchWithinLanguage } from '../../services/discover'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useInfiniteTitles from '../../hooks/useInfiniteTitles'
import ContentWrapper from '../contentWrapper/ContentWrapper'
import SwitchTab from '../switchTabs/SwitchTab'
import TitleGrid from '../titleGrid/TitleGrid'
import { EmptyState, ErrorState } from '../states/States'
import './style.scss'

const TABS = [
  { id: 'latest', label: 'Latest', sort: 'latest', query: { minVotes: 1 } },
  { id: 'trending', label: 'Trending', sort: 'popularity', query: () => ({ since: recentWindow(180), minVotes: 1 }) },
  { id: 'popular', label: 'Popular', sort: 'popularity', query: { minVotes: 5 } },
  { id: 'classics', label: 'Classics', sort: 'rating', query: { until: '1999-12-31', minVotes: 3 } },
  { id: 'upcoming', label: 'Coming soon', sort: 'year_asc', query: { upcoming: true } },
]

const GENRES = [
  { id: GENRE.comedy, name: 'Comedy' },
  { id: GENRE.drama, name: 'Drama' },
  { id: GENRE.romance, name: 'Romance' },
  { id: GENRE.thriller, name: 'Thriller' },
  { id: GENRE.action, name: 'Action' },
  { id: GENRE.family, name: 'Family' },
]

const parseIds = (value) =>
  (value || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

/**
 * Movies of one original language: tabs (latest / trending / popular / classics / upcoming), genre chips and a
 * search that only returns titles in that language. State lives in the URL.
 */
const LanguageHub = ({ language, label }) => {
  const [params, setParams] = useSearchParams()
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS[0]
  const genres = useMemo(() => parseIds(params.get('genre')), [params])
  const genreKey = genres.join(',')
  const urlQuery = params.get('q') || ''
  const [input, setInput] = useState(urlQuery)
  const debounced = useDebouncedValue(input.trim(), 350)

  const update = useCallback(
    (changes) => {
      const next = new URLSearchParams(params)
      Object.entries(changes).forEach(([key, value]) => {
        if (!value || (Array.isArray(value) && !value.length)) next.delete(key)
        else next.set(key, Array.isArray(value) ? value.join(',') : value)
      })
      setParams(next, { replace: true })
    },
    [params, setParams]
  )

  useEffect(() => {
    const wanted = debounced.length >= 2 ? debounced : ''
    if (wanted !== urlQuery) update({ q: wanted })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced])

  const searching = urlQuery.length >= 2

  const search = useAsync((signal) => searchWithinLanguage(urlQuery, language, { signal }), [urlQuery, language], { enabled: searching })
  const searchItems = useMemo(
    () => (genres.length ? (search.data || []).filter((t) => t.genreIds.some((g) => genres.includes(g))) : search.data || []),
    [search.data, genres]
  )

  const fetchPage = useCallback(
    (page, signal) => {
      const extra = typeof tab.query === 'function' ? tab.query() : tab.query
      return discoverTitles({ mediaType: 'movie', language, genres, sort: tab.sort === 'year_asc' ? 'popularity' : tab.sort, page, ...extra }, { signal })
    },
    // genreKey stands in for the genres array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [language, tab, genreKey]
  )
  const list = useInfiniteTitles(fetchPage, [language, tab.id, genreKey], { sort: tab.sort, enabled: !searching })

  return (
    <ContentWrapper className="langHub">
      <div className="langHub__search">
        <IoSearchOutline aria-hidden="true" />
        <input
          type="search"
          inputMode="search"
          enterKeyHint="search"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={`Search ${label} movies`}
          aria-label={`Search ${label} movies`}
        />
        {input && (
          <button type="button" aria-label="Clear search" onClick={() => setInput('')}>
            <IoClose />
          </button>
        )}
      </div>

      <div className="chipRow" role="group" aria-label="Genres">
        <button type="button" className="chip" aria-pressed={genres.length === 0} onClick={() => update({ genre: [] })}>
          All genres
        </button>
        {GENRES.map((g) => (
          <button
            key={g.id}
            type="button"
            className="chip"
            aria-pressed={genres.includes(g.id)}
            onClick={() => update({ genre: genres.includes(g.id) ? genres.filter((x) => x !== g.id) : [...genres, g.id] })}
          >
            {g.name}
          </button>
        ))}
      </div>

      {searching ? (
        <section aria-live="polite" className="langHub__results">
          <h2 className="langHub__heading">
            {label} results for &ldquo;{urlQuery}&rdquo;
          </h2>
          {search.loading ? (
            <TitleGrid items={[]} loading />
          ) : search.error ? (
            <ErrorState error={search.error} onRetry={search.reload} />
          ) : searchItems.length ? (
            <TitleGrid items={searchItems} hasMore={false} endpoint="movie" />
          ) : (
            <EmptyState title={`No ${label} movies match “${urlQuery}”`} message={`Only titles whose original language is ${label} are shown. Check the spelling or try a shorter name.`} />
          )}
        </section>
      ) : (
        <>
          <div className="langHub__tabs">
            <SwitchTab
              data={TABS.map((t) => t.label)}
              value={tab.label}
              label={`${label} movie lists`}
              onTabChange={(labelText) => {
                const id = TABS.find((t) => t.label === labelText).id
                update({ tab: id === 'latest' ? '' : id })
              }}
            />
          </div>
          <TitleGrid
            {...list}
            endpoint="movie"
            emptyTitle={`No ${label} movies here yet`}
            emptyMessage={genres.length ? 'Try removing a genre filter.' : 'Check back soon.'}
          />
        </>
      )}
    </ContentWrapper>
  )
}

export default LanguageHub
