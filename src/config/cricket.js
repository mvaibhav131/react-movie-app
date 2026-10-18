/**
 * Official places to watch cricket. VM Flix never embeds or proxies third-party live streams: every
 * "Watch live" button opens the broadcaster's own site, which enforces regional rights and licensing.
 *
 * Every URL below was checked to resolve. Broadcast rights change every few years, so keep LEAGUE_RULES
 * up to date; unknown tournaments fall back to DEFAULT_PLATFORMS.
 */
export const PLATFORMS = {
  jiohotstar: { id: 'jiohotstar', name: 'JioHotstar', url: 'https://www.hotstar.com/in', region: 'India' },
  willow: { id: 'willow', name: 'Willow', url: 'https://www.willow.tv', region: 'USA & Canada' },
  fancode: { id: 'fancode', name: 'FanCode', url: 'https://www.fancode.com', region: 'India' },
  skysports: { id: 'skysports', name: 'Sky Sports Cricket', url: 'https://www.skysports.com/cricket', region: 'UK & Ireland' },
  kayo: { id: 'kayo', name: 'Kayo Sports', url: 'https://kayosports.com.au', region: 'Australia' },
  icctv: { id: 'icctv', name: 'ICC.tv', url: 'https://www.icc-cricket.com/icc-tv', region: 'Selected regions' },
  cricketau: { id: 'cricketau', name: 'Cricket Australia', url: 'https://www.cricket.com.au', region: 'Australia' },
  bcci: { id: 'bcci', name: 'BCCI', url: 'https://www.bcci.tv', region: 'India' },
}

export const OFFICIAL_CHANNELS = [
  { name: 'ICC on YouTube', url: 'https://www.youtube.com/@icc', note: 'Highlights and official clips' },
  { name: 'IPL on YouTube', url: 'https://www.youtube.com/@IPL', note: 'Highlights and official clips' },
  { name: 'ICC', url: 'https://www.icc-cricket.com', note: 'Fixtures, rankings and news' },
]

export const LEAGUE_RULES = [
  { test: /indian premier league|\bipl\b/i, platforms: ['jiohotstar', 'willow'] },
  { test: /world cup|champions trophy|world test championship|\bicc\b|asia cup/i, platforms: ['jiohotstar', 'willow', 'skysports', 'icctv'] },
  { test: /big bash|\bbbl\b|sheffield shield|marsh/i, platforms: ['kayo', 'cricketau'] },
  { test: /the hundred/i, platforms: ['skysports'] },
  { test: /india|bcci|ranji/i, platforms: ['jiohotstar', 'bcci'] },
]

export const DEFAULT_PLATFORMS = ['jiohotstar', 'willow', 'skysports', 'kayo', 'fancode']

/** Official platforms that normally show a given tournament / match. */
export const platformsFor = (match) => {
  const text = `${match.league || ''} ${match.name || ''}`
  const rule = LEAGUE_RULES.find((r) => r.test.test(text))
  return (rule ? rule.platforms : DEFAULT_PLATFORMS).map((id) => PLATFORMS[id])
}
