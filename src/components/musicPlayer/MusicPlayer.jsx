import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IoAdd, IoCheckmark, IoHeart, IoHeartOutline, IoOpenOutline, IoPlaySkipBack, IoPlaySkipForward } from 'react-icons/io5'
import { MdPlaylistAdd } from 'react-icons/md'
import { addRecentTrack, addToPlaylist, createPlaylist, toggleFavoriteTrack } from '../../store/librarySlice'
import { selectMusicLibrary } from '../../store/selectors'
import { toStoredTrack } from '../../services/music/musicService'
import { formatClock } from '../../utils/format'
import Modal from '../modal/Modal'
import YouTubePlayer from '../youtubePlayer/YouTubePlayer'
import Img from '../lazyLoadImage/Img'
import './style.scss'

const PlaylistSheet = ({ track, onClose }) => {
  const dispatch = useDispatch()
  const { playlists } = useSelector(selectMusicLibrary)
  const [name, setName] = useState('')

  const create = (event) => {
    event.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    const id = crypto.randomUUID()
    dispatch(createPlaylist({ id, name: trimmed }))
    dispatch(addToPlaylist({ playlistId: id, track: toStoredTrack(track) }))
    toast.success(`Added to “${trimmed}”`)
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Add to playlist" size="sheet">
      <h2 className="musicSheet__title">Add to playlist</h2>
      <p className="musicSheet__sub">{track.title}</p>
      <ul className="musicSheet__list">
        {playlists.map((playlist) => {
          const has = playlist.items.some((t) => t.id === track.id)
          return (
            <li key={playlist.id}>
              <button
                type="button"
                className="musicSheet__row"
                disabled={has}
                onClick={() => {
                  dispatch(addToPlaylist({ playlistId: playlist.id, track: toStoredTrack(track) }))
                  toast.success(`Added to “${playlist.name}”`)
                  onClose()
                }}
              >
                <span>{playlist.name}</span>
                <small>{has ? 'Already added' : `${playlist.items.length} songs`}</small>
                {has ? <IoCheckmark aria-hidden="true" /> : <IoAdd aria-hidden="true" />}
              </button>
            </li>
          )
        })}
      </ul>
      <form className="musicSheet__new" onSubmit={create}>
        <input value={name} onChange={(event) => setName(event.target.value)} placeholder="New playlist name" maxLength={60} aria-label="New playlist name" />
        <button type="submit" className="btn btn--primary btn--sm" disabled={!name.trim()}>
          Create
        </button>
      </form>
    </Modal>
  )
}

/** Plays a song through YouTube's official embed, with a "next up" queue, favourites and playlists. */
const MusicPlayer = ({ queue, index, onIndex, onClose }) => {
  const dispatch = useDispatch()
  const { favorites } = useSelector(selectMusicLibrary)
  const [picker, setPicker] = useState(false)
  const track = queue[index]
  const favorite = !!track && favorites.some((f) => f.id === track.id)

  useEffect(() => {
    if (track) dispatch(addRecentTrack(toStoredTrack(track)))
  }, [track, dispatch])

  if (!track) return null
  const hasNext = index < queue.length - 1
  const upNext = queue.slice(index + 1, index + 9)

  return (
    <>
      <Modal open onClose={onClose} title={`Playing ${track.title}`} size="player">
        <YouTubePlayer key={track.id} videoId={track.id} title={track.title} onEnded={() => hasNext && onIndex(index + 1)} />
        <div className="musicPlayer__body">
          <div className="musicPlayer__info">
            <h2>{track.title}</h2>
            <p>{[track.artist, track.channel !== track.artist ? track.channel : ''].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="musicPlayer__actions">
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Previous song" disabled={index === 0} onClick={() => onIndex(index - 1)}>
              <IoPlaySkipBack />
            </button>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Next song" disabled={!hasNext} onClick={() => onIndex(index + 1)}>
              <IoPlaySkipForward />
            </button>
            <button type="button" className={`btn btn--ghost btn--icon ${favorite ? 'isOn' : ''}`} aria-pressed={favorite} aria-label={favorite ? 'Remove from favourites' : 'Add to favourites'} onClick={() => dispatch(toggleFavoriteTrack(toStoredTrack(track)))}>
              {favorite ? <IoHeart /> : <IoHeartOutline />}
            </button>
            <button type="button" className="btn btn--ghost btn--icon" aria-label="Add to playlist" onClick={() => setPicker(true)}>
              <MdPlaylistAdd />
            </button>
            <a className="btn btn--ghost btn--icon" href={`https://www.youtube.com/watch?v=${encodeURIComponent(track.id)}`} target="_blank" rel="noopener noreferrer" aria-label="Open on YouTube">
              <IoOpenOutline />
            </a>
          </div>
        </div>
        {upNext.length > 0 && (
          <section className="musicPlayer__queue" aria-label="Up next">
            <h3>Up next</h3>
            <ul>
              {upNext.map((item, i) => (
                <li key={item.id}>
                  <button type="button" onClick={() => onIndex(index + 1 + i)}>
                    <span className="musicPlayer__thumb">
                      <Img src={item.thumbnail} ratio="16 / 9" />
                    </span>
                    <span className="musicPlayer__qtext">
                      <strong>{item.title}</strong>
                      <small>{item.artist}</small>
                    </span>
                    {item.duration > 0 && <span className="musicPlayer__qtime">{formatClock(item.duration)}</span>}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </Modal>
      {picker && <PlaylistSheet track={track} onClose={() => setPicker(false)} />}
    </>
  )
}

export default MusicPlayer
