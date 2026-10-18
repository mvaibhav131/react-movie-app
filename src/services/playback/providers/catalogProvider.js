import { catalogSourcesFor } from '../../catalog'

/** Titles listed in the licensed-content manifest (public/catalog.json). */
export const catalogProvider = {
  id: 'catalog',
  async findSources({ mediaType, id, season, episode }) {
    const { entry, sources } = await catalogSourcesFor({ mediaType, id, season, episode })
    if (!entry) return []
    return sources.map((source) => ({ ...source, provider: 'catalog', license: entry.license }))
  },
}
