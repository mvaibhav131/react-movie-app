import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { Toaster } from 'react-hot-toast'
import './App.scss'
import { fetchData } from './utils/api'
import { getGenres } from './store/homeSlice'
import { isHeroRoute, isWatchRoute } from './config/routes'
import Header from './components/header/Header'
import Footer from './components/footer/Footer'
import BottomNav from './components/bottomNav/BottomNav'
import ScrollManager from './components/scrollManager/ScrollManager'
import ErrorBoundary from './components/errorBoundary/ErrorBoundary'
import Spinner from './components/spinner/Spinner'

const Home = lazy(() => import('./pages/home/Home'))
const Browse = lazy(() => import('./pages/browse/Browse'))
const FreeMovies = lazy(() => import('./pages/free/FreeMovies'))
const Details = lazy(() => import('./pages/details/Details'))
const Watch = lazy(() => import('./pages/watch/Watch'))
const Marathi = lazy(() => import('./pages/marathi/Marathi'))
const SouthIndian = lazy(() => import('./pages/southIndian/SouthIndian'))
const Live = lazy(() => import('./pages/live/Live'))
const Music = lazy(() => import('./pages/music/Music'))
const MyList = lazy(() => import('./pages/myList/MyList'))
const Downloads = lazy(() => import('./pages/downloads/Downloads'))
const Settings = lazy(() => import('./pages/settings/Settings'))
const SearchResult = lazy(() => import('./pages/searchResult/SearchResult'))
const Login = lazy(() => import('./components/auth/login/Login'))
const Register = lazy(() => import('./components/auth/registration/Registration'))
const PageNotFound = lazy(() => import('./pages/404/PageNotFound'))

/** Old /explore/:mediaType links keep working. */
const ExploreRedirect = () => {
  const { mediaType } = useParams()
  return <Navigate to={mediaType === 'tv' ? '/tv-shows' : '/movies'} replace />
}

const AppShell = () => {
  const { pathname } = useLocation()
  const watching = isWatchRoute(pathname)
  const flush = isHeroRoute(pathname) || watching

  return (
    <>
      <a href="#main" className="skipLink">
        Skip to content
      </a>
      <ScrollManager />
      {!watching && <Header />}
      <main id="main" className={`appMain ${flush ? 'appMain--flush' : ''}`} tabIndex={-1}>
        <ErrorBoundary resetKey={pathname}>
          <Suspense
            fallback={
              <div className="routeFallback">
                <Spinner />
              </div>
            }
          >
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/movies" element={<Browse kind="movie" />} />
              <Route path="/free" element={<FreeMovies />} />
              <Route path="/tv-shows" element={<Browse kind="tv" />} />
              <Route path="/web-series" element={<Browse kind="web" />} />
              <Route path="/marathi" element={<Marathi />} />
              <Route path="/south-indian" element={<SouthIndian />} />
              <Route path="/south-indian/:lang" element={<SouthIndian />} />
              <Route path="/live" element={<Live />} />
              <Route path="/music" element={<Music />} />
              <Route path="/my-list" element={<MyList />} />
              <Route path="/downloads" element={<Downloads />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/search" element={<SearchResult />} />
              <Route path="/search/:query" element={<SearchResult />} />
              <Route path="/explore/:mediaType" element={<ExploreRedirect />} />
              <Route path="/watch/:mediaType/:id" element={<Watch />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/:mediaType/:id" element={<Details />} />
              <Route path="*" element={<PageNotFound />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!watching && <Footer />}
      {!watching && <BottomNav />}
    </>
  )
}

const App = () => {
  const dispatch = useDispatch()

  // Genre names for chips; not needed for first paint, so failures are silent.
  useEffect(() => {
    const controller = new AbortController()
    Promise.all(['tv', 'movie'].map((type) => fetchData(`/genre/${type}/list`, undefined, { signal: controller.signal, ttl: 24 * 3600 * 1000 })))
      .then((lists) => {
        const all = {}
        lists.forEach(({ genres }) => genres.forEach((genre) => (all[genre.id] = genre)))
        dispatch(getGenres(all))
      })
      .catch(() => {})
    return () => controller.abort()
  }, [dispatch])

  return (
    <BrowserRouter>
      <Toaster
        position="bottom-center"
        containerClassName="toaster"
        toastOptions={{
          duration: 2800,
          style: {
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            fontSize: '14px',
            maxWidth: 'min(420px, calc(100vw - 32px))',
          },
        }}
      />
      <AppShell />
    </BrowserRouter>
  )
}

export default App
