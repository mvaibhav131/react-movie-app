import { useCallback, useEffect, useRef, useState } from 'react'
import { pickLevelIndex } from './playerUtils'

const EMPTY = { levels: [], level: -1, autoHeight: 0, audio: [], audioIndex: -1, subtitles: [], subtitleIndex: -1 }
const MAX_NETWORK_RETRIES = 3

/**
 * Attaches a source to a <video>: hls.js (loaded on demand) for adaptive streams, the native element for
 * progressive files and Safari's built-in HLS. Exposes quality levels plus audio/subtitle tracks for HLS.
 * `onFatal({ message })` fires only when playback cannot continue.
 */
export default function useVideoEngine({ videoRef, source, preferredQuality = 'auto', preferredSubtitle = 'off', onFatal }) {
  const [tracks, setTracks] = useState(EMPTY)
  const hlsRef = useRef(null)
  const fatalRef = useRef(onFatal)
  fatalRef.current = onFatal
  const prefRef = useRef({ preferredQuality, preferredSubtitle })
  prefRef.current = { preferredQuality, preferredSubtitle }

  useEffect(() => {
    const video = videoRef.current
    if (!video || !source) return undefined
    let cancelled = false
    let networkRetries = 0
    let mediaRetries = 0
    setTracks(EMPTY)

    const attach = async () => {
      if (source.kind !== 'hls') {
        video.src = source.url
        return
      }
      const { default: Hls } = await import('hls.js')
      if (cancelled) return
      if (!Hls.isSupported()) {
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
          video.src = source.url
        } else {
          fatalRef.current?.({ message: 'Adaptive streaming is not supported in this browser.' })
        }
        return
      }

      const hls = new Hls({ capLevelToPlayerSize: true, maxBufferLength: 40, enableWorker: true, startFragPrefetch: true })
      hlsRef.current = hls

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        const levels = data.levels.map((l, index) => ({ index, height: l.height || 0, width: l.width || 0, bitrate: l.bitrate || 0 }))
        const start = pickLevelIndex(levels, prefRef.current.preferredQuality)
        if (start >= 0) hls.currentLevel = start
        setTracks((t) => ({ ...t, levels, level: start }))
      })
      hls.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        setTracks((t) => ({ ...t, autoHeight: hls.levels[data.level]?.height || 0 }))
      })
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        setTracks((t) => ({
          ...t,
          audio: hls.audioTracks.map((a, index) => ({ index, lang: a.lang || '', label: a.name || a.lang || `Track ${index + 1}` })),
          audioIndex: hls.audioTrack,
        }))
      })
      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => setTracks((t) => ({ ...t, audioIndex: hls.audioTrack })))
      hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        const list = hls.subtitleTracks.map((s, index) => ({ index, lang: s.lang || '', label: s.name || s.lang || `Subtitles ${index + 1}` }))
        const want = prefRef.current.preferredSubtitle
        const match = want && want !== 'off' ? list.find((s) => s.lang.toLowerCase().startsWith(want.toLowerCase())) : null
        hls.subtitleDisplay = !!match
        hls.subtitleTrack = match ? match.index : -1
        setTracks((t) => ({ ...t, subtitles: list, subtitleIndex: match ? match.index : -1 }))
      })
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (import.meta.env.DEV) console.warn('[hls]', data.type, data.details, data.fatal ? '(fatal)' : '', data.reason || data.error?.message || '')
        if (!data.fatal) return
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR && networkRetries < MAX_NETWORK_RETRIES) {
          networkRetries += 1
          setTimeout(() => !cancelled && hls.startLoad(), 800 * networkRetries)
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRetries < 2) {
          mediaRetries += 1
          if (mediaRetries === 2) hls.swapAudioCodec()
          hls.recoverMediaError()
        } else {
          fatalRef.current?.({ message: data.type === Hls.ErrorTypes.NETWORK_ERROR ? 'The stream could not be reached.' : 'The stream could not be played.' })
        }
      })

      hls.loadSource(source.url)
      hls.attachMedia(video)
    }

    attach().catch(() => !cancelled && fatalRef.current?.({ message: 'The player could not start.' }))

    return () => {
      cancelled = true
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
      video.removeAttribute('src')
      video.load()
    }
  }, [videoRef, source])

  const setLevel = useCallback((index) => {
    if (hlsRef.current) hlsRef.current.currentLevel = index
    setTracks((t) => ({ ...t, level: index }))
  }, [])

  const setAudio = useCallback(
    (index) => {
      if (hlsRef.current) hlsRef.current.audioTrack = index
      else {
        const list = videoRef.current?.audioTracks
        if (list) for (let i = 0; i < list.length; i += 1) list[i].enabled = i === index
      }
      setTracks((t) => ({ ...t, audioIndex: index }))
    },
    [videoRef]
  )

  /** -1 turns subtitles off. */
  const setSubtitle = useCallback((index) => {
    const hls = hlsRef.current
    if (hls) {
      hls.subtitleDisplay = index >= 0
      hls.subtitleTrack = index
    }
    setTracks((t) => ({ ...t, subtitleIndex: index }))
  }, [])

  return { tracks, setLevel, setAudio, setSubtitle, isHls: () => !!hlsRef.current }
}
