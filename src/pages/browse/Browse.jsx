import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BROWSE_LANGUAGES } from '../../config/languages'
import { discoverTitles, SORT_OPTIONS, yearsAgo } from '../../services/discover'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import useFetch from '../../hooks/useFetch'
import useInfiniteTitles from '../../hooks/useInfiniteTitles'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import FilterBar from '../../components/filterBar/FilterBar'
import TitleGrid from '../../components/titleGrid/TitleGrid'

const KINDS = {
  movie: {
    mediaType: 'movie',
    title: 'Movies',
    intro: 'The newest releases first. Sort by popularity or rating, or filter by language, genre and year.',
    defaultSort: 'latest',
    document: 'Movies',
  },
  tv: {
    mediaType: 'tv',
    title: 'TV Shows',
    intro: 'The newest Hindi series first. Change the language, genre or first-air year.',
    defaultSort: 'latest',
    document: 'TV Shows',
  },
  web: {
    mediaType: 'tv',
    title: 'Web Series',
    intro: 'The newest Hindi web series first. Change the language, genre or first-air year.',
    defaultSort: 'latest',
    ott: true,
    document: 'Web Series',
  },
}

const DEFAULT_LANGUAGE = 'hi'

const parseIds = (value) =>
  (value || '')
    .split(',')
    .map(Number)
    .filter((n) => Number.isInteger(n) && n > 0)

/** Filter state lives in the URL so back/forward and shared links restore it. */
const Browse = ({ kind = 'movie' }) => {
  const config = KINDS[kind] || KINDS.movie
  const [params, setParams] = useSearchParams()
  useDocumentTitle(config.document)

  const sort = SORT_OPTIONS.some((o) => o.value === params.get('sort')) ? params.get('sort') : config.defaultSort
  const language = params.get('lang') === 'all' ? '' : params.get('lang') || DEFAULT_LANGUAGE
  const year = params.get('year') || ''
  const genres = useMemo(() => parseIds(params.get('genre')), [params])
  const genreKey = genres.join(',')

  const update = useCallback(
    (changes) => {
      const next = new URLSearchParams(params)
      Object.entries(changes).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '' || (Array.isArray(value) && !value.length)) next.delete(key)
        else next.set(key, Array.isArray(value) ? value.join(',') : value)
      })
      setParams(next, { replace: true })
    },
    [params, setParams]
  )

  const { data: genreData } = useFetch(`/genre/${config.mediaType}/list`)

  const fetchPage = useCallback(
    (page, signal) =>
      discoverTitles(
        {
          mediaType: config.mediaType,
          ott: config.ott,
          sort,
          language: language || undefined,
          genres,
          year: year || undefined,
          page,
          // Unfiltered "latest" would surface obscure uploads, so require real theatrical releases with some votes.
          ...(sort === 'latest' && !language && config.mediaType === 'movie' ? { minVotes: 10, releaseType: '2|3' } : {}),
          ...(sort === 'latest' && language ? { minVotes: 1 } : {}),
          ...(config.ott && !year && sort === 'popularity' ? { since: yearsAgo(3), minVotes: 5 } : {}),
        },
        { signal }
      ),
    // genreKey stands in for the genres array
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config, sort, language, year, genreKey]
  )

  const list = useInfiniteTitles(fetchPage, [kind, sort, language, year, genreKey], { sort })
  const dirty = !!(language !== DEFAULT_LANGUAGE || year || genres.length || sort !== config.defaultSort)

  return (
    <div className="pageBody">
      <PageHeader title={config.title} intro={config.intro}>
        <FilterBar
          sort={sort}
          sortOptions={SORT_OPTIONS}
          onSort={(value) => update({ sort: value === config.defaultSort ? '' : value })}
          language={language}
          languageOptions={BROWSE_LANGUAGES}
          onLanguage={(value) => update({ lang: value === DEFAULT_LANGUAGE ? '' : value || 'all' })}
          year={year}
          onYear={(value) => update({ year: value })}
          genreOptions={genreData?.genres}
          genres={genres}
          onGenres={(ids) => update({ genre: ids })}
          dirty={dirty}
          onReset={() => setParams({}, { replace: true })}
        />
      </PageHeader>
      <ContentWrapper>
        <TitleGrid
          {...list}
          endpoint={config.mediaType}
          emptyAction={
            dirty ? (
              <button type="button" className="btn btn--outline btn--sm" onClick={() => setParams({}, { replace: true })}>
                Clear filters
              </button>
            ) : null
          }
        />
      </ContentWrapper>
    </div>
  )
}

export default Browse
