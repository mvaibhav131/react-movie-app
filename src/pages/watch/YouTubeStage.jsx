import { lazy, Suspense, useRef, useState } from 'react'
import { IoChevronBack, IoOpenOutline } from 'react-icons/io5'
import Spinner from '../../components/spinner/Spinner'

const ReactPlayer = lazy(() => import('react-player/youtube'))

/**
 * Full-screen page for a film on its owner's YouTube channel. YouTube's own controls are used and nothing is drawn
 * over the video, as YouTube's terms require; the header bar and credit sit outside the player.
 */
const YouTubeStage = ({ source, title, subtitle, startAt = 0, onProgress, onError, onBack }) => {
  const duration = useRef(0)
  const [uploadTitle, setUploadTitle] = useState('')

  // The upload's own title shows which video is playing, so a wrong match is easy to spot.
  const readUploadTitle = (player) => {
    try {
      setUploadTitle(player.getInternalPlayer()?.getVideoData?.().title || '')
    } catch {
      setUploadTitle('')
    }
  }

  return (
    <div className="ytStage">
      <header className="ytStage__bar">
        <button type="button" className="vp__btn" aria-label="Back" onClick={onBack}>
          <IoChevronBack />
        </button>
        <div>
          <strong>{title}</strong>
          {subtitle && <small>{subtitle}</small>}
        </div>
        <a className="btn btn--ghost btn--sm" href={source.url} target="_blank" rel="noopener noreferrer">
          <IoOpenOutline aria-hidden="true" /> YouTube
        </a>
      </header>
      <div className="ytStage__stage">
        <div className="ytStage__frame">
          <Suspense fallback={<Spinner label="Loading player" />}>
            <ReactPlayer
              url={source.url}
              title={title}
              controls
              playing
              playsinline
              width="100%"
              height="100%"
              progressInterval={5000}
              onReady={readUploadTitle}
              onDuration={(seconds) => {
                duration.current = seconds
              }}
              onProgress={({ playedSeconds }) => onProgress?.(playedSeconds, duration.current)}
              onEnded={() => duration.current && onProgress?.(duration.current, duration.current)}
              onError={onError}
              config={{
                youtube: {
                  playerVars: { start: Math.floor(startAt), rel: 0, playsinline: 1, modestbranding: 1 },
                  embedOptions: { host: 'https://www.youtube-nocookie.com' },
                },
              }}
            />
          </Suspense>
        </div>
      </div>
      <p className="ytStage__credit">
        Free to watch on the official {source.license?.credit || 'YouTube'} channel{uploadTitle ? ` · “${uploadTitle}”` : ''}
      </p>
    </div>
  )
}

export default YouTubeStage
