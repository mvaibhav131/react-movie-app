import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { IoPlay } from 'react-icons/io5'
import { selectProgressFor } from '../../store/selectors'
import { fetchData, tmdbImage } from '../../utils/api'
import { watchPath } from '../../config/routes'
import { formatDate, formatRuntime } from '../../utils/format'
import { isUpcoming } from '../../utils/dates'
import useAsync from '../../hooks/useAsync'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import Img from '../../components/lazyLoadImage/Img'
import { ErrorState } from '../../components/states/States'

const EpisodeCard = ({ episode, tvId, playable, progress }) => {
  const [expanded, setExpanded] = useState(false)
  const key = `${episode.season_number}x${episode.episode_number}`
  const saved = progress?.episodes?.[key]
  const percent = saved && saved.duration ? Math.min(1, saved.position / saved.duration) : 0
  const upcoming = isUpcoming(episode.air_date)
  const long = (episode.overview || '').length > 140

  return (
    <li className="episode">
      <div className="episode__still">
        <Img src={tmdbImage(episode.still_path, 'w300')} srcSet={episode.still_path ? `${tmdbImage(episode.still_path, 'w300')} 300w, ${tmdbImage(episode.still_path, 'w780')} 780w` : undefined} sizes="(min-width: 768px) 260px, 38vw" ratio="16 / 9" />
        {playable && (
          <Link to={watchPath('tv', tvId, { season: episode.season_number, episode: episode.episode_number })} className="episode__play" aria-label={`Play episode ${episode.episode_number}: ${episode.name}`}>
            <IoPlay />
          </Link>
        )}
        {percent > 0 && (
          <span className="episode__progress" aria-hidden="true">
            <i style={{ width: `${percent * 100}%` }} />
          </span>
        )}
      </div>
      <div className="episode__body">
        <h3 className="episode__title">
          <span>{episode.episode_number}.</span> {episode.name}
        </h3>
        <p className="episode__meta">
          {[upcoming ? `Airs ${formatDate(episode.air_date)}` : formatDate(episode.air_date), episode.runtime ? formatRuntime(episode.runtime) : ''].filter(Boolean).join(' · ')}
        </p>
        {episode.overview && (
          <p className={`episode__overview ${expanded ? 'isOpen' : ''}`}>{episode.overview}</p>
        )}
        {long && (
          <button type="button" className="episode__more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Less' : 'More'}
          </button>
        )}
      </div>
    </li>
  )
}

/** Season picker and episode list for a series. */
const Episodes = ({ tvId, seasons, playableEpisodes, status }) => {
  const list = useMemo(() => {
    const real = (seasons || []).filter((s) => s.season_number > 0 && s.episode_count > 0)
    return real.length ? real : (seasons || []).filter((s) => s.episode_count > 0)
  }, [seasons])
  const progress = useSelector((state) => selectProgressFor(state, 'tv', tvId))
  const [season, setSeason] = useState(() => progress?.season ?? list[0]?.season_number)

  useEffect(() => {
    if (list.length && !list.some((s) => s.season_number === season)) setSeason(list[0].season_number)
  }, [list, season])

  const { data, loading, error, reload } = useAsync((signal) => fetchData(`/tv/${tvId}/season/${season}`, undefined, { signal }), [tvId, season], {
    enabled: season !== undefined,
  })

  if (!list.length) return null

  return (
    <section className="episodes" aria-labelledby="episodes-title">
      <ContentWrapper>
        <div className="episodes__head">
          <h2 id="episodes-title" className="sectionTitle">
            Episodes
          </h2>
          <label className="episodes__select">
            <span className="srOnly">Season</span>
            <select value={season} onChange={(event) => setSeason(Number(event.target.value))} aria-label="Season">
              {list.map((s) => (
                <option key={s.season_number} value={s.season_number}>
                  {s.name || `Season ${s.season_number}`} ({s.episode_count})
                </option>
              ))}
            </select>
          </label>
        </div>

        {status !== 'playable' && status !== undefined && (
          <p className="episodes__notice">Episodes aren’t available to stream on VM Flix. This list is for reference.</p>
        )}

        {error ? (
          <ErrorState error={error} onRetry={reload} compact title="Couldn't load episodes" />
        ) : loading ? (
          <ul className="episodes__list" aria-busy="true">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="episode">
                <div className="skeleton episode__still" style={{ aspectRatio: '16 / 9' }} />
                <div className="episode__body">
                  <div className="skeleton skeletonCard__line" style={{ width: '60%' }} />
                  <div className="skeleton skeletonCard__line skeletonCard__line--short" />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="episodes__list">
            {(data?.episodes || []).map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                tvId={tvId}
                progress={progress}
                playable={!!playableEpisodes?.has(`${episode.season_number}x${episode.episode_number}`)}
              />
            ))}
          </ul>
        )}
      </ContentWrapper>
    </section>
  )
}

export default Episodes
