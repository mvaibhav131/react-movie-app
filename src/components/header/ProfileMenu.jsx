import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import {
  IoBookmarkOutline,
  IoDownloadOutline,
  IoLogOutOutline,
  IoPersonCircleOutline,
  IoSettingsOutline,
} from 'react-icons/io5'
import { logoutUser } from '../../store/authSlice'
import useDismiss from '../../hooks/useDismiss'

/** Sign-in button for guests, account menu (list, downloads, settings, sign out) for signed-in users. */
const ProfileMenu = () => {
  const { isLoggedIn, user } = useSelector((state) => state.user)
  const [open, setOpen] = useState(false)
  const ref = useRef(null)
  const dispatch = useDispatch()
  const navigate = useNavigate()
  useDismiss(ref, () => setOpen(false), open)

  if (!isLoggedIn) {
    return (
      <>
        <Link to="/login" className="btn btn--primary btn--sm header__signin">
          Sign in
        </Link>
        <Link to="/login" className="header__iconBtn header__signinIcon" aria-label="Sign in">
          <IoPersonCircleOutline />
        </Link>
      </>
    )
  }

  const initial = user?.name?.trim()?.[0]?.toUpperCase() || 'U'
  const signOut = () => {
    setOpen(false)
    dispatch(logoutUser())
    toast.success('Signed out')
    navigate('/')
  }

  return (
    <div className="profileMenu" ref={ref}>
      <button type="button" className="profileMenu__trigger" aria-haspopup="menu" aria-expanded={open} aria-label={`Account menu for ${user?.name || 'you'}`} onClick={() => setOpen((v) => !v)}>
        <span className="profileMenu__avatar">{initial}</span>
      </button>
      {open && (
        <div className="profileMenu__panel" role="menu">
          <div className="profileMenu__who">
            <strong>{user?.name}</strong>
            <span>{user?.email}</span>
          </div>
          <Link role="menuitem" to="/my-list" onClick={() => setOpen(false)}>
            <IoBookmarkOutline /> My List
          </Link>
          <Link role="menuitem" to="/downloads" onClick={() => setOpen(false)}>
            <IoDownloadOutline /> Downloads
          </Link>
          <Link role="menuitem" to="/settings" onClick={() => setOpen(false)}>
            <IoSettingsOutline /> Settings
          </Link>
          <button type="button" role="menuitem" onClick={signOut}>
            <IoLogOutOutline /> Sign out
          </button>
        </div>
      )}
    </div>
  )
}

export default ProfileMenu
