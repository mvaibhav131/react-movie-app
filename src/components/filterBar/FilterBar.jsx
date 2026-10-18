import { IoClose } from 'react-icons/io5'
import './style.scss'

const thisYear = new Date().getFullYear()
const YEARS = Array.from({ length: thisYear - 1949 }, (_, i) => thisYear - i)

const Select = ({ label, value, onChange, children }) => (
  <label className="filterBar__select">
    <span className="srOnly">{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={label}>
      {children}
    </select>
  </label>
)

/**
 * Sort / language / year selects plus multi-select genre chips.
 * Everything is optional: pass only the props for the controls you want.
 */
const FilterBar = ({
  sort,
  sortOptions,
  onSort,
  language,
  languageOptions,
  onLanguage,
  year,
  onYear,
  genreOptions,
  genres = [],
  onGenres,
  onReset,
  dirty,
}) => {
  const toggleGenre = (id) => onGenres(genres.includes(id) ? genres.filter((g) => g !== id) : [...genres, id])

  return (
    <div className="filterBar" role="group" aria-label="Filters">
      <div className="filterBar__row">
        {sortOptions && (
          <Select label="Sort by" value={sort} onChange={onSort}>
            {sortOptions.map((o) => (
              <option key={o.value} value={o.value}>
                Sort: {o.label}
              </option>
            ))}
          </Select>
        )}
        {languageOptions && (
          <Select label="Language" value={language || ''} onChange={onLanguage}>
            <option value="">All languages</option>
            {languageOptions.map((o) => (
              <option key={o.code} value={o.code}>
                {o.label}
              </option>
            ))}
          </Select>
        )}
        {onYear && (
          <Select label="Release year" value={year || ''} onChange={onYear}>
            <option value="">Any year</option>
            {YEARS.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </Select>
        )}
        {dirty && onReset && (
          <button type="button" className="btn btn--ghost btn--sm filterBar__reset" onClick={onReset}>
            <IoClose /> Reset
          </button>
        )}
      </div>

      {genreOptions?.length > 0 && onGenres && (
        <div className="chipRow" role="group" aria-label="Genres">
          {genreOptions.map((g) => (
            <button key={g.id} type="button" className="chip" aria-pressed={genres.includes(g.id)} onClick={() => toggleGenre(g.id)}>
              {g.name}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default FilterBar
