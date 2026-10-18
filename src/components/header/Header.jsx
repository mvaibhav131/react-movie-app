import { useEffect, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { IoBookmarkOutline, IoMenu, IoMoonOutline, IoSearchOutline, IoSunnyOutline } from 'react-icons/io5'
import wordmark from '../../assets/vmflix-wordmark.svg'
import { DESKTOP_NAV } from '../../config/navigation'
import { isHeroRoute } from '../../config/routes'
import { useTheme } from '../../context/ThemeContext'
import SearchPanel from './SearchPanel'
import MobileDrawer from './MobileDrawer'
import ProfileMenu from './ProfileMenu'
import './style.scss'

const Header = () => {
  const [scrolled, setScrolled] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()

  useEffect(() => {
    setDrawerOpen(false)
    setSearchOpen(false)
  }, [pathname])

  useEffect(() => {
    let frame = 0
    const update = () => setScrolled(window.scrollY > 24)
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])

  // "/" opens search from anywhere outside a text field.
  useEffect(() => {
    const onKey = (event) => {
      const el = document.activeElement
      const typing = el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const floating = isHeroRoute(pathname) && !scrolled && !drawerOpen && !searchOpen

  return (
    <>
      <header className={`header ${floating ? 'header--floating' : 'header--solid'}`}>
        <div className="contentWrapper header__bar">
          <button type="button" className="header__iconBtn header__menu" aria-label="Open menu" aria-haspopup="dialog" aria-expanded={drawerOpen} aria-controls="mobile-drawer" onClick={() => setDrawerOpen(true)}>
            <IoMenu />
          </button>

          <Link to="/" className="header__logo" aria-label="VM Flix home">
            <img src={wordmark} alt="VM Flix" width="142" height="36" />
          </Link>

          <nav className="header__nav" aria-label="Primary">
            <ul>
              {DESKTOP_NAV.map(({ id, label, to, end }) => (
                <li key={id}>
                  <NavLink to={to} end={end} className={({ isActive }) => `header__link ${isActive ? 'isActive' : ''}`}>
                    {label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="header__actions">
            <button type="button" className="header__iconBtn" aria-label="Search" aria-haspopup="dialog" aria-expanded={searchOpen} onClick={() => setSearchOpen(true)}>
              <IoSearchOutline />
            </button>
            <NavLink to="/my-list" className={({ isActive }) => `header__iconBtn header__list ${isActive ? 'isActive' : ''}`} aria-label="My List">
              <IoBookmarkOutline />
              <span className="header__listLabel">My List</span>
            </NavLink>
            <button type="button" className="header__iconBtn header__theme" aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} onClick={toggleTheme}>
              {theme === 'dark' ? <IoSunnyOutline /> : <IoMoonOutline />}
            </button>
            <ProfileMenu />
          </div>
        </div>
      </header>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
      <MobileDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  )
}

export default Header
