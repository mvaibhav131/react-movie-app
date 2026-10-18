/**
 * Official music-label channels. Channel ids were resolved from each channel page's canonical link, so every
 * track in the catalogue comes from the label's own YouTube channel and plays through YouTube's official embed.
 * `playlistId` is the channel's "uploads" playlist (the channel id with the leading "UC" replaced by "UU") and
 * `longFormPlaylistId` is the same list without Shorts ("UULF"), used by the keyless embed.
 * `embed: false` marks labels whose newest uploads showed "This video is unavailable" in YouTube's embedded player
 * when checked (the owner disables embedding). Those open on YouTube instead of playing in the app.
 */
const channel = (id, name, channelId, languages, extra = {}) => ({
  id,
  name,
  channelId,
  playlistId: `UU${channelId.slice(2)}`,
  longFormPlaylistId: `UULF${channelId.slice(2)}`,
  languages,
  embed: true,
  ...extra,
})

export const MUSIC_LANGUAGES = [
  { id: 'hindi', label: 'Hindi' },
  { id: 'marathi', label: 'Marathi' },
  { id: 'tamil', label: 'Tamil' },
  { id: 'telugu', label: 'Telugu' },
  { id: 'kannada', label: 'Kannada' },
  { id: 'malayalam', label: 'Malayalam' },
  { id: 'punjabi', label: 'Punjabi' },
]

export const MUSIC_CHANNELS = [
  channel('tseries', 'T-Series', 'UCq-Fj5jknLsUf-MWSy4_brA', ['hindi'], { embed: false }),
  channel('zeemusic', 'Zee Music Company', 'UCFFbwnve3yF62-tVXkTyHqg', ['hindi']),
  channel('sonyindia', 'Sony Music India', 'UC56gTxNs4f9xZ7Pa2i5xNzg', ['hindi']),
  channel('tips', 'Tips Official', 'UCJrDMFOdv1I2k8n9oK_V21w', ['hindi'], { embed: false }),
  channel('saregama', 'Saregama Music', 'UC_A7K2dXFsTMAciGmnNxy-Q', ['hindi']),
  channel('yrf', 'YRF', 'UCbTLwN10NoCU4WDzLf1JMOA', ['hindi']),

  channel('zeemarathi', 'Zee Music Marathi', 'UCf40kH47yvowumzzK9LVKKg', ['marathi']),
  channel('saregamamarathi', 'Saregama Marathi', 'UCJSX0gNr2U5lawLXE6IjRmA', ['marathi']),
  channel('timesmarathi', 'Times Music Marathi', 'UCz-iAABRK6sicPI2zskD9bg', ['marathi'], { embed: false }),
  channel('everest', 'Everest Marathi', 'UCe7UKRSJM6ITMfXX-CbET0w', ['marathi']),

  channel('thinkmusic', 'Think Music India', 'UCLbdVvreihwZRL6kwuEUYsA', ['tamil'], { embed: false }),
  channel('saregamatamil', 'Saregama Tamil', 'UCzee67JnEcuvjErRyWP3GpQ', ['tamil']),
  channel('sonysouth', 'Sony Music South', 'UCn4rEMqKtwBQ6-oEwbd4PcA', ['tamil', 'telugu', 'kannada', 'malayalam']),
  channel('zeesouth', 'Zee Music South', 'UCLsSLka8jODBozvi5VTQeaQ', ['tamil', 'telugu', 'kannada', 'malayalam']),

  channel('aditya', 'Aditya Music', 'UCNApqoVYJbYSrni4YsbXzyQ', ['telugu'], { embed: false }),
  channel('lahari', 'Lahari Music', 'UCnSqxrSfo1sK4WZ7nBpYW1Q', ['telugu', 'kannada', 'tamil']),
  channel('saregamatelugu', 'Saregama Telugu', 'UC68nKdrLbLL0Vj7ilVkLmmg', ['telugu']),

  channel('anand', 'Anand Audio', 'UCLtCejNl8eAg4PO_9lf2TIg', ['kannada']),
  channel('muzik247', 'Muzik247', 'UChRi1dpwnsZcIo1LSwzY0Iw', ['malayalam']),

  channel('speed', 'Speed Records', 'UCOsyDsO5tIt-VZ1iwjdQmew', ['punjabi'], { embed: false }),
  channel('rhythmboyz', 'Rhythm Boyz', 'UC8KlAzFi-luP2jo_gRgQk7A', ['punjabi']),
  channel('whitehill', 'White Hill Music', 'UCxQRUQmsAHA5GMAI4nddx_w', ['punjabi'], { embed: false }),
  channel('tipspunjabi', 'Tips Punjabi', 'UCF8Ar7alYrtOI5SF6b7T0xA', ['punjabi'], { embed: false }),

  channel('bhakti', 'T-Series Bhakti Sagar', 'UCaayLD9i5x4MmIoVZxXSv_g', ['hindi'], { devotional: true, embed: false }),
  channel('shemaroo', 'Shemaroo Bhakti', 'UC7ZivIYRB0fMSGh-THcTYbw', ['hindi'], { devotional: true }),
  channel('lahariDevotional', 'Lahari Music Devotional', 'UCvHtZOG5gHUnBAWjdKYCRmw', ['telugu', 'kannada', 'tamil'], { devotional: true }),
]

/**
 * Browse categories. `pick` receives the tracks already loaded for the channels in `channels` and returns the
 * ordered list to show. Mood categories match words in titles; they are heuristics, not editorial picks.
 */
const ROMANTIC = /\b(romantic|love|pyaar|pyar|ishq|ishk|mohabbat|dil|tum|tera|tere|sajna|saajna|prem|premachi)\b/i
const PARTY = /\b(party|dance|dj|remix|club|nach|dhol|bhangra|disco|garba)\b/i

export const MUSIC_CATEGORIES = [
  { id: 'latest-hindi', title: 'Latest Hindi Songs', languages: ['hindi'], exclude: 'devotional', sort: 'latest' },
  { id: 'marathi', title: 'Marathi Songs', languages: ['marathi'], sort: 'latest' },
  { id: 'tamil', title: 'Tamil Songs', languages: ['tamil'], sort: 'latest' },
  { id: 'telugu', title: 'Telugu Songs', languages: ['telugu'], sort: 'latest' },
  { id: 'kannada', title: 'Kannada Songs', languages: ['kannada'], sort: 'latest' },
  { id: 'malayalam', title: 'Malayalam Songs', languages: ['malayalam'], sort: 'latest' },
  { id: 'punjabi', title: 'Punjabi Songs', languages: ['punjabi'], sort: 'latest' },
  { id: 'bollywood-hits', title: 'Bollywood Hits', languages: ['hindi'], exclude: 'devotional', sort: 'views' },
  { id: 'romantic', title: 'Romantic Songs', languages: null, exclude: 'devotional', sort: 'views', match: ROMANTIC },
  { id: 'party', title: 'Party Songs', languages: null, exclude: 'devotional', sort: 'views', match: PARTY },
  { id: 'devotional', title: 'Devotional Music', languages: null, only: 'devotional', sort: 'latest' },
  { id: 'trending', title: 'Trending Music Videos', languages: null, exclude: 'devotional', sort: 'trending' },
]

/** Channels that feed a category. */
export const channelsFor = (category, language) =>
  MUSIC_CHANNELS.filter((c) => {
    if (category.only === 'devotional' && !c.devotional) return false
    if (category.exclude === 'devotional' && c.devotional) return false
    const wanted = language ? [language] : category.languages
    return !wanted || c.languages.some((l) => wanted.includes(l))
  })
