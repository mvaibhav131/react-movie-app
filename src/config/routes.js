/** Routes whose first section is full-bleed artwork, so the header floats over it. */
export const isHeroRoute = (pathname) => pathname === '/' || /^\/(movie|tv)\/\d+\/?$/.test(pathname)

/** The player takes over the whole screen; app chrome is hidden there. */
export const isWatchRoute = (pathname) => pathname.startsWith('/watch/')

export const detailsPath = (mediaType, id) => `/${mediaType}/${id}`

/** Player URL. Series need a season and episode. */
export const watchPath = (mediaType, id, { season, episode } = {}) => {
  const params = new URLSearchParams()
  if (season != null) params.set('season', season)
  if (episode != null) params.set('episode', episode)
  const query = params.toString()
  return `/watch/${mediaType}/${id}${query ? `?${query}` : ''}`
}
