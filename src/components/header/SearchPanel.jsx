import { useEffect, useId, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { IoClose, IoSearchOutline, IoTimeOutline, IoArrowBack, IoTrashOutline } from 'react-icons/io5'
import { addSearchTerm, clearSearchHistory, removeSearchTerm } from '../../store/librarySlice'
import { selectSearchHistory } from '../../store/selectors'
import { searchTitles } from '../../services/discover'
import { tmdbImage } from '../../utils/api'
import { languageLabel } from '../../config/languages'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useFocusTrap from '../../hooks/useFocusTrap'
import useScrollLock from '../../hooks/useScrollLock'
import Img from '../lazyLoadImage/Img'

const MIN_CHARS = 2

/** Instant search with debounced suggestions, recent searches and combobox keyboard support. */
const SearchPanel = ({ open, onClose }) => {
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const history = useSelector(selectSearchHistory)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(-1)
  const panelRef = useRef(null)
  const listId = useId()
  const term = query.trim()
  const debounced = useDebouncedValue(term, 300)

  useScrollLock(open)
  useFocusTrap(panelRef, open, onClose)

  const { data, loading, error } = useAsync((signal) => searchTitles(debounced, { signal }), [debounced], {
    enabled: open && debounced.length >= MIN_CHARS,
  })

  useEffect(() => {
    setActive(-1)
  }, [debounced, open])

  if (!open) return null

  const showHistory = term.length < MIN_CHARS
  const suggestions = !showHistory && debounced === term ? (data?.results || []).slice(0, 8) : []
  const options = showHistory ? history.map((value) => ({ kind: 'history', value })) : suggestions.map((title) => ({ kind: 'title', title }))

  const submit = (value) => {
    const q = value.trim()
    if (!q) return
    dispatch(addSearchTerm(q))
    onClose()
    navigate(`/search/${encodeURIComponent(q)}`)
  }

  const choose = (option) => {
    if (option.kind === 'history') {
      submit(option.value)
      return
    }
    dispatch(addSearchTerm(term))
    onClose()
    navigate(`/${option.title.mediaType}/${option.title.id}`)
  }

  const onKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => (options.length ? (i + 1) % options.length : -1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => (options.length ? (i <= 0 ? options.length - 1 : i - 1) : -1))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (active >= 0 && options[active]) choose(options[active])
      else submit(query)
    }
  }

  return (
    <div className="searchPanel" role="dialog" aria-modal="true" aria-label="Search">
      <div className="searchPanel__backdrop" onClick={onClose} aria-hidden="true" />
      <div className="searchPanel__box" ref={panelRef}>
        <div className="searchPanel__bar">
          <button type="button" className="searchPanel__back" aria-label="Close search" onClick={onClose}>
            <IoArrowBack />
          </button>
          <IoSearchOutline className="searchPanel__icon" aria-hidden="true" />
          <input
            data-autofocus
            className="searchPanel__input"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            placeholder="Search movies, shows, web series..."
            aria-label="Search movies, TV shows and web series"
            role="combobox"
            aria-expanded={options.length > 0}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
          {query && (
            <button type="button" className="searchPanel__clear" aria-label="Clear search" onClick={() => setQuery('')}>
              <IoClose />
            </button>
          )}
        </div>

        <div className="searchPanel__body">
          {showHistory && history.length > 0 && (
            <div className="searchPanel__label">
              <span>Recent searches</span>
              <button type="button" onClick={() => dispatch(clearSearchHistory())}>
                <IoTrashOutline /> Clear
              </button>
            </div>
          )}
          {showHistory && history.length === 0 && <p className="searchPanel__hint">Type at least {MIN_CHARS} letters to search titles.</p>}
          {!showHistory && loading && <p className="searchPanel__hint">Searching...</p>}
          {!showHistory && error && <p className="searchPanel__hint">Search is unavailable right now. Press Enter to try the full search.</p>}
          {!showHistory && !loading && !error && debounced === term && suggestions.length === 0 && (
            <p className="searchPanel__hint">No matches for &ldquo;{term}&rdquo;. Press Enter to search everything.</p>
          )}

          <ul id={listId} className="searchPanel__list" role="listbox" aria-label={showHistory ? 'Recent searches' : 'Suggestions'}>
            {options.map((option, index) => (
              <li
                key={option.kind === 'history' ? `h-${option.value}` : `${option.title.mediaType}-${option.title.id}`}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={`searchPanel__item ${index === active ? 'isActive' : ''}`}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(option)}
              >
                {option.kind === 'history' ? (
                  <>
                    <IoTimeOutline className="searchPanel__itemIcon" aria-hidden="true" />
                    <span className="searchPanel__itemTitle">{option.value}</span>
                    <button
                      type="button"
                      className="searchPanel__remove"
                      aria-label={`Remove ${option.value} from recent searches`}
                      onClick={(event) => {
                        event.stopPropagation()
                        dispatch(removeSearchTerm(option.value))
                      }}
                    >
                      <IoClose />
                    </button>
                  </>
                ) : (
                  <>
                    <span className="searchPanel__thumb">
                      <Img src={tmdbImage(option.title.posterPath, 'w92')} ratio="2 / 3" />
                    </span>
                    <span className="searchPanel__itemText">
                      <span className="searchPanel__itemTitle">{option.title.title}</span>
                      <span className="searchPanel__itemMeta">
                        {[option.title.mediaType === 'tv' ? 'TV Show' : 'Movie', option.title.year, languageLabel(option.title.language)].filter(Boolean).join(' · ')}
                      </span>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>

          {!showHistory && term && (
            <button type="button" className="searchPanel__all" onClick={() => submit(query)}>
              <IoSearchOutline /> See all results for &ldquo;{term}&rdquo;
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default SearchPanel
