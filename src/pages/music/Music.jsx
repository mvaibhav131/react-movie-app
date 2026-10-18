import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { IoClose, IoOpenOutline, IoPlay, IoSearchOutline, IoTrashOutline } from 'react-icons/io5'
import { deletePlaylist } from '../../store/librarySlice'
import { selectMusicLibrary } from '../../store/selectors'
import { MUSIC_CATEGORIES, MUSIC_CHANNELS, MUSIC_LANGUAGES } from '../../config/music'
import { loadCategory, loadLanguageSongs, musicConfigured, searchMusic } from '../../services/music/musicService'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import Carousel from '../../components/carousel/Carousel'
import LazySection from '../../components/lazySection/LazySection'
import TrackCard from '../../components/trackCard/TrackCard'
import MusicPlayer from '../../components/musicPlayer/MusicPlayer'
import Modal from '../../components/modal/Modal'
import YouTubePlayer from '../../components/youtubePlayer/YouTubePlayer'
import { EmptyState, ErrorState } from '../../components/states/States'
import './style.scss'

const TrackRail = ({ title, load, deps, onPlay }) => {
  const { data, loading, error, reload } = useAsync(load, deps)
  return (
    <Carousel
      className="carousel--track"
      variant="landscape"
      title={title}
      data={data}
      loading={loading}
      error={error}
      onRetry={reload}
      hideWhenEmpty
      renderItem={(track) => <TrackCard track={track} onPlay={(t) => onPlay(t, data)} />}
    />
  )
}

const StoredRail = ({ title, tracks, onPlay }) =>
  tracks.length ? <Carousel className="carousel--track" variant="landscape" title={title} data={tracks} renderItem={(track) => <TrackCard track={track} onPlay={(t) => onPlay(t, tracks)} />} /> : null

/** Shown when no YouTube Data API key is configured: official label channels play through YouTube's embed. */
const LabelShelf = ({ language }) => {
  const [open, setOpen] = useState(null)
  const channels = MUSIC_CHANNELS.filter((c) => !language || c.languages.includes(language))
  return (
    <>
      <section className="music__setup" aria-labelledby="music-setup">
        <h2 id="music-setup">Official label channels</h2>
        <p>
          Play each label&apos;s newest uploads straight from its official channel. Search, trending and language shelves appear here once a YouTube Data API key is configured for this site.
          {import.meta.env.DEV && (
            <>
              {' '}
              Add <code>VITE_YOUTUBE_API_KEY</code> to <code>.env.local</code>.
            </>
          )}
        </p>
      </section>
      <ul className="music__labels">
        {channels.map((channel) => (
          <li key={channel.id} className="music__label">
            <div>
              <strong>{channel.name}</strong>
              <small>{channel.languages.map((l) => MUSIC_LANGUAGES.find((m) => m.id === l)?.label || l).join(' · ')}</small>
            </div>
            <div className="music__labelActions">
              {channel.embed ? (
                <>
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => setOpen(channel)}>
                    <IoPlay /> Play latest
                  </button>
                  <a className="btn btn--ghost btn--sm btn--icon" href={`https://www.youtube.com/channel/${channel.channelId}`} target="_blank" rel="noopener noreferrer" aria-label={`Open ${channel.name} on YouTube`}>
                    <IoOpenOutline />
                  </a>
                </>
              ) : (
                <a className="btn btn--outline btn--sm" href={`https://www.youtube.com/channel/${channel.channelId}`} target="_blank" rel="noopener noreferrer" title="This label doesn't allow playback outside YouTube">
                  <IoOpenOutline /> Open on YouTube
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>
      <Modal open={!!open} onClose={() => setOpen(null)} title={open ? `${open.name} latest uploads` : ''} size="video">
        {open && <YouTubePlayer playlistId={open.longFormPlaylistId} title={`${open.name} latest uploads`} />}
      </Modal>
    </>
  )
}

const Playlists = ({ playlists, onPlay }) => {
  const dispatch = useDispatch()
  if (!playlists.length) return null
  return (
    <section className="music__playlists" aria-labelledby="my-playlists">
      <ContentWrapper>
        <h2 id="my-playlists" className="carousel__title">
          Your playlists
        </h2>
        <ul>
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <div>
                <strong>{playlist.name}</strong>
                <small>{playlist.items.length} songs</small>
              </div>
              <div className="music__labelActions">
                <button type="button" className="btn btn--primary btn--sm" disabled={!playlist.items.length} onClick={() => onPlay(playlist.items[0], playlist.items)}>
                  <IoPlay /> Play
                </button>
                <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label={`Delete playlist ${playlist.name}`} onClick={() => dispatch(deletePlaylist(playlist.id))}>
                  <IoTrashOutline />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </ContentWrapper>
    </section>
  )
}

const Music = () => {
  useDocumentTitle('Music')
  const configured = musicConfigured()
  const [params, setParams] = useSearchParams()
  const language = params.get('lang') === 'all' ? '' : MUSIC_LANGUAGES.find((l) => l.id === params.get('lang'))?.id || 'hindi'
  const urlQuery = params.get('q') || ''
  const [input, setInput] = useState(urlQuery)
  const query = useDebouncedValue(input.trim(), 600)
  const library = useSelector(selectMusicLibrary)
  const [player, setPlayer] = useState(null)

  const setParam = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const searching = configured && query.length >= 3
  const search = useAsync((signal) => searchMusic(query, { language, signal }), [query, language], { enabled: searching })
  const languageSongs = useAsync((signal) => loadLanguageSongs(language, { signal }), [language], { enabled: configured && !!language && !searching })

  const play = (track, queue) => {
    const list = queue?.length ? queue : [track]
    setPlayer({ queue: list, index: Math.max(0, list.findIndex((t) => t.id === track.id)) })
  }

  return (
    <div className="pageBody">
      <PageHeader eyebrow="Music" title="HD Music Videos" intro="Official music videos from the labels' own channels, played through YouTube's embedded player.">
        {configured && (
          <label className="music__search">
            <IoSearchOutline aria-hidden="true" />
            <input type="search" value={input} onChange={(event) => setInput(event.target.value)} placeholder="Search songs, artists or movies" aria-label="Search music" />
            {input && (
              <button type="button" aria-label="Clear search" onClick={() => setInput('')}>
                <IoClose />
              </button>
            )}
          </label>
        )}
        <div className="chipRow" role="group" aria-label="Language">
          <button type="button" className="chip" aria-pressed={!language} onClick={() => setParam('lang', 'all')}>
            All
          </button>
          {MUSIC_LANGUAGES.map((l) => (
            <button key={l.id} type="button" className="chip" aria-pressed={language === l.id} onClick={() => setParam('lang', l.id === 'hindi' ? '' : l.id)}>
              {l.label}
            </button>
          ))}
        </div>
      </PageHeader>

      {!searching && (
        <>
          <StoredRail title="Recently played" tracks={library.recent} onPlay={play} />
          <StoredRail title="Your favourites" tracks={library.favorites} onPlay={play} />
          <Playlists playlists={library.playlists} onPlay={play} />
        </>
      )}

      {!configured ? (
        <ContentWrapper>
          <LabelShelf language={language} />
        </ContentWrapper>
      ) : searching ? (
        <ContentWrapper>
          <h2 className="music__heading">Results for &ldquo;{query}&rdquo;</h2>
          {search.loading ? (
            <div className="music__grid" aria-busy="true">
              {Array.from({ length: 8 }, (_, i) => (
                <div key={i} className="skeleton music__skeleton" />
              ))}
            </div>
          ) : search.error ? (
            <ErrorState error={search.error} onRetry={search.reload} />
          ) : search.data?.length ? (
            <div className="music__grid">
              {search.data.map((track) => (
                <TrackCard key={track.id} track={track} onPlay={(t) => play(t, search.data)} />
              ))}
            </div>
          ) : (
            <EmptyState title={`No songs found for “${query}”`} message="Try an artist, a song title or a movie name." />
          )}
        </ContentWrapper>
      ) : (
        <>
          {language ? (
            <ContentWrapper>
              <h2 className="music__heading">{MUSIC_LANGUAGES.find((l) => l.id === language).label} songs</h2>
              {languageSongs.loading ? (
                <div className="music__grid" aria-busy="true">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="skeleton music__skeleton" />
                  ))}
                </div>
              ) : languageSongs.error ? (
                <ErrorState error={languageSongs.error} onRetry={languageSongs.reload} />
              ) : languageSongs.data?.length ? (
                <div className="music__grid">
                  {languageSongs.data.map((track) => (
                    <TrackCard key={track.id} track={track} onPlay={(t) => play(t, languageSongs.data)} />
                  ))}
                </div>
              ) : (
                <EmptyState title="No songs available" message="Try another language." />
              )}
            </ContentWrapper>
          ) : (
            MUSIC_CATEGORIES.map((category) => (
              <LazySection key={category.id} minHeight={260}>
                <TrackRail title={category.title} load={(signal) => loadCategory(category, { signal })} deps={[category.id]} onPlay={play} />
              </LazySection>
            ))
          )}
        </>
      )}

      {player && <MusicPlayer queue={player.queue} index={player.index} onIndex={(index) => setPlayer((p) => ({ ...p, index }))} onClose={() => setPlayer(null)} />}
    </div>
  )
}

export default Music
