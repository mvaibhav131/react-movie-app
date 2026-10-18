const ATTRIBUTE = /([A-Z0-9-]+)=("([^"]*)"|[^,]*)/g

const parseAttributes = (line) => {
  const attrs = {}
  for (const match of line.matchAll(ATTRIBUTE)) attrs[match[1]] = match[3] !== undefined ? match[3] : match[2]
  return attrs
}

const unique = (list, keyOf) => {
  const seen = new Set()
  return list.filter((item) => {
    const key = keyOf(item)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/** Reads audio languages, subtitle languages and the top resolution out of an HLS master playlist. */
export const parseHlsTracks = (manifest) => {
  const audio = []
  const subtitles = []
  let maxHeight = 0
  String(manifest || '')
    .split(/\r?\n/)
    .forEach((line) => {
      if (line.startsWith('#EXT-X-MEDIA:')) {
        const attrs = parseAttributes(line.slice('#EXT-X-MEDIA:'.length))
        const track = { lang: attrs.LANGUAGE || '', label: attrs.NAME || attrs.LANGUAGE || '' }
        if (attrs.TYPE === 'AUDIO') audio.push(track)
        else if (attrs.TYPE === 'SUBTITLES') subtitles.push(track)
      } else if (line.startsWith('#EXT-X-STREAM-INF:')) {
        const resolution = parseAttributes(line.slice('#EXT-X-STREAM-INF:'.length)).RESOLUTION
        const height = Number(resolution?.split('x')[1])
        if (height > maxHeight) maxHeight = height
      }
    })
  return {
    audio: unique(audio, (t) => t.lang || t.label),
    subtitles: unique(subtitles, (t) => t.lang || t.label),
    maxHeight,
  }
}
