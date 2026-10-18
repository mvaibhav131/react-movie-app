import { findFreeMovie } from '../../freeMovies'

/** Complete films on the rights holders' own YouTube channels (public/free-movies.json), played with YouTube's embed. */
export const youtubeProvider = {
  id: 'youtube',
  async findSources({ mediaType, id }) {
    if (mediaType !== 'movie') return []
    const movie = await findFreeMovie(id)
    if (!movie) return []
    return movie.sources.map((s) => ({
      id: `yt-${s.videoId}`,
      provider: 'youtube',
      kind: 'youtube',
      videoId: s.videoId,
      url: `https://www.youtube.com/watch?v=${s.videoId}`,
      label: `YouTube · ${s.channel}`,
      audioLanguage: s.dubbed,
      license: { name: 'Free on the official YouTube channel', credit: s.channel, url: `https://www.youtube.com/watch?v=${s.videoId}` },
    }))
  },
}
