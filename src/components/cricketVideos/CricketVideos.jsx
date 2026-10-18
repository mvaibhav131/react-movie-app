import { useMemo, useState } from 'react'
import { IoPlay } from 'react-icons/io5'
import { cricketVideosConfigured, loadOfficialVideos } from '../../services/cricket/officialVideos'
import { formatClock, formatCount, formatDateTime } from '../../utils/format'
import useAsync from '../../hooks/useAsync'
import Modal from '../modal/Modal'
import YouTubePlayer from '../youtubePlayer/YouTubePlayer'
import { EmptyState, ErrorState } from '../states/States'
import './style.scss'

const FILTERS = [
  { id: 'all', label: 'All', pick: () => true },
  { id: 'live', label: 'Live', pick: (v) => v.kind === 'live' || v.kind === 'upcoming' },
  { id: 'replay', label: 'Full matches', pick: (v) => v.kind === 'replay' },
  { id: 'highlights', label: 'Highlights', pick: (v) => v.kind === 'highlights' },
]

const RELATIVE = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })

const ago = (iso) => {
  const hours = Math.round((Date.parse(iso) - Date.now()) / 3_600_000)
  if (!Number.isFinite(hours)) return ''
  return Math.abs(hours) < 24 ? RELATIVE.format(hours, 'hour') : RELATIVE.format(Math.round(hours / 24), 'day')
}

const Badge = ({ video }) => {
  if (video.kind === 'live') return <span className="cricketVideos__badge cricketVideos__badge--live">Live</span>
  if (video.kind === 'upcoming') return <span className="cricketVideos__badge">Starts {formatDateTime(new Date(video.startsAt).toISOString())}</span>
  return <span className="cricketVideos__badge">{formatClock(video.duration)}</span>
}

/** Free highlights, replays and any embeddable live streams from official cricket channels. */
const CricketVideos = () => {
  const [filter, setFilter] = useState(null)
  const [open, setOpen] = useState(null)
  const { data, loading, error, reload } = useAsync((signal) => loadOfficialVideos({ signal }), [], { enabled: cricketVideosConfigured() })
  // Until a filter is picked, show what is on right now: live streams if there are any, otherwise everything.
  const hasLive = (data?.videos || []).some((v) => v.kind === 'live')
  const active = FILTERS.find((f) => f.id === (filter || (hasLive ? 'live' : 'all')))
  const videos = useMemo(() => (data?.videos || []).filter(active.pick), [data, active])

  if (!cricketVideosConfigured()) return null

  return (
    <section className="cricketVideos" aria-labelledby="cricket-videos">
      <h2 id="cricket-videos">Free official cricket videos</h2>
      <p className="cricketVideos__intro">Watch official highlights and replays here. A live stream appears only when an official channel publishes one for embedding.</p>
      <div className="chipRow" role="group" aria-label="Video type">
        {FILTERS.map((f) => (
          <button key={f.id} type="button" className="chip" aria-pressed={active.id === f.id} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && !data ? (
        <div className="cricketVideos__grid" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton cricketVideos__skeleton" />
          ))}
        </div>
      ) : error && !data ? (
        <ErrorState error={error} onRetry={reload} title="Cricket videos are unavailable" compact />
      ) : videos.length ? (
        <ul className="cricketVideos__grid">
          {videos.map((video) => (
            <li key={video.id}>
              <button type="button" className="cricketVideos__card" onClick={() => setOpen(video)}>
                <span className="cricketVideos__thumb">
                  <img src={video.thumbnail} alt="" loading="lazy" width="320" height="180" />
                  <span className="cricketVideos__play" aria-hidden="true">
                    <IoPlay />
                  </span>
                  <Badge video={video} />
                </span>
                <span className="cricketVideos__title">{video.title}</span>
                <span className="cricketVideos__meta">
                  {video.channel}
                  {video.kind !== 'live' && video.kind !== 'upcoming' && video.publishedAt ? ` · ${ago(video.publishedAt)}` : ''}
                  {video.views ? ` · ${formatCount(video.views)} views` : ''}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState title={active.id === 'live' ? 'No official live stream right now' : 'Nothing here yet'} message="Official channels post new videos around match days. Check back soon." />
      )}

      <Modal open={!!open} onClose={() => setOpen(null)} title={open?.title || ''} size="video">
        {open && <YouTubePlayer videoId={open.id} title={open.title} />}
      </Modal>
    </section>
  )
}

export default CricketVideos
