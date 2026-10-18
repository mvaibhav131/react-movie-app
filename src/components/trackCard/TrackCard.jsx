import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { IoHeart, IoHeartOutline, IoPlay } from 'react-icons/io5'
import { toggleFavoriteTrack } from '../../store/librarySlice'
import { selectMusicLibrary } from '../../store/selectors'
import { toStoredTrack } from '../../services/music/musicService'
import { formatClock, formatCount } from '../../utils/format'
import Img from '../lazyLoadImage/Img'
import './style.scss'

const TrackCard = memo(function TrackCard({ track, onPlay }) {
  const dispatch = useDispatch()
  const { favorites } = useSelector(selectMusicLibrary)
  const favorite = favorites.some((f) => f.id === track.id)

  return (
    <article className="trackCard">
      <button type="button" className="trackCard__play" onClick={() => onPlay(track)} aria-label={`Play ${track.title} by ${track.artist}`}>
        <span className="trackCard__art">
          <Img src={track.thumbnail} ratio="16 / 9" />
          <span className="trackCard__overlay" aria-hidden="true">
            <IoPlay />
          </span>
          {track.duration > 0 && <span className="trackCard__time">{formatClock(track.duration)}</span>}
        </span>
        <span className="trackCard__title">{track.title}</span>
        <span className="trackCard__artist">{[track.artist, track.views ? `${formatCount(track.views)} views` : ''].filter(Boolean).join(' · ')}</span>
      </button>
      <button
        type="button"
        className={`trackCard__fav ${favorite ? 'isOn' : ''}`}
        aria-pressed={favorite}
        aria-label={favorite ? `Remove ${track.title} from favourites` : `Add ${track.title} to favourites`}
        onClick={() => dispatch(toggleFavoriteTrack(toStoredTrack(track)))}
      >
        {favorite ? <IoHeart /> : <IoHeartOutline />}
      </button>
    </article>
  )
})

export default TrackCard
