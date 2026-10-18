import { useRef } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  IoClose,
  IoDownloadOutline,
  IoLogInOutline,
  IoLogOutOutline,
  IoMoonOutline,
  IoSettingsOutline,
  IoSunnyOutline,
} from 'react-icons/io5'
import wordmark from '../../assets/vmflix-wordmark.svg'
import { NAV_ITEMS } from '../../config/navigation'
import { useTheme } from '../../context/ThemeContext'
import { logoutUser } from '../../store/authSlice'
import useFocusTrap from '../../hooks/useFocusTrap'
import useScrollLock from '../../hooks/useScrollLock'

/** Slide-in menu for small screens; lists every section, not only the bottom-bar shortcuts. */
const MobileDrawer = ({ open, onClose }) => {
  const panelRef = useRef(null)
  const { theme, toggleTheme } = useTheme()
  const { isLoggedIn, user } = useSelector((state) => state.user)
  const dispatch = useDispatch()
  const navigate = useNavigate()

  useScrollLock(open)
  useFocusTrap(panelRef, open, onClose)

  if (!open) return null

  const signOut = () => {
    onClose()
    dispatch(logoutUser())
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <div className="drawer">
      <div className="drawer__backdrop" onClick={onClose} aria-hidden="true" />
      <aside id="mobile-drawer" className="drawer__panel" role="dialog" aria-modal="true" aria-label="Main menu" ref={panelRef}>
        <div className="drawer__head">
          <Link to="/" className="drawer__logo" aria-label="VM Flix home" onClick={onClose}>
            <img src={wordmark} alt="VM Flix" width="126" height="32" />
          </Link>
          <button type="button" className="drawer__close" aria-label="Close menu" onClick={onClose}>
            <IoClose />
          </button>
        </div>

        {isLoggedIn && (
          <p className="drawer__user">
            Signed in as <strong>{user?.name}</strong>
          </p>
        )}

        <nav aria-label="Menu">
          <ul className="drawer__list">
            {NAV_ITEMS.map(({ id, label, to, end, icon: Icon, iconActive: IconActive }) => (
              <li key={id}>
                <NavLink to={to} end={end} className={({ isActive }) => `drawer__link ${isActive ? 'isActive' : ''}`} onClick={onClose}>
                  {({ isActive }) => (
                    <>
                      {isActive ? <IconActive /> : <Icon />}
                      <span>{label}</span>
                    </>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <ul className="drawer__list drawer__list--secondary">
          <li>
            <NavLink to="/downloads" className="drawer__link" onClick={onClose}>
              <IoDownloadOutline />
              <span>Downloads</span>
            </NavLink>
          </li>
          <li>
            <NavLink to="/settings" className="drawer__link" onClick={onClose}>
              <IoSettingsOutline />
              <span>Settings</span>
            </NavLink>
          </li>
          <li>
            <button type="button" className="drawer__link" onClick={toggleTheme}>
              {theme === 'dark' ? <IoSunnyOutline /> : <IoMoonOutline />}
              <span>{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
            </button>
          </li>
          <li>
            {isLoggedIn ? (
              <button type="button" className="drawer__link" onClick={signOut}>
                <IoLogOutOutline />
                <span>Sign out</span>
              </button>
            ) : (
              <NavLink to="/login" className="drawer__link" onClick={onClose}>
                <IoLogInOutline />
                <span>Sign in</span>
              </NavLink>
            )}
          </li>
        </ul>
      </aside>
    </div>
  )
}

export default MobileDrawer
