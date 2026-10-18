import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { IoPlay, IoCalendarOutline, IoBanOutline } from 'react-icons/io5'
import { backdropSrcSet, posterSrcSet, tmdbImage } from '../../utils/api'
import { languageLabel } from '../../config/languages'
import { watchPath } from '../../config/routes'
import { formatClock, formatDate, formatRating, formatRuntime } from '../../utils/format'
import { selectProgressFor } from '../../store/selectors'
import { normalizeTitle } from '../../services/normalize'
import Img from '../../components/lazyLoadImage/Img'
import MyListButton from '../../components/myListButton/MyListButton'
import DownloadButton from '../../components/downloadButton/DownloadButton'
import Genres from '../../components/genres/Genres'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import RatingBadge from '../../components/ratingBadge/RatingBadge'

const certification = (data, mediaType) => {
  if (mediaType === 'tv') {
    const results = data.content_ratings?.results || []
    return (results.find((r) => r.iso_3166_1 === 'IN') || results.find((r) => r.iso_3166_1 === 'US'))?.rating || ''
  }
  const results = data.release_dates?.results || []
  const region = results.find((r) => r.iso_3166_1 === 'IN' && r.release_dates.some((d) => d.certification)) || results.find((r) => r.iso_3166_1 === 'US' && r.release_dates.some((d) => d.certification))
  return region?.release_dates.find((d) => d.certification)?.certification || ''
}

const firstEpisode = (playable) => {
  if (!playable?.size) return null
  const [season, episode] = [...playable]
    .map((key) => key.split('x').map(Number))
    .sort((a, b) => a[0] - b[0] || a[1] - b[1])[0]
  return { season, episode }
}

const AvailabilityNote = ({ availability, data }) => {
  if (!availability) return null
  const { status, license, upcoming } = availability
  const messages = {
    playable: license ? `Free to watch on VM Flix · ${license.name}${license.credit ? ` · ${license.credit}` : ''}` : 'Free to watch on VM Flix',
    trailer: 'The full title isn’t available on VM Flix. You can watch the trailer.',
    upcoming: `Releases ${formatDate(data.release_date || data.first_air_date) || 'soon'}.`,
    unavailable: 'This title isn’t available on VM Flix right now.',
  }
  return <p className={`dHero__note dHero__note--${upcoming ? 'upcoming' : status}`}>{messages[upcoming ? 'upcoming' : status]}</p>
}

const DetailsHero = ({ data, mediaType, availability, availabilityLoading, onTrailer }) => {
  const item = useMemo(() => normalizeTitle(data, mediaType), [data, mediaType])
  const progress = useSelector((state) => selectProgressFor(state, mediaType, data.id))
  const title = item.title
  const art = data.backdrop_path || data.poster_path
  const runtime = mediaType === 'movie' ? data.runtime : data.episode_run_time?.[0] || data.last_episode_to_air?.runtime
  const cert = certification(data, mediaType)
  const status = availability?.status
  const hasTrailer = !!availability?.trailer

  const resume = useMemo(() => {
    if (status !== 'playable') return null
    if (mediaType === 'movie') {
      if (progress && !progress.completed && progress.position >= 10) return { to: watchPath('movie', data.id), label: `Resume from ${formatClock(progress.position)}` }
      return { to: watchPath('movie', data.id), label: 'Watch Now' }
    }
    const first = firstEpisode(availability.playableEpisodes)
    if (progress && !progress.completed && progress.season != null) return { to: watchPath('tv', data.id, { season: progress.season, episode: progress.episode }), label: `Continue S${progress.season} E${progress.episode}` }
    if (progress?.completed && progress.next) return { to: watchPath('tv', data.id, progress.next), label: `Next episode · S${progress.next.season} E${progress.next.episode}` }
    return first ? { to: watchPath('tv', data.id, first), label: `Start S${first.season} E${first.episode}` } : null
  }, [status, mediaType, progress, availability, data.id])

  let primary
  if (availabilityLoading) {
    primary = (
      <span className="btn btn--lg dHero__skeletonBtn skeleton" aria-hidden="true">
        &nbsp;
      </span>
    )
  } else if (resume) {
    primary = (
      <Link to={resume.to} className="btn btn--primary btn--lg">
        <IoPlay /> {resume.label}
      </Link>
    )
  } else if (availability?.upcoming) {
    primary = (
      <span className="btn btn--lg btn--ghost" aria-disabled="true">
        <IoCalendarOutline /> Coming {formatDate(data.release_date || data.first_air_date)}
      </span>
    )
  } else if (status === 'trailer') {
    primary = (
      <button type="button" className="btn btn--primary btn--lg" onClick={onTrailer}>
        <IoPlay /> Watch trailer
      </button>
    )
  } else {
    primary = (
      <span className="btn btn--lg btn--ghost" aria-disabled="true">
        <IoBanOutline /> Currently unavailable
      </span>
    )
  }

  const creators = (data.created_by || []).map((c) => c.name)
  const crew = data.credits?.crew || []
  const directors = crew.filter((c) => c.job === 'Director').map((c) => c.name)
  const writers = [...new Set(crew.filter((c) => ['Screenplay', 'Writer', 'Story'].includes(c.job)).map((c) => c.name))].slice(0, 3)
  const spoken = (data.spoken_languages || []).map((l) => l.english_name || l.name).filter(Boolean)

  const facts = [
    ['Status', data.status],
    ['Release date', formatDate(data.release_date || data.first_air_date)],
    mediaType === 'tv' && ['Seasons', data.number_of_seasons ? `${data.number_of_seasons} · ${data.number_of_episodes} episodes` : ''],
    ['Original language', languageLabel(data.original_language)],
    spoken.length > 0 && ['Languages spoken (TMDB)', spoken.join(', ')],
    creators.length > 0 && ['Created by', creators.join(', ')],
    directors.length > 0 && ['Director', directors.join(', ')],
    writers.length > 0 && ['Writer', writers.join(', ')],
    (data.production_countries || []).length > 0 && ['Country', data.production_countries.map((c) => c.name).join(', ')],
  ].filter((f) => f && f[1])

  const tracks = availability?.tracks
  const trackLine = (list) => list.map((t) => t.label || t.lang).filter(Boolean).join(', ')

  return (
    <section className="dHero" aria-labelledby="details-title">
      <div className="dHero__media" aria-hidden="true">
        <Img
          src={tmdbImage(art, 'w1280')}
          srcSet={data.backdrop_path ? backdropSrcSet(data.backdrop_path) : posterSrcSet(data.poster_path)}
          sizes="100vw"
          ratio="16 / 9"
          priority
          position="center 20%"
        />
      </div>

      <ContentWrapper className="dHero__wrap">
        <div className="dHero__body">
          <div className="dHero__poster">
            <Img src={tmdbImage(data.poster_path, 'w500')} srcSet={posterSrcSet(data.poster_path)} sizes="240px" ratio="2 / 3" alt={`${title} poster`} priority />
          </div>

          <div className="dHero__info">
            <h1 id="details-title" className="dHero__title">
              {title}
              {item.year ? <span className="dHero__year"> ({item.year})</span> : null}
            </h1>
            {data.tagline && <p className="dHero__tagline">{data.tagline}</p>}

            <ul className="dHero__meta" aria-label="Details">
              {formatRating(data.vote_average) && (
                <li className="dHero__score">
                  <RatingBadge rating={data.vote_average} size="md" />
                  <span>
                    <small>TMDB · {data.vote_count?.toLocaleString()} votes</small>
                  </span>
                </li>
              )}
              {cert && (
                <li>
                  <span className="badge">{cert}</span>
                </li>
              )}
              {runtime ? <li>{formatRuntime(runtime)}</li> : null}
              {data.original_language && <li>{languageLabel(data.original_language)}</li>}
              {mediaType === 'tv' && data.number_of_seasons ? <li>{data.number_of_seasons} {data.number_of_seasons === 1 ? 'season' : 'seasons'}</li> : null}
            </ul>

            <Genres data={(data.genres || []).map((g) => g.id)} limit={5} />

            <div className="dHero__actions">
              {primary}
              {hasTrailer && status !== 'trailer' && (
                <button type="button" className="btn btn--glass btn--lg" onClick={onTrailer}>
                  <IoPlay /> Trailer
                </button>
              )}
              <MyListButton item={item} className="btn--lg" />
              {mediaType === 'movie' && <DownloadButton item={item} availability={availability} />}
            </div>

            <AvailabilityNote availability={availability} data={data} />

            {data.overview && (
              <div className="dHero__overview">
                <h2>Overview</h2>
                <p>{data.overview}</p>
              </div>
            )}

            {tracks && status === 'playable' && (tracks.audio.length > 0 || tracks.subtitles.length > 0 || tracks.maxHeight > 0) && (
              <dl className="dHero__tracks" aria-label="Available on VM Flix">
                {tracks.maxHeight > 0 && (
                  <div>
                    <dt>Quality</dt>
                    <dd>Up to {tracks.maxHeight}p</dd>
                  </div>
                )}
                {tracks.audio.length > 0 && (
                  <div>
                    <dt>Audio</dt>
                    <dd>{trackLine(tracks.audio)}</dd>
                  </div>
                )}
                {tracks.subtitles.length > 0 && (
                  <div>
                    <dt>Subtitles</dt>
                    <dd>{trackLine(tracks.subtitles)}</dd>
                  </div>
                )}
              </dl>
            )}

            <dl className="dHero__facts">
              {facts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </ContentWrapper>
    </section>
  )
}

export default DetailsHero
