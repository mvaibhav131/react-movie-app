import { useSelector } from 'react-redux'
import { selectGenres } from '../../store/selectors'
import './style.scss'

/** Genre labels for a list of TMDB genre ids (ids unknown to the loaded genre map are skipped). */
const Genres = ({ data, limit, variant = 'chips' }) => {
  const genres = useSelector(selectGenres)
  const names = (data || [])
    .map((id) => genres[id]?.name)
    .filter(Boolean)
    .slice(0, limit)
  if (!names.length) return null
  return (
    <ul className={`genres genres--${variant}`} aria-label="Genres">
      {names.map((name) => (
        <li key={name} className="genre">
          {name}
        </li>
      ))}
    </ul>
  )
}

export default Genres
