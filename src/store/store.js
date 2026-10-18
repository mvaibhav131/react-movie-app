import { configureStore, createListenerMiddleware, isAnyOf } from '@reduxjs/toolkit'
import homeReducer from './homeSlice'
import authReducer, { loginSuccess, logoutUser } from './authSlice'
import libraryReducer, { hydrateLibrary, loadLibrary, persistLibrary } from './librarySlice'

const listener = createListenerMiddleware()

// Each signed-in account (and the guest profile) keeps its own list, progress and preferences.
listener.startListening({
  matcher: isAnyOf(loginSuccess, logoutUser),
  effect: (action, api) => {
    const owner = loginSuccess.match(action) && action.payload?.id ? String(action.payload.id) : 'guest'
    api.dispatch(hydrateLibrary({ owner, data: loadLibrary(owner) }))
  },
})

export const store = configureStore({
  reducer: {
    home: homeReducer,
    user: authReducer,
    library: libraryReducer,
  },
  middleware: (getDefault) => getDefault().prepend(listener.middleware),
})

let lastLibrary = store.getState().library
let persistTimer = null

store.subscribe(() => {
  const current = store.getState().library
  if (current === lastLibrary) return
  lastLibrary = current
  clearTimeout(persistTimer)
  persistTimer = setTimeout(() => persistLibrary(lastLibrary), 400)
})

// Flush pending writes when the tab is hidden or closed so playback progress is never lost.
if (typeof window !== 'undefined') {
  const flush = () => {
    clearTimeout(persistTimer)
    persistLibrary(store.getState().library)
  }
  window.addEventListener('pagehide', flush)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
}
