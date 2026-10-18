let probe = null

const video = () => {
  if (!probe && typeof document !== 'undefined') probe = document.createElement('video')
  return probe
}

const can = (type) => !!video()?.canPlayType(type)

/** Safari and iOS play HLS natively; other browsers need Media Source Extensions (hls.js). */
export const canPlayHls = () =>
  can('application/vnd.apple.mpegurl') || (typeof window !== 'undefined' && !!(window.MediaSource || window.ManagedMediaSource))

/** Whether this browser can decode the source's container/codec. */
export const supportsSource = (source) => {
  switch (source.kind) {
    case 'hls':
      return canPlayHls()
    case 'mp4':
      return can('video/mp4; codecs="avc1.42E01E, mp4a.40.2"')
    case 'webm':
      return can('video/webm; codecs="vp9, opus"') || can('video/webm; codecs="vp8, vorbis"')
    case 'youtube':
      return true
    default:
      return false
  }
}
