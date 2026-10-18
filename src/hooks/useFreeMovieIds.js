import { useEffect, useState } from 'react'
import { loadFreeMovies } from '../services/freeMovies'

let loaded = null
let pending = null

/** TMDB ids of the films that play on VM Flix from official YouTube channels; null until the index has loaded. */
export default function useFreeMovieIds() {
  const [ids, setIds] = useState(loaded)
  useEffect(() => {
    if (loaded) return undefined
    let active = true
    if (!pending) {
      pending = loadFreeMovies().then(({ movies }) => {
        loaded = new Set(movies.map((m) => m.id))
        return loaded
      })
    }
    pending.then((set) => active && setIds(set))
    return () => {
      active = false
    }
  }, [])
  return ids
}
