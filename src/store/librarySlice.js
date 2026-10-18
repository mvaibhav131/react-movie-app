import { createSlice } from '@reduxjs/toolkit'
import { local } from '../utils/storage'
import { toStoredTitle, titleKey } from '../services/normalize'

const STORAGE_PREFIX = 'vmflix:v1:'
const MAX_PROGRESS = 100
const MAX_SEARCH_HISTORY = 10
const MAX_RECENT_TRACKS = 30
const MAX_FAVORITE_TRACKS = 300

export const DEFAULT_PREFS = Object.freeze({
  language: 'any',
  subtitleLang: 'off',
  quality: 'auto',
  autoplayNext: true,
})

const emptyLibrary = (owner) => ({
  owner,
  myList: [],
  progress: {},
  searchHistory: [],
  music: { favorites: [], recent: [], playlists: [] },
  prefs: { ...DEFAULT_PREFS },
  downloads: [],
})

const asArray = (value) => (Array.isArray(value) ? value : [])
const asObject = (value) => (value && typeof value === 'object' && !Array.isArray(value) ? value : {})

/** Reads and sanitises a persisted library so corrupted or older data never crashes the UI. */
export const loadLibrary = (owner) => {
  const raw = asObject(local.read(`${STORAGE_PREFIX}${owner}`, {}))
  const music = asObject(raw.music)
  return {
    ...emptyLibrary(owner),
    myList: asArray(raw.myList).filter((t) => t && t.id != null && (t.mediaType === 'movie' || t.mediaType === 'tv')),
    progress: asObject(raw.progress),
    searchHistory: asArray(raw.searchHistory).filter((q) => typeof q === 'string'),
    music: {
      favorites: asArray(music.favorites),
      recent: asArray(music.recent),
      playlists: asArray(music.playlists).filter((p) => p && p.id && Array.isArray(p.items)),
    },
    prefs: { ...DEFAULT_PREFS, ...asObject(raw.prefs) },
    downloads: asArray(raw.downloads),
  }
}

export const persistLibrary = (library) => {
  const { owner, ...rest } = library
  local.write(`${STORAGE_PREFIX}${owner}`, rest)
}

export const initialOwner = () => {
  const auth = local.read('movieapp_auth', null)
  return auth?.isLoggedIn && auth?.user?.id ? String(auth.user.id) : 'guest'
}

const isCompleted = (position, duration) =>
  duration > 0 && (position / duration >= 0.95 || duration - position < 45)

const pruneProgress = (progress) => {
  const keys = Object.keys(progress)
  if (keys.length <= MAX_PROGRESS) return
  keys
    .sort((a, b) => (progress[a].updatedAt || 0) - (progress[b].updatedAt || 0))
    .slice(0, keys.length - MAX_PROGRESS)
    .forEach((key) => delete progress[key])
}

const librarySlice = createSlice({
  name: 'library',
  initialState: () => loadLibrary(initialOwner()),
  reducers: {
    hydrateLibrary: (_state, action) => ({ ...action.payload.data, owner: action.payload.owner }),

    toggleMyList: (state, action) => {
      const stored = toStoredTitle(action.payload)
      const key = titleKey(stored)
      const index = state.myList.findIndex((t) => titleKey(t) === key)
      if (index >= 0) state.myList.splice(index, 1)
      else state.myList.unshift({ ...stored, addedAt: Date.now() })
    },
    removeFromMyList: (state, action) => {
      const key = titleKey(action.payload)
      state.myList = state.myList.filter((t) => titleKey(t) !== key)
    },

    saveProgress: (state, action) => {
      const { title, position, duration, season, episode, episodeTitle, next } = action.payload
      const stored = toStoredTitle(title)
      const key = titleKey(stored)
      const previous = state.progress[key] || {}
      const completed = isCompleted(position, duration)
      const entry = {
        ...previous,
        key,
        title: stored,
        position,
        duration,
        percent: duration > 0 ? Math.min(1, position / duration) : 0,
        completed,
        updatedAt: Date.now(),
        season: season ?? null,
        episode: episode ?? null,
        episodeTitle: episodeTitle || null,
        next: completed ? next || null : null,
      }
      if (stored.mediaType === 'tv' && season != null && episode != null) {
        entry.episodes = {
          ...(previous.episodes || {}),
          [`${season}x${episode}`]: { position, duration, completed, updatedAt: Date.now() },
        }
      }
      state.progress[key] = entry
      pruneProgress(state.progress)
    },
    clearProgress: (state, action) => {
      delete state.progress[action.payload]
    },
    clearAllProgress: (state) => {
      state.progress = {}
    },

    addSearchTerm: (state, action) => {
      const term = String(action.payload || '').trim()
      if (!term) return
      state.searchHistory = [term, ...state.searchHistory.filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(
        0,
        MAX_SEARCH_HISTORY
      )
    },
    removeSearchTerm: (state, action) => {
      state.searchHistory = state.searchHistory.filter((t) => t !== action.payload)
    },
    clearSearchHistory: (state) => {
      state.searchHistory = []
    },

    setPref: (state, action) => {
      const { key, value } = action.payload
      if (key in DEFAULT_PREFS) state.prefs[key] = value
    },

    toggleFavoriteTrack: (state, action) => {
      const track = action.payload
      const index = state.music.favorites.findIndex((t) => t.id === track.id)
      if (index >= 0) state.music.favorites.splice(index, 1)
      else state.music.favorites = [{ ...track, addedAt: Date.now() }, ...state.music.favorites].slice(0, MAX_FAVORITE_TRACKS)
    },
    addRecentTrack: (state, action) => {
      const track = action.payload
      state.music.recent = [{ ...track, playedAt: Date.now() }, ...state.music.recent.filter((t) => t.id !== track.id)].slice(
        0,
        MAX_RECENT_TRACKS
      )
    },
    clearRecentTracks: (state) => {
      state.music.recent = []
    },
    createPlaylist: (state, action) => {
      const name = String(action.payload.name || '').trim().slice(0, 60)
      if (!name) return
      state.music.playlists.push({ id: action.payload.id, name, items: [], createdAt: Date.now() })
    },
    deletePlaylist: (state, action) => {
      state.music.playlists = state.music.playlists.filter((p) => p.id !== action.payload)
    },
    addToPlaylist: (state, action) => {
      const { playlistId, track } = action.payload
      const playlist = state.music.playlists.find((p) => p.id === playlistId)
      if (playlist && !playlist.items.some((t) => t.id === track.id)) playlist.items.push(track)
    },
    removeFromPlaylist: (state, action) => {
      const { playlistId, trackId } = action.payload
      const playlist = state.music.playlists.find((p) => p.id === playlistId)
      if (playlist) playlist.items = playlist.items.filter((t) => t.id !== trackId)
    },

    upsertDownload: (state, action) => {
      const record = action.payload
      const index = state.downloads.findIndex((d) => d.id === record.id)
      if (index >= 0) state.downloads[index] = { ...state.downloads[index], ...record }
      else state.downloads.unshift(record)
    },
    removeDownloadRecord: (state, action) => {
      state.downloads = state.downloads.filter((d) => d.id !== action.payload)
    },
  },
})

export const {
  hydrateLibrary,
  toggleMyList,
  removeFromMyList,
  saveProgress,
  clearProgress,
  clearAllProgress,
  addSearchTerm,
  removeSearchTerm,
  clearSearchHistory,
  setPref,
  toggleFavoriteTrack,
  addRecentTrack,
  clearRecentTracks,
  createPlaylist,
  deletePlaylist,
  addToPlaylist,
  removeFromPlaylist,
  upsertDownload,
  removeDownloadRecord,
} = librarySlice.actions

export default librarySlice.reducer
