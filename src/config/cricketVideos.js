/**
 * Official channels that publish cricket for free on YouTube and allow embedding: highlights, full-match replays and,
 * when a tournament streams there, live broadcasts. Only the rights holders' own channels belong here.
 * England & Wales Cricket Board and Windies Cricket are left out: their videos refused to play in the embedded
 * player when checked, although the API reports them as embeddable.
 * `UULF` = uploads without Shorts, `UULV` = live streams (both are YouTube's automatic playlists for a channel).
 */
export const CRICKET_VIDEO_CHANNELS = [
  { id: 'icc', name: 'ICC', channelId: 'UCt2JXOLNxqry7B_4rRZME3Q' },
  { id: 'cricketau', name: 'cricket.com.au', channelId: 'UCkBY0aHJP9BwjZLDYxAQrKg' },
  { id: 'slc', name: 'Sri Lanka Cricket', channelId: 'UCJA-NQ4MtcRIog66wziD8fA' },
  { id: 'csa', name: 'Cricket South Africa', channelId: 'UCzevPCfP7MtRqOB0ZkU5cwg' },
  { id: 'bcb', name: 'Bangladesh Cricket', channelId: 'UC0gsMYK1dqQ5KqOQfavVNkg' },
  { id: 'mi', name: 'Mumbai Indians', channelId: 'UCl23mvQ3321L7zO6JyzhVmg' },
].map((channel) => ({
  ...channel,
  videosPlaylistId: `UULF${channel.channelId.slice(2)}`,
  livePlaylistId: `UULV${channel.channelId.slice(2)}`,
}))
