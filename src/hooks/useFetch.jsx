import useAsync from './useAsync'
import { fetchData } from '../utils/api'

/** Fetches a TMDB path (optionally with a query string). Same shape as before: { data, loading, error }. */
const useFetch = (url, { params, enabled = true } = {}) => {
  const paramsKey = params ? JSON.stringify(params) : ''
  const { data, loading, error, reload } = useAsync((signal) => fetchData(url, params, { signal }), [url, paramsKey], {
    enabled: enabled && !!url,
  })
  return { data, loading, error, reload }
}

export default useFetch
