import { describe, expect, it, vi } from 'vitest'
import reducer, {
  addSearchTerm,
  hydrateLibrary,
  loadLibrary,
  saveProgress,
  setPref,
  toggleFavoriteTrack,
  toggleMyList,
  createPlaylist,
  addToPlaylist,
  clearProgress,
} from './librarySlice'
import { selectContinueWatching, selectIsInList } from './selectors'

const fresh = () => reducer(undefined, hydrateLibrary({ owner: 'test', data: loadLibrary('test-empty') }))
const movie = { id: 1, mediaType: 'movie', title: 'One', poster_path: '/p.jpg', release_date: '2026-01-01' }
const show = { id: 2, mediaType: 'tv', title: 'Two', first_air_date: '2025-01-01' }
const wrap = (library) => ({ library })

describe('My List', () => {
  it('toggles titles in and out and stores a compact record', () => {
    let state = reducer(fresh(), toggleMyList(movie))
    expect(state.myList).toHaveLength(1)
    expect(state.myList[0]).toMatchObject({ id: 1, mediaType: 'movie', posterPath: '/p.jpg', year: 2026 })
    expect(selectIsInList(wrap(state), 'movie', 1)).toBe(true)
    expect(selectIsInList(wrap(state), 'tv', 1)).toBe(false)
    state = reducer(state, toggleMyList(movie))
    expect(state.myList).toHaveLength(0)
  })
})

describe('playback progress', () => {
  it('records position and marks near-complete playback as completed', () => {
    let state = reducer(fresh(), saveProgress({ title: movie, position: 600, duration: 7200 }))
    expect(state.progress['movie:1']).toMatchObject({ position: 600, completed: false })
    expect(selectContinueWatching(wrap(state))).toHaveLength(1)

    state = reducer(state, saveProgress({ title: movie, position: 7100, duration: 7200 }))
    expect(state.progress['movie:1'].completed).toBe(true)
    expect(selectContinueWatching(wrap(state))).toHaveLength(0)
  })

  it('ignores tiny positions in Continue Watching', () => {
    const state = reducer(fresh(), saveProgress({ title: movie, position: 4, duration: 7200 }))
    expect(selectContinueWatching(wrap(state))).toHaveLength(0)
  })

  it('keeps per-episode progress and offers the next episode after a finished one', () => {
    let state = reducer(fresh(), saveProgress({ title: show, position: 300, duration: 2400, season: 1, episode: 2, episodeTitle: 'Pilot' }))
    expect(state.progress['tv:2'].episodes['1x2']).toMatchObject({ position: 300, completed: false })

    state = reducer(state, saveProgress({ title: show, position: 2380, duration: 2400, season: 1, episode: 2, next: { season: 1, episode: 3 } }))
    const entry = state.progress['tv:2']
    expect(entry.completed).toBe(true)
    expect(entry.next).toEqual({ season: 1, episode: 3 })
    expect(entry.episodes['1x2'].completed).toBe(true)
    expect(selectContinueWatching(wrap(state))).toHaveLength(1)
  })

  it('removes an entry on demand and lists newest first', () => {
    const now = vi.spyOn(Date, 'now')
    now.mockReturnValue(1000)
    let state = reducer(fresh(), saveProgress({ title: movie, position: 100, duration: 7200 }))
    now.mockReturnValue(2000)
    state = reducer(state, saveProgress({ title: show, position: 100, duration: 2400, season: 1, episode: 1 }))
    expect(selectContinueWatching(wrap(state)).map((e) => e.key)).toEqual(['tv:2', 'movie:1'])
    state = reducer(state, clearProgress('tv:2'))
    expect(Object.keys(state.progress)).toEqual(['movie:1'])
    now.mockRestore()
  })
})

describe('preferences, history and music', () => {
  it('only accepts known preference keys', () => {
    let state = reducer(fresh(), setPref({ key: 'quality', value: '720' }))
    expect(state.prefs.quality).toBe('720')
    state = reducer(state, setPref({ key: 'isAdmin', value: true }))
    expect(state.prefs.isAdmin).toBeUndefined()
  })

  it('keeps unique, most-recent-first search history capped at 10', () => {
    let state = fresh()
    for (let i = 0; i < 12; i += 1) state = reducer(state, addSearchTerm(`term ${i}`))
    state = reducer(state, addSearchTerm('TERM 5'))
    expect(state.searchHistory).toHaveLength(10)
    expect(state.searchHistory[0]).toBe('TERM 5')
    expect(state.searchHistory.filter((t) => t.toLowerCase() === 'term 5')).toHaveLength(1)
  })

  it('manages favourites and playlists without duplicates', () => {
    const track = { id: 'abc', title: 'Song' }
    let state = reducer(fresh(), toggleFavoriteTrack(track))
    expect(state.music.favorites).toHaveLength(1)
    state = reducer(state, toggleFavoriteTrack(track))
    expect(state.music.favorites).toHaveLength(0)

    state = reducer(state, createPlaylist({ id: 'p1', name: '  Road trip  ' }))
    state = reducer(state, addToPlaylist({ playlistId: 'p1', track }))
    state = reducer(state, addToPlaylist({ playlistId: 'p1', track }))
    expect(state.music.playlists[0]).toMatchObject({ name: 'Road trip' })
    expect(state.music.playlists[0].items).toHaveLength(1)
  })
})

describe('loadLibrary', () => {
  it('returns safe defaults for missing or corrupted storage', () => {
    localStorage.setItem('vmflix:v1:broken', '{not json')
    const lib = loadLibrary('broken')
    expect(lib.myList).toEqual([])
    expect(lib.prefs.autoplayNext).toBe(true)
    localStorage.setItem('vmflix:v1:weird', JSON.stringify({ myList: 'nope', progress: [], prefs: { quality: '480' } }))
    const weird = loadLibrary('weird')
    expect(weird.myList).toEqual([])
    expect(weird.progress).toEqual({})
    expect(weird.prefs.quality).toBe('480')
  })
})
