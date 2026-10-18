import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IoChevronBack, IoLogoYoutube, IoPlay } from 'react-icons/io5'
import { fetchData, tmdbImage } from '../../utils/api'
import { yearOf } from '../../utils/dates'
import { formatClock } from '../../utils/format'
import { detailsPath, watchPath } from '../../config/routes'
import { saveProgress } from '../../store/librarySlice'
import { selectDownloads, selectPrefs, selectProgressFor } from '../../store/selectors'
import { toStoredTitle, normalizeTitle } from '../../services/normalize'
import { findCatalogTitle } from '../../services/catalog'
import { buildQueue, findPlayableSources, firstHealthySource } from '../../services/playback'
import { markFailed } from '../../services/playback/failures'
import { openDownload } from '../../services/downloads/downloadManager'
import useAsync from '../../hooks/useAsync'
import useAvailability from '../../hooks/useAvailability'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import VideoPlayer from '../../components/videoPlayer/VideoPlayer'
import VideoPopup from '../../components/videoPopup/VideoPopup'
import Spinner from '../../components/spinner/Spinner'
import YouTubeStage from './YouTubeStage'
import './style.scss'

const UnavailablePanel = ({ data, mediaType, reason, onBack, youtubeUrl }) => {
  const { data: availability } = useAvailability(data, mediaType)
  const [video, setVideo] = useState(false)
  const trailer = availability?.trailer
  return (
    <div className="watch__panel" role="alert">
      <h1>{reason.title}</h1>
      <p>{reason.message}</p>
      <div className="watch__actions">
        {trailer && (
          <button type="button" className="btn btn--primary" onClick={() => setVideo(true)}>
            <IoPlay /> Watch trailer
          </button>
        )}
        {youtubeUrl && (
          <a className="btn btn--glass" href={youtubeUrl} target="_blank" rel="noopener noreferrer">
            <IoLogoYoutube /> Open on YouTube
          </a>
        )}
        <button type="button" className="btn btn--glass" onClick={onBack}>
          <IoChevronBack /> Back
        </button>
      </div>
      <VideoPopup open={video} onClose={() => setVideo(false)} videoId={trailer?.key} title={trailer?.name} />
    </div>
  )
}

/** Full-screen player. Picks the best authorised source automatically and falls back without asking the viewer. */
const Watch = () => {
  const { mediaType, id } = useParams()
  const [params] = useSearchParams()
  const season = params.get('season') !== null ? Number(params.get('season')) : undefined
  const episode = params.get('episode') !== null ? Number(params.get('episode')) : undefined
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useDispatch()
  const prefs = useSelector(selectPrefs)
  const downloads = useSelector(selectDownloads)
  const progress = useSelector((state) => selectProgressFor(state, mediaType, id))
  const valid = (mediaType === 'movie' || mediaType === 'tv') && /^\d+$/.test(id) && (mediaType === 'movie' || (Number.isInteger(season) && Number.isInteger(episode)))

  const details = useAsync((signal) => fetchData(`/${mediaType}/${id}`, { append_to_response: 'videos' }, { signal }), [mediaType, id], { enabled: valid })
  const data = details.data
  const title = data ? data.title || data.name : ''
  const year = data ? yearOf(data.release_date || data.first_air_date) : undefined
  useDocumentTitle(title ? `Watching ${title}` : 'Watch')

  const episodeInfo = useAsync((signal) => fetchData(`/tv/${id}/season/${season}`, undefined, { signal }), [id, season], { enabled: valid && mediaType === 'tv' })
  const episodeMeta = episodeInfo.data?.episodes?.find((e) => e.episode_number === episode)

  const [failed, setFailed] = useState([])
  const [preferred, setPreferred] = useState(null)
  const [startOver, setStartOver] = useState(false)
  const key = `${mediaType}:${id}:${season ?? ''}:${episode ?? ''}`
  useEffect(() => {
    setFailed([])
    setPreferred(null)
    setStartOver(false)
  }, [key])

  const playback = useAsync(
    async (signal) => {
      const sources = await findPlayableSources({ mediaType, id, title, year, season, episode }, { signal })
      const queue = buildQueue(sources, { quality: prefs.quality })
      const first = await firstHealthySource(queue, { signal })
      return { queue: first ? [first.source, ...queue.filter((s) => s.url !== first.source.url)] : [], hadSources: sources.length > 0 }
    },
    [key, data?.id, prefs.quality],
    { enabled: !!data }
  )

  // A downloaded copy is used first: it needs no data and works offline.
  const offlineRecord = downloads.find(
    (r) => r.status === 'done' && r.mediaType === mediaType && r.tmdbId === Number(id) && (r.season ?? null) === (season ?? null) && (r.episode ?? null) === (episode ?? null)
  )
  const offline = useAsync(async () => (offlineRecord ? { url: await openDownload(offlineRecord.id), record: offlineRecord } : null), [offlineRecord?.id], { enabled: true })
  const offlineUrl = offline.data?.url
  useEffect(() => () => offlineUrl && URL.revokeObjectURL(offlineUrl), [offlineUrl])

  const offlineSource = useMemo(
    () => (offlineUrl ? { id: 'offline', provider: 'offline', kind: offlineRecord?.mime?.includes('webm') ? 'webm' : 'mp4', url: offlineUrl, label: 'Downloaded', license: null } : null),
    [offlineUrl, offlineRecord]
  )

  const queue = useMemo(() => {
    let online = (playback.data?.queue || []).filter((s) => !failed.includes(s.url))
    const chosen = preferred && online.find((s) => s.url === preferred)
    if (chosen) online = [chosen, ...online.filter((s) => s !== chosen)]
    return offlineSource && !failed.includes(offlineSource.url) ? [offlineSource, ...online] : online
  }, [playback.data, failed, preferred, offlineSource])
  const source = queue[0]

  const [nextEpisode, setNextEpisode] = useState(null)
  useEffect(() => {
    if (mediaType !== 'tv') return undefined
    let cancelled = false
    findCatalogTitle('tv', id).then((entry) => {
      if (cancelled || !entry) return
      const ordered = [...entry.episodes].sort((a, b) => a.season - b.season || a.episode - b.episode)
      const index = ordered.findIndex((e) => e.season === season && e.episode === episode)
      setNextEpisode(index >= 0 && ordered[index + 1] ? { season: ordered[index + 1].season, episode: ordered[index + 1].episode } : null)
    })
    return () => {
      cancelled = true
    }
  }, [mediaType, id, season, episode])

  const goBack = useCallback(() => {
    if (location.key !== 'default') navigate(-1)
    else navigate(detailsPath(mediaType, id), { replace: true })
  }, [location.key, navigate, mediaType, id])

  const savedPosition = useMemo(() => {
    if (!progress || startOver) return 0
    if (mediaType === 'tv') {
      const entry = progress.episodes?.[`${season}x${episode}`]
      return entry && !entry.completed ? entry.position : 0
    }
    return progress.completed ? 0 : progress.position || 0
  }, [progress, startOver, mediaType, season, episode])

  const resumeAnnounced = useRef(null)
  useEffect(() => {
    if (!source || savedPosition < 10 || resumeAnnounced.current === key) return
    resumeAnnounced.current = key
    toast(
      (t) => (
        <span className="watch__toast">
          Resuming from {formatClock(savedPosition)}
          <button
            type="button"
            onClick={() => {
              setStartOver(true)
              toast.dismiss(t.id)
            }}
          >
            Start over
          </button>
        </span>
      ),
      { duration: 5000, id: 'resume' }
    )
  }, [source, savedPosition, key])

  const onProgress = useCallback(
    (position, duration) => {
      if (!data || position < 10) return
      dispatch(
        saveProgress({
          title: toStoredTitle(normalizeTitle(data, mediaType)),
          position,
          duration,
          season,
          episode,
          episodeTitle: episodeMeta?.name,
          next: nextEpisode,
        })
      )
    },
    [data, mediaType, dispatch, season, episode, episodeMeta, nextEpisode]
  )

  const onSourceError = useCallback(({ source: failedSource, message }) => {
    if (!failedSource) return
    if (failedSource.provider !== 'offline') markFailed(failedSource)
    setFailed((list) => [...list, failedSource.url])
    if (import.meta.env.DEV) console.warn('Playback source failed, trying the next one:', failedSource.url, message)
  }, [])

  const playNext = useCallback(() => {
    if (nextEpisode) navigate(watchPath('tv', id, nextEpisode), { replace: true })
  }, [navigate, id, nextEpisode])

  if (!valid) {
    return (
      <div className="watch">
        <UnavailableShell onBack={() => navigate('/')} reason={{ title: 'This link isn’t valid', message: 'The page you opened doesn’t point to a playable title.' }} />
      </div>
    )
  }

  const subtitle = mediaType === 'tv' ? `S${season} E${episode}${episodeMeta?.name ? ` · ${episodeMeta.name}` : ''}` : year ? String(year) : ''
  const resolving = details.loading || playback.loading || offline.loading

  return (
    <div className="watch">
      {details.error ? (
        <UnavailableShell onBack={goBack} reason={{ title: 'Couldn’t load this title', message: details.error.message }} />
      ) : resolving && !source ? (
        <div className="watch__loading" role="status">
          <button type="button" className="vp__btn watch__back" aria-label="Back" onClick={goBack}>
            <IoChevronBack />
          </button>
          <Spinner label="Preparing playback" />
          <p>{title ? `Getting ${title} ready…` : 'Getting your video ready…'}</p>
        </div>
      ) : source?.kind === 'youtube' ? (
        <YouTubeStage
          key={`${key}:${source.videoId}:${startOver}`}
          source={source}
          title={title}
          subtitle={subtitle}
          startAt={savedPosition}
          onProgress={onProgress}
          onError={() => onSourceError({ source, message: 'YouTube could not play this video' })}
          onBack={goBack}
        />
      ) : source ? (
        <VideoPlayer
          key={`${key}:${startOver}`}
          source={source}
          sources={queue}
          title={title}
          subtitle={subtitle}
          poster={data?.backdrop_path ? tmdbImage(data.backdrop_path, 'w1280') : undefined}
          startAt={savedPosition}
          preferences={prefs}
          next={nextEpisode ? { label: `S${nextEpisode.season} E${nextEpisode.episode}`, onPlay: playNext } : null}
          onProgress={onProgress}
          onError={onSourceError}
          onBack={goBack}
          onSelectSource={(selected) => setPreferred(selected.url)}
        />
      ) : (
        <UnavailablePanel
          data={data}
          mediaType={mediaType}
          onBack={goBack}
          youtubeUrl={failed.length ? playback.data?.queue?.find((s) => s.kind === 'youtube')?.url : undefined}
          reason={
            playback.data?.hadSources || failed.length
              ? { title: 'We couldn’t start playback', message: 'None of the available sources would load right now. Please try again in a few minutes.' }
              : { title: 'Not available to stream here', message: 'VM Flix can only play titles it is licensed to stream. You can watch the trailer.' }
          }
        />
      )}
    </div>
  )
}

const UnavailableShell = ({ reason, onBack }) => (
  <div className="watch__panel" role="alert">
    <h1>{reason.title}</h1>
    <p>{reason.message}</p>
    <div className="watch__actions">
      <button type="button" className="btn btn--glass" onClick={onBack}>
        <IoChevronBack /> Back
      </button>
    </div>
  </div>
)

export default Watch
