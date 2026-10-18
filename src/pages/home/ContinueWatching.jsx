import { useDispatch, useSelector } from 'react-redux'
import { IoClose } from 'react-icons/io5'
import { clearProgress } from '../../store/librarySlice'
import { selectContinueWatching } from '../../store/selectors'
import { watchPath } from '../../config/routes'
import { formatClock } from '../../utils/format'
import Carousel from '../../components/carousel/Carousel'
import MovieCard from '../../components/movieCard/MovieCard'
import './style.scss'

const describe = (item, entry) => {
  if (item.mediaType === 'tv') {
    if (entry.completed && entry.next) return `Next up: S${entry.next.season} E${entry.next.episode}`
    return `S${entry.season} E${entry.episode}${entry.episodeTitle ? ` · ${entry.episodeTitle}` : ''}`
  }
  const left = Math.max(0, (entry.duration || 0) - (entry.position || 0))
  return left ? `${formatClock(left)} left` : 'Resume'
}

const ContinueCard = ({ item, onRemove }) => {
  const { entry } = item
  const next = entry.completed ? entry.next : null
  const to = watchPath(item.mediaType, item.id, next ? { season: next.season, episode: next.episode } : item.mediaType === 'tv' ? { season: entry.season, episode: entry.episode } : {})
  return (
    <div className="continueCard">
      <MovieCard data={item} variant="landscape" to={to} progress={next ? 0 : entry.percent} subtitle={describe(item, entry)} showRating={false} showList={false} />
      <button type="button" className="continueCard__remove" aria-label={`Remove ${item.title} from Continue Watching`} onClick={() => onRemove(entry.key)}>
        <IoClose />
      </button>
    </div>
  )
}

/** Resume rail built from saved playback progress. Renders nothing for a new viewer. */
const ContinueWatching = () => {
  const entries = useSelector(selectContinueWatching)
  const dispatch = useDispatch()
  if (!entries.length) return null
  const data = entries.map((entry) => ({ ...entry.title, entry }))
  return <Carousel title="Continue Watching" variant="landscape" data={data} renderItem={(item) => <ContinueCard item={item} onRemove={(key) => dispatch(clearProgress(key))} />} />
}

export default ContinueWatching
