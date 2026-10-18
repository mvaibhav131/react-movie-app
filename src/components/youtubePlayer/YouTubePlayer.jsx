import { lazy, Suspense, useState } from 'react'
import { IoOpenOutline } from 'react-icons/io5'
import Spinner from '../spinner/Spinner'
import './style.scss'

const ReactPlayer = lazy(() => import('react-player/youtube'))

/**
 * Official YouTube embed with YouTube's own controls (their terms forbid covering the player with overlays).
 * Pass `videoId` for one video or `playlistId` for a playlist / channel uploads list.
 */
const YouTubePlayer = ({ videoId, playlistId, autoPlay = true, onEnded, onError, title = 'YouTube video' }) => {
  const [failed, setFailed] = useState(false)

  if (playlistId) {
    // The IFrame API rejects a playlist without a seed video, so playlists use YouTube's own `videoseries` embed.
    const src = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&rel=0&playsinline=1${autoPlay ? '&autoplay=1' : ''}`
    return (
      <div className="ytPlayer">
        <iframe
          src={src}
          title={title}
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
    )
  }

  const url = `https://www.youtube.com/watch?v=${videoId}`
  const external = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`

  if (failed) {
    return (
      <div className="ytPlayer ytPlayer--failed" role="alert">
        <p>This video can&apos;t be played here. The owner may have disabled embedding.</p>
        <a className="btn btn--outline btn--sm" href={external} target="_blank" rel="noopener noreferrer">
          <IoOpenOutline /> Watch on YouTube
        </a>
      </div>
    )
  }

  return (
    <div className="ytPlayer">
      <Suspense fallback={<Spinner />}>
        <ReactPlayer
          url={url}
          title={title}
          controls
          playing={autoPlay}
          playsinline
          width="100%"
          height="100%"
          onEnded={onEnded}
          onError={(error) => {
            setFailed(true)
            onError?.(error)
          }}
          config={{
            youtube: {
              playerVars: { rel: 0, playsinline: 1, modestbranding: 1 },
              embedOptions: { host: 'https://www.youtube-nocookie.com' },
            },
          }}
        />
      </Suspense>
    </div>
  )
}

export default YouTubePlayer
