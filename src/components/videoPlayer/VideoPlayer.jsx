import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  IoChevronBack,
  IoContract,
  IoExpand,
  IoPause,
  IoPlay,
  IoRefresh,
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from 'react-icons/io5'
import { MdClosedCaption, MdClosedCaptionOff, MdForward10, MdPictureInPictureAlt, MdReplay10, MdSkipNext } from 'react-icons/md'
import { local } from '../../utils/storage'
import { clamp, formatClock } from '../../utils/format'
import { MEDIA_ERROR_MESSAGES, PLAYBACK_RATES, fullscreenElement, supportsPip, trackLabel } from './playerUtils'
import useVideoEngine from './useVideoEngine'
import SeekBar from './SeekBar'
import SettingsMenu from './SettingsMenu'
import './style.scss'

const HIDE_AFTER_MS = 3000
const PROGRESS_EVERY_MS = 5000
const LOAD_TIMEOUT_MS = 25000
const DOUBLE_TAP_MS = 280
const VOLUME_KEY = 'vmflix:player-volume'
const UP_NEXT_SECONDS = 8

const VolumeIcon = ({ muted, volume }) => {
  if (muted || volume === 0) return <IoVolumeMute />
  if (volume < 0.34) return <IoVolumeLow />
  if (volume < 0.67) return <IoVolumeMedium />
  return <IoVolumeHigh />
}

const bufferedEnd = (video) => {
  const { buffered, currentTime } = video
  for (let i = 0; i < buffered.length; i += 1) {
    if (buffered.start(i) <= currentTime + 0.5 && buffered.end(i) >= currentTime) return buffered.end(i)
  }
  return currentTime
}

/**
 * Custom player for sources VM Flix is allowed to stream (HLS via hls.js, MP4 / WebM natively).
 * Never used for third-party embeds: those keep their own controls.
 *
 * Props
 *  source / sources   current source and the full ranked queue (for progressive quality switching)
 *  startAt            resume position in seconds
 *  onProgress(t, d)   called every few seconds, on pause and on exit
 *  onError(info)      the current source failed; the parent decides which source to try next
 *  next               { label, onPlay } to enable "next episode" and auto-advance
 */
const VideoPlayer = ({
  source,
  sources = [],
  title,
  subtitle,
  poster,
  startAt = 0,
  preferences = {},
  autoPlay = true,
  next = null,
  onProgress,
  onEnded,
  onError,
  onBack,
  onSelectSource,
}) => {
  const containerRef = useRef(null)
  const videoRef = useRef(null)
  const hideTimer = useRef(null)
  const osdTimer = useRef(null)
  const tapTimer = useRef(null)
  const lastTap = useRef({ at: 0, x: 0 })
  const pointerType = useRef('mouse')
  const resumeAt = useRef(startAt)
  const wasPlaying = useRef(autoPlay)
  const lastTime = useRef(0)
  const durationRef = useRef(0)
  const failedOnce = useRef(false)
  const onProgressRef = useRef(onProgress)
  onProgressRef.current = onProgress

  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [buffered, setBuffered] = useState(0)
  const [waiting, setWaiting] = useState(true)
  const [ended, setEnded] = useState(false)
  const [volume, setVolume] = useState(() => clamp(Number(local.read(VOLUME_KEY, 1)), 0, 1))
  const [muted, setMuted] = useState(false)
  const [rate, setRate] = useState(1)
  const [fullscreen, setFullscreen] = useState(false)
  const [pip, setPip] = useState(false)
  const [controls, setControls] = useState(true)
  const [menuOpen, setMenuOpen] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [error, setError] = useState(null)
  const [osd, setOsd] = useState(null)
  const [textTracks, setTextTracks] = useState([])
  const [countdown, setCountdown] = useState(null)

  const reportFailure = useCallback(
    (info) => {
      if (failedOnce.current) return
      failedOnce.current = true
      setError(info)
      setWaiting(false)
      onError?.({ ...info, source })
    },
    [onError, source]
  )

  const engine = useVideoEngine({
    videoRef,
    source,
    preferredQuality: preferences.quality,
    preferredSubtitle: preferences.subtitleLang,
    onFatal: reportFailure,
  })
  const { tracks, setLevel, setAudio, setSubtitle } = engine

  /* ── Source changes: keep position and play state ───────────────── */
  useEffect(() => {
    resumeAt.current = lastTime.current > 1 ? lastTime.current : startAt
    failedOnce.current = false
    setError(null)
    setWaiting(true)
    setEnded(false)
    setBlocked(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source])

  useEffect(() => {
    if (!source) return undefined
    const timer = setTimeout(() => {
      if (!videoRef.current?.readyState) reportFailure({ message: 'The video is taking too long to start.' })
    }, LOAD_TIMEOUT_MS)
    return () => clearTimeout(timer)
  }, [source, reportFailure])

  /* ── Helpers ────────────────────────────────────────────────────── */
  const flash = useCallback((text) => {
    clearTimeout(osdTimer.current)
    setOsd({ text, key: Date.now() })
    osdTimer.current = setTimeout(() => setOsd(null), 900)
  }, [])

  const showControls = useCallback(() => {
    setControls(true)
    clearTimeout(hideTimer.current)
    hideTimer.current = setTimeout(() => setControls(false), HIDE_AFTER_MS)
  }, [])

  useEffect(() => {
    if (!playing || menuOpen || error) {
      clearTimeout(hideTimer.current)
      setControls(true)
    } else {
      showControls()
    }
    return () => clearTimeout(hideTimer.current)
  }, [playing, menuOpen, error, showControls])

  const play = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.play().then(
      () => setBlocked(false),
      (err) => {
        if (err?.name === 'NotAllowedError') setBlocked(true)
      }
    )
  }, [])

  const toggle = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    if (video.paused || video.ended) {
      if (video.ended) video.currentTime = 0
      play()
    } else {
      video.pause()
    }
  }, [play])

  const seekTo = useCallback((seconds) => {
    const video = videoRef.current
    if (!video || !Number.isFinite(video.duration)) return
    video.currentTime = clamp(seconds, 0, video.duration)
    lastTime.current = video.currentTime
    setTime(video.currentTime)
  }, [])

  const seekBy = useCallback(
    (delta) => {
      const video = videoRef.current
      if (!video) return
      seekTo(video.currentTime + delta)
      flash(`${delta > 0 ? '+' : '−'}${Math.abs(delta)}s`)
    },
    [seekTo, flash]
  )

  const changeVolume = useCallback(
    (value) => {
      const video = videoRef.current
      const next = clamp(value, 0, 1)
      if (video) {
        video.volume = next
        video.muted = next === 0
      }
      setVolume(next)
      setMuted(next === 0)
      local.write(VOLUME_KEY, next)
    },
    []
  )

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    if (!video.muted && video.volume === 0) changeVolume(0.5)
    setMuted(video.muted)
    flash(video.muted ? 'Muted' : `Volume ${Math.round(video.volume * 100)}%`)
  }, [changeVolume, flash])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    const video = videoRef.current
    try {
      if (fullscreenElement()) {
        await (document.exitFullscreen || document.webkitExitFullscreen).call(document)
        return
      }
      if (container.requestFullscreen) await container.requestFullscreen({ navigationUI: 'hide' })
      else if (container.webkitRequestFullscreen) container.webkitRequestFullscreen()
      else if (video.webkitEnterFullscreen) video.webkitEnterFullscreen()
      if (video.videoWidth > video.videoHeight && window.matchMedia('(pointer: coarse)').matches) {
        await window.screen.orientation?.lock?.('landscape').catch(() => {})
      }
    } catch {
      /* fullscreen refused (e.g. not triggered by a user gesture) */
    }
  }, [])

  const togglePip = useCallback(async () => {
    const video = videoRef.current
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      /* not allowed for this media */
    }
  }, [])

  const setRateTo = useCallback(
    (value) => {
      const video = videoRef.current
      if (video) video.playbackRate = value
      setRate(value)
      flash(`Speed ${value}×`)
    },
    [flash]
  )

  /* ── Subtitles (sidecar tracks + native HLS) ────────────────────── */
  useEffect(() => {
    const video = videoRef.current
    if (!video) return undefined
    const list = video.textTracks
    const read = () =>
      setTextTracks(
        [...list]
          .map((t, index) => ({ index, kind: t.kind, label: t.label, lang: t.language, mode: t.mode }))
          .filter((t) => t.kind === 'subtitles' || t.kind === 'captions')
      )
    read()
    list.addEventListener('addtrack', read)
    list.addEventListener('removetrack', read)
    list.addEventListener('change', read)
    return () => {
      list.removeEventListener('addtrack', read)
      list.removeEventListener('removetrack', read)
      list.removeEventListener('change', read)
    }
  }, [source])

  const usingHlsSubtitles = tracks.subtitles.length > 0
  const subtitleOptions = useMemo(() => {
    const list = usingHlsSubtitles ? tracks.subtitles : textTracks.map((t) => ({ index: t.index, lang: t.lang, label: t.label }))
    return [{ id: -1, label: 'Off' }, ...list.map((t) => ({ id: t.index, label: trackLabel(t) }))]
  }, [usingHlsSubtitles, tracks.subtitles, textTracks])

  const activeSubtitle = usingHlsSubtitles ? tracks.subtitleIndex : textTracks.find((t) => t.mode === 'showing')?.index ?? -1

  const selectSubtitle = useCallback(
    (index) => {
      if (usingHlsSubtitles) setSubtitle(index)
      else {
        const video = videoRef.current
        for (let i = 0; i < video.textTracks.length; i += 1) video.textTracks[i].mode = i === index ? 'showing' : 'disabled'
      }
      flash(index === -1 ? 'Subtitles off' : 'Subtitles on')
    },
    [usingHlsSubtitles, setSubtitle, flash]
  )

  // Apply the preferred subtitle language to sidecar tracks once they exist.
  const appliedPreference = useRef(null)
  useEffect(() => {
    if (usingHlsSubtitles || !textTracks.length || appliedPreference.current === source) return
    appliedPreference.current = source
    const want = preferences.subtitleLang
    if (!want || want === 'off') return
    const match = textTracks.find((t) => t.lang?.toLowerCase().startsWith(want.toLowerCase()))
    if (match) selectSubtitle(match.index)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [textTracks, usingHlsSubtitles, source])

  const toggleCaptions = useCallback(() => {
    const real = subtitleOptions.filter((o) => o.id !== -1)
    if (!real.length) return
    selectSubtitle(activeSubtitle === -1 ? real[0].id : -1)
  }, [subtitleOptions, activeSubtitle, selectSubtitle])

  /* ── Quality menu ───────────────────────────────────────────────── */
  const qualityMenu = useMemo(() => {
    if (tracks.levels.length > 1) {
      const byHeight = new Map()
      tracks.levels.forEach((l) => {
        const kept = byHeight.get(l.height)
        if (!kept || l.bitrate > kept.bitrate) byHeight.set(l.height, l)
      })
      const levels = [...byHeight.values()].sort((a, b) => b.height - a.height)
      const current = tracks.level === -1 ? null : tracks.levels.find((l) => l.index === tracks.level)
      return {
        label: 'Quality',
        value: current ? `${current.height}p` : tracks.autoHeight ? `Auto (${tracks.autoHeight}p)` : 'Auto',
        options: [{ id: -1, label: 'Auto' }, ...levels.map((l) => ({ id: l.index, label: `${l.height}p` }))],
        selected: tracks.level === -1 ? -1 : levels.find((l) => l.height === current?.height)?.index ?? tracks.level,
        onSelect: (id) => {
          setLevel(id)
          flash(id === -1 ? 'Quality: Auto' : `Quality: ${tracks.levels.find((l) => l.index === id)?.height}p`)
        },
      }
    }
    const progressive = sources.filter((s) => s.kind === source?.kind && s.kind !== 'hls')
    if (progressive.length > 1) {
      const label = (s) => s.label || (s.height ? `${s.height}p` : s.kind.toUpperCase())
      return {
        label: 'Quality',
        value: label(source),
        options: [...progressive].sort((a, b) => (b.height || 0) - (a.height || 0)).map((s) => ({ id: s.id, label: label(s) })),
        selected: source.id,
        onSelect: (id) => {
          const target = progressive.find((s) => s.id === id)
          if (target && target.id !== source.id) {
            wasPlaying.current = !videoRef.current?.paused
            onSelectSource?.(target)
          }
        },
      }
    }
    return null
  }, [tracks, sources, source, setLevel, flash, onSelectSource])

  const menus = {
    quality: qualityMenu,
    subtitles: subtitleOptions.length > 1 ? { label: 'Subtitles', value: subtitleOptions.find((o) => o.id === activeSubtitle)?.label || 'Off', options: subtitleOptions, selected: activeSubtitle, onSelect: selectSubtitle } : null,
    audio:
      tracks.audio.length > 1
        ? { label: 'Audio', value: trackLabel(tracks.audio.find((a) => a.index === tracks.audioIndex) || tracks.audio[0]), options: tracks.audio.map((a) => ({ id: a.index, label: trackLabel(a) })), selected: tracks.audioIndex, onSelect: setAudio }
        : null,
    speed: { label: 'Speed', value: rate === 1 ? 'Normal' : `${rate}×`, options: PLAYBACK_RATES.map((r) => ({ id: r, label: r === 1 ? 'Normal' : `${r}×` })), selected: rate, onSelect: setRateTo },
  }

  /* ── Video element events ───────────────────────────────────────── */
  const onLoadedMetadata = () => {
    const video = videoRef.current
    setDuration(video.duration)
    durationRef.current = video.duration
    video.volume = volume
    video.muted = muted
    video.playbackRate = rate
    const target = resumeAt.current
    if (target > 1 && Number.isFinite(video.duration) && target < video.duration - 30) video.currentTime = target
    if (autoPlay || wasPlaying.current) play()
    else setWaiting(false)
  }

  const onTimeUpdate = () => {
    const video = videoRef.current
    lastTime.current = video.currentTime
    setTime(video.currentTime)
    setBuffered(bufferedEnd(video))
  }

  const onVideoError = () => {
    if (source?.kind === 'hls' && engine.isHls()) return
    const code = videoRef.current?.error?.code
    reportFailure({ code, message: MEDIA_ERROR_MESSAGES[code] || 'The video could not be played.' })
  }

  /* ── Progress heartbeat ─────────────────────────────────────────── */
  const emitProgress = useCallback(() => {
    // lastTime/durationRef are used (not the element) because the element is already reset during unmount cleanup.
    if (durationRef.current > 0) onProgressRef.current?.(lastTime.current, durationRef.current)
  }, [])

  useEffect(() => {
    if (!playing) return undefined
    const timer = setInterval(emitProgress, PROGRESS_EVERY_MS)
    return () => clearInterval(timer)
  }, [playing, emitProgress])

  useEffect(() => {
    const onHide = () => document.visibilityState === 'hidden' && emitProgress()
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', emitProgress)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', emitProgress)
      emitProgress()
    }
  }, [emitProgress])

  /* ── Fullscreen / PiP state ─────────────────────────────────────── */
  useEffect(() => {
    const video = videoRef.current
    const enterPip = () => setPip(true)
    const leavePip = () => setPip(false)
    video?.addEventListener('enterpictureinpicture', enterPip)
    video?.addEventListener('leavepictureinpicture', leavePip)
    return () => {
      video?.removeEventListener('enterpictureinpicture', enterPip)
      video?.removeEventListener('leavepictureinpicture', leavePip)
    }
  }, [])
  useEffect(() => {
    const onChange = () => {
      const active = !!fullscreenElement()
      setFullscreen(active)
      if (!active) window.screen.orientation?.unlock?.()
    }
    document.addEventListener('fullscreenchange', onChange)
    document.addEventListener('webkitfullscreenchange', onChange)
    return () => {
      document.removeEventListener('fullscreenchange', onChange)
      document.removeEventListener('webkitfullscreenchange', onChange)
    }
  }, [])

  /* ── Keyboard shortcuts ─────────────────────────────────────────── */
  useEffect(() => {
    const onKey = (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      const onSlider = target?.getAttribute?.('role') === 'slider'
      const onButton = tag === 'BUTTON' || tag === 'A'
      const video = videoRef.current
      if (!video) return
      let handled = true
      switch (event.key) {
        case ' ':
          if (onButton) return
          toggle()
          break
        case 'k':
        case 'K':
          toggle()
          break
        case 'ArrowLeft':
          if (onSlider) return
          seekBy(-5)
          break
        case 'ArrowRight':
          if (onSlider) return
          seekBy(5)
          break
        case 'j':
        case 'J':
          seekBy(-10)
          break
        case 'l':
        case 'L':
          seekBy(10)
          break
        case 'ArrowUp':
          changeVolume(video.volume + 0.05)
          flash(`Volume ${Math.round(clamp(video.volume + 0.05, 0, 1) * 100)}%`)
          break
        case 'ArrowDown':
          changeVolume(video.volume - 0.05)
          flash(`Volume ${Math.round(clamp(video.volume - 0.05, 0, 1) * 100)}%`)
          break
        case 'm':
        case 'M':
          toggleMute()
          break
        case 'f':
        case 'F':
          toggleFullscreen()
          break
        case 'c':
        case 'C':
          toggleCaptions()
          break
        case 'p':
        case 'P':
          if (supportsPip()) togglePip()
          break
        case '>':
        case '.': {
          const i = PLAYBACK_RATES.indexOf(rate)
          setRateTo(PLAYBACK_RATES[Math.min(PLAYBACK_RATES.length - 1, i + 1)])
          break
        }
        case '<':
        case ',': {
          const i = PLAYBACK_RATES.indexOf(rate)
          setRateTo(PLAYBACK_RATES[Math.max(0, i - 1)])
          break
        }
        case 'Home':
          if (onSlider) return
          seekTo(0)
          break
        case 'End':
          if (onSlider) return
          seekTo(video.duration)
          break
        default:
          if (/^[0-9]$/.test(event.key)) seekTo((video.duration * Number(event.key)) / 10)
          else handled = false
      }
      if (handled) {
        event.preventDefault()
        showControls()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [toggle, seekBy, seekTo, changeVolume, toggleMute, toggleFullscreen, toggleCaptions, togglePip, setRateTo, rate, flash, showControls])

  /* ── Pointer / touch gestures on the stage ──────────────────────── */
  const onStagePointerDown = (event) => {
    pointerType.current = event.pointerType || 'mouse'
  }

  const onStageClick = (event) => {
    if (menuOpen) {
      setMenuOpen(false)
      return
    }
    if (pointerType.current === 'touch' || pointerType.current === 'pen') {
      const now = Date.now()
      const rect = event.currentTarget.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width
      const isDouble = now - lastTap.current.at < DOUBLE_TAP_MS && Math.abs(event.clientX - lastTap.current.x) < 60
      lastTap.current = { at: now, x: event.clientX }
      if (isDouble) {
        clearTimeout(tapTimer.current)
        lastTap.current.at = 0
        if (x < 0.4) seekBy(-10)
        else if (x > 0.6) seekBy(10)
        else toggle()
        showControls()
        return
      }
      clearTimeout(tapTimer.current)
      tapTimer.current = setTimeout(() => {
        // First tap reveals the controls; tapping again while playing hides them (paused video keeps them visible).
        setControls((visible) => {
          if (!visible) {
            showControls()
            return true
          }
          if (!playing) return true
          clearTimeout(hideTimer.current)
          return false
        })
      }, DOUBLE_TAP_MS)
      return
    }
    // Mouse: single click toggles playback, double click toggles fullscreen.
    clearTimeout(tapTimer.current)
    tapTimer.current = setTimeout(toggle, 220)
  }

  const onStageDoubleClick = () => {
    if (pointerType.current !== 'mouse') return
    clearTimeout(tapTimer.current)
    toggleFullscreen()
  }

  useEffect(() => () => [hideTimer, osdTimer, tapTimer].forEach((t) => clearTimeout(t.current)), [])

  /* ── Up next countdown ──────────────────────────────────────────── */
  useEffect(() => {
    if (!ended || !next || !preferences.autoplayNext) {
      setCountdown(null)
      return undefined
    }
    setCountdown(UP_NEXT_SECONDS)
    const timer = setInterval(() => setCountdown((c) => (c === null ? null : c - 1)), 1000)
    return () => clearInterval(timer)
  }, [ended, next, preferences.autoplayNext])

  useEffect(() => {
    if (countdown === 0) next?.onPlay()
  }, [countdown, next])

  /* ── Render ─────────────────────────────────────────────────────── */
  const hasSidecarSubs = !!source?.subtitles?.length
  const pipSupported = supportsPip()
  const remaining = Math.max(0, duration - time)

  return (
    <div
      ref={containerRef}
      className={`vp ${controls ? 'vp--controls' : ''} ${fullscreen ? 'vp--fs' : ''} ${playing ? 'vp--playing' : ''}`}
      onPointerMove={(event) => event.pointerType === 'mouse' && showControls()}
      onFocus={showControls}
    >
      <video
        ref={videoRef}
        className="vp__video"
        playsInline
        preload="auto"
        poster={poster}
        crossOrigin={hasSidecarSubs ? 'anonymous' : undefined}
        controlsList="nodownload"
        disablePictureInPicture={!pipSupported}
        onLoadedMetadata={onLoadedMetadata}
        onDurationChange={() => {
          durationRef.current = videoRef.current.duration
          setDuration(videoRef.current.duration)
        }}
        onTimeUpdate={onTimeUpdate}
        onProgress={() => setBuffered(bufferedEnd(videoRef.current))}
        onPlay={() => {
          setPlaying(true)
          setEnded(false)
          setBlocked(false)
        }}
        onPlaying={() => setWaiting(false)}
        onPause={() => {
          setPlaying(false)
          emitProgress()
        }}
        onWaiting={() => setWaiting(true)}
        onStalled={() => setWaiting(true)}
        onCanPlay={() => setWaiting(false)}
        onSeeking={() => setWaiting(true)}
        onSeeked={() => {
          setWaiting(false)
          emitProgress()
        }}
        onRateChange={() => setRate(videoRef.current.playbackRate)}
        onEnded={() => {
          setPlaying(false)
          setEnded(true)
          emitProgress()
          onEnded?.()
        }}
        onError={onVideoError}
      >
        {hasSidecarSubs &&
          source.subtitles.map((s) => <track key={s.url} kind="subtitles" src={s.url} srcLang={s.lang} label={s.label} />)}
      </video>

      <div className="vp__stage" onPointerDown={onStagePointerDown} onClick={onStageClick} onDoubleClick={onStageDoubleClick} aria-hidden="true" />

      {waiting && !error && !ended && (
        <div className="vp__loading" role="status">
          <span className="vp__spinner" aria-hidden="true" />
          <span className="srOnly">Loading video</span>
        </div>
      )}

      {osd && (
        <div key={osd.key} className="vp__osd" aria-live="polite">
          {osd.text}
        </div>
      )}

      {blocked && !error && (
        <button type="button" className="vp__bigPlay" aria-label="Play" onClick={play}>
          <IoPlay />
        </button>
      )}

      {!waiting && !error && !blocked && !ended && (
        <div className="vp__center">
          <button type="button" className="vp__btn vp__btn--round" aria-label="Back 10 seconds" onClick={() => seekBy(-10)}>
            <MdReplay10 />
          </button>
          <button type="button" className="vp__btn vp__btn--round vp__btn--big" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
            {playing ? <IoPause /> : <IoPlay />}
          </button>
          <button type="button" className="vp__btn vp__btn--round" aria-label="Forward 10 seconds" onClick={() => seekBy(10)}>
            <MdForward10 />
          </button>
        </div>
      )}

      <div className="vp__top">
        <button type="button" className="vp__btn vp__back" aria-label="Back" onClick={onBack}>
          <IoChevronBack />
        </button>
        <div className="vp__title">
          <strong>{title}</strong>
          {subtitle && <span>{subtitle}</span>}
        </div>
      </div>

      <div className="vp__bottom">
        <SeekBar currentTime={time} duration={duration} buffered={buffered} onSeek={seekTo} disabled={!!error} />
        <div className="vp__row">
          <button type="button" className="vp__btn vp__btn--main" aria-label={playing ? 'Pause' : 'Play'} onClick={toggle}>
            {playing ? <IoPause /> : <IoPlay />}
          </button>
          <button type="button" className="vp__btn vp__skip" aria-label="Back 10 seconds" onClick={() => seekBy(-10)}>
            <MdReplay10 />
          </button>
          <button type="button" className="vp__btn vp__skip" aria-label="Forward 10 seconds" onClick={() => seekBy(10)}>
            <MdForward10 />
          </button>
          <div className="vp__volume">
            <button type="button" className="vp__btn" aria-label={muted ? 'Unmute' : 'Mute'} onClick={toggleMute}>
              <VolumeIcon muted={muted} volume={volume} />
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={muted ? 0 : volume}
              aria-label="Volume"
              style={{ '--fill': `${(muted ? 0 : volume) * 100}%` }}
              onChange={(event) => changeVolume(Number(event.target.value))}
            />
          </div>
          <span className="vp__time" aria-label="Playback position">
            {formatClock(time)} <span className="vp__timeSep">/</span> <span className="vp__timeTotal">{formatClock(duration)}</span>
          </span>
          <span className="vp__spacer" />
          {next && (
            <button type="button" className="vp__btn" aria-label={`Next episode: ${next.label}`} onClick={next.onPlay}>
              <MdSkipNext />
            </button>
          )}
          {subtitleOptions.length > 1 && (
            <button type="button" className={`vp__btn ${activeSubtitle !== -1 ? 'isOn' : ''}`} aria-label="Toggle subtitles" aria-pressed={activeSubtitle !== -1} onClick={toggleCaptions}>
              {activeSubtitle !== -1 ? <MdClosedCaption /> : <MdClosedCaptionOff />}
            </button>
          )}
          <SettingsMenu open={menuOpen} onToggle={() => setMenuOpen((v) => !v)} onClose={() => setMenuOpen(false)} menus={menus} />
          {pipSupported && (
            <button type="button" className={`vp__btn vp__hideXs ${pip ? 'isOn' : ''}`} aria-label="Picture in picture" aria-pressed={pip} onClick={togglePip}>
              <MdPictureInPictureAlt />
            </button>
          )}
          <button type="button" className="vp__btn" aria-label={fullscreen ? 'Exit fullscreen' : 'Enter fullscreen'} onClick={toggleFullscreen}>
            {fullscreen ? <IoContract /> : <IoExpand />}
          </button>
        </div>
        {duration > 0 && remaining < 1 && <span className="srOnly">Finished</span>}
      </div>

      {error && (
        <div className="vp__error" role="alert">
          <p>{error.message}</p>
          <span>Trying another source if one is available…</span>
        </div>
      )}

      {ended && !error && (
        <div className="vp__ended">
          {next && countdown !== null ? (
            <>
              <p>
                Up next in {countdown}s: <strong>{next.label}</strong>
              </p>
              <div className="vp__endedActions">
                <button type="button" className="btn btn--primary" onClick={next.onPlay}>
                  <MdSkipNext /> Play now
                </button>
                <button type="button" className="btn btn--glass" onClick={() => setCountdown(null)}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="vp__endedActions">
              <button type="button" className="btn btn--primary" onClick={toggle}>
                <IoRefresh /> Watch again
              </button>
              {next && (
                <button type="button" className="btn btn--glass" onClick={next.onPlay}>
                  <MdSkipNext /> Next: {next.label}
                </button>
              )}
              <button type="button" className="btn btn--glass" onClick={onBack}>
                Back
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default VideoPlayer
