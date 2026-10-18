const PROVIDER_PRIORITY = { catalog: 2, archive: 1, youtube: 0 }

const heightScore = (height, target) => {
  if (!height) return 0
  if (target === 'auto') return Math.min(height, 1080) / 1080
  const wanted = Number(target)
  // Closest to the preference wins, slightly favouring equal-or-lower so we never overshoot data caps.
  const distance = Math.abs(height - wanted) / wanted
  return 1 - distance - (height > wanted ? 0.05 : 0)
}

/**
 * Orders playable sources best-first. Adaptive HLS comes first (it can pick quality on its own),
 * then progressive files by closeness to the preferred quality; ties go to the more trusted provider.
 */
export const rankSources = (sources, { quality = 'auto' } = {}) =>
  [...sources]
    .map((source) => ({
      source,
      score: (source.kind === 'hls' ? 10 : 0) + (PROVIDER_PRIORITY[source.provider] || 0) + heightScore(source.height, quality),
    }))
    .sort((a, b) => b.score - a.score)
    .map(({ source }) => source)
