import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IoClose, IoSearchOutline } from 'react-icons/io5'
import { FREE_LANGUAGES, freeMovieToTitle, listFreeMovies } from '../../services/freeMovies'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import useInfiniteTitles from '../../hooks/useInfiniteTitles'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import TitleGrid from '../../components/titleGrid/TitleGrid'
import './style.scss'

const PAGE_SIZE = 24
const DEFAULT_LANGUAGE = 'hi'

/** Every film here plays on VM Flix: complete uploads from the rights holders' own YouTube channels. */
const FreeMovies = () => {
  useDocumentTitle('Free Movies')
  const [params, setParams] = useSearchParams()
  const langParam = params.get('lang')
  const language = langParam === 'all' ? '' : FREE_LANGUAGES.some((l) => l.code === langParam) ? langParam : DEFAULT_LANGUAGE
  const [input, setInput] = useState(params.get('q') || '')
  const query = useDebouncedValue(input.trim(), 250)

  const setLanguage = (code) => {
    const next = new URLSearchParams(params)
    if (code === DEFAULT_LANGUAGE) next.delete('lang')
    else next.set('lang', code || 'all')
    setParams(next, { replace: true })
  }

  const fetchPage = useCallback(
    async (page) => {
      const all = await listFreeMovies({ language, query })
      return {
        results: all.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(freeMovieToTitle).filter(Boolean),
        totalPages: Math.max(1, Math.ceil(all.length / PAGE_SIZE)),
      }
    },
    [language, query]
  )

  const list = useInfiniteTitles(fetchPage, [language, query], { sort: 'latest' })

  return (
    <div className="pageBody freePage">
      <PageHeader eyebrow="Free" title="Free Movies" intro="Full-length films from official YouTube channels. Pick one and it plays right here, newest first.">
        <label className="freePage__search">
          <IoSearchOutline aria-hidden="true" />
          <input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search free movies" aria-label="Search free movies" />
          {input && (
            <button type="button" aria-label="Clear search" onClick={() => setInput('')}>
              <IoClose />
            </button>
          )}
        </label>
        <div className="chipRow" role="group" aria-label="Language">
          <button type="button" className="chip" aria-pressed={!language} onClick={() => setLanguage('')}>
            All
          </button>
          {FREE_LANGUAGES.map((l) => (
            <button key={l.code} type="button" className="chip" aria-pressed={language === l.code} onClick={() => setLanguage(l.code)}>
              {l.label}
            </button>
          ))}
        </div>
      </PageHeader>
      <ContentWrapper>
        <TitleGrid {...list} endpoint="movie" emptyTitle="No free movies here yet" emptyMessage="Try another language or clear the search." />
      </ContentWrapper>
    </div>
  )
}

export default FreeMovies
