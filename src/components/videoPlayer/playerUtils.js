/** Converts SRT subtitles to WebVTT so they can be used in a <track>. */
export const srtToVtt = (srt) =>
  `WEBVTT\n\n${String(srt)
    .replace(/\r+/g, '')
    .trim()
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2')}\n`

export const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

export const MEDIA_ERROR_MESSAGES = {
  1: 'Playback was interrupted.',
  2: 'A network problem stopped the video.',
  3: 'The video could not be decoded on this device.',
  4: 'This video format is not supported by your browser.',
}

/** Level to start on for a preferred height: the highest level not above it, else the lowest available. */
export const pickLevelIndex = (levels, preferredHeight) => {
  if (!levels.length || !preferredHeight || preferredHeight === 'auto') return -1
  const wanted = Number(preferredHeight)
  const sorted = [...levels].sort((a, b) => a.height - b.height)
  const fit = [...sorted].reverse().find((l) => l.height <= wanted)
  return (fit || sorted[0]).index
}

/** "Natural" language name for a track, falling back to its label. */
export const trackLabel = (track) => {
  if (track.label && track.label.trim()) return track.label
  try {
    return new Intl.DisplayNames(['en'], { type: 'language' }).of(track.lang) || track.lang
  } catch {
    return track.lang || 'Track'
  }
}

export const supportsPip = () => typeof document !== 'undefined' && !!document.pictureInPictureEnabled

export const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null
