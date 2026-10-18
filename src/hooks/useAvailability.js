import useAsync from './useAsync'
import { resolveAvailability } from '../services/availability'
import { yearOf } from '../utils/dates'

/** Resolves what a viewer can do with a TMDB title (watch here, trailer, upcoming...). */
export default function useAvailability(data, mediaType) {
  const key = data ? `${mediaType}:${data.id}` : ''
  return useAsync(
    (signal) => {
      const releaseDate = data.release_date || data.first_air_date
      return resolveAvailability(
        {
          mediaType,
          id: data.id,
          title: data.title || data.name,
          year: yearOf(releaseDate),
          releaseDate,
          videos: data.videos,
        },
        { signal }
      )
    },
    [key],
    { enabled: !!data }
  )
}
