import { useState } from 'react'
import { Link } from 'react-router-dom'
import { IoMusicalNotesOutline } from 'react-icons/io5'
import { MUSIC_CATEGORIES } from '../../config/music'
import { loadCategory, musicConfigured } from '../../services/music/musicService'
import useAsync from '../../hooks/useAsync'
import Carousel from '../../components/carousel/Carousel'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import TrackCard from '../../components/trackCard/TrackCard'
import MusicPlayer from '../../components/musicPlayer/MusicPlayer'

const hindi = MUSIC_CATEGORIES.find((c) => c.id === 'latest-hindi')

const ConfiguredStrip = () => {
  const { data, loading, error, reload } = useAsync((signal) => loadCategory(hindi, { signal, limit: 14 }), [])
  const [player, setPlayer] = useState(null)
  return (
    <>
      <Carousel
        className="carousel--track"
        variant="landscape"
        title="HD Music Videos"
        data={data}
        loading={loading}
        error={error}
        onRetry={reload}
        seeAllTo="/music"
        hideWhenEmpty
        renderItem={(track) => <TrackCard track={track} onPlay={(t) => setPlayer({ queue: data, index: Math.max(0, data.findIndex((x) => x.id === t.id)) })} />}
      />
      {player && <MusicPlayer queue={player.queue} index={player.index} onIndex={(index) => setPlayer((p) => ({ ...p, index }))} onClose={() => setPlayer(null)} />}
    </>
  )
}

/** Home rail for music. Without a YouTube API key it links to the Music page, which still offers label channels. */
const MusicStrip = () =>
  musicConfigured() ? (
    <ConfiguredStrip />
  ) : (
    <section className="carousel" aria-labelledby="music-strip-title">
      <ContentWrapper>
        <header className="carousel__head">
          <h2 id="music-strip-title" className="carousel__title">
            HD Music Videos
          </h2>
        </header>
        <Link to="/music" className="liveStrip__cta">
          <IoMusicalNotesOutline aria-hidden="true" />
          <span>
            <strong>Official music videos from the labels&apos; channels</strong>
            <small>Hindi, Marathi, Tamil, Telugu, Kannada, Malayalam and Punjabi.</small>
          </span>
        </Link>
      </ContentWrapper>
    </section>
  )

export default MusicStrip
