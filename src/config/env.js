const env = import.meta.env

export const TMDB_TOKEN = env.VITE_TMDB_TOKEN || ''
export const YOUTUBE_API_KEY = env.VITE_YOUTUBE_API_KEY || ''
export const CRICAPI_KEY = env.VITE_CRICAPI_KEY || ''
export const SPORTSDB_KEY = env.VITE_SPORTSDB_KEY || '123'
export const CATALOG_URL = env.VITE_CATALOG_URL || `${env.BASE_URL}catalog.json`
export const FREE_MOVIES_URL = env.VITE_FREE_MOVIES_URL || `${env.BASE_URL}free-movies.json`

export const TMDB_API_BASE = 'https://api.themoviedb.org/3'
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p'
