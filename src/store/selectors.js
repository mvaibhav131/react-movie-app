import { createSelector } from '@reduxjs/toolkit'
import { titleKey } from '../services/normalize'

export const selectLibrary = (state) => state.library
export const selectMyList = (state) => state.library.myList
export const selectProgressMap = (state) => state.library.progress
export const selectPrefs = (state) => state.library.prefs
export const selectSearchHistory = (state) => state.library.searchHistory
export const selectMusicLibrary = (state) => state.library.music
export const selectDownloads = (state) => state.library.downloads
export const selectGenres = (state) => state.home.genres

export const selectIsInList = (state, mediaType, id) =>
  state.library.myList.some((t) => titleKey(t) === `${mediaType}:${id}`)

export const selectProgressFor = (state, mediaType, id) => state.library.progress[`${mediaType}:${id}`] || null

/** Titles to show in "Continue Watching": unfinished, or finished TV episodes that have a next episode. */
export const selectContinueWatching = createSelector([selectProgressMap], (progress) =>
  Object.values(progress)
    .filter((entry) => (entry.completed ? !!entry.next : entry.position >= 10))
    .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
    .slice(0, 20)
)
