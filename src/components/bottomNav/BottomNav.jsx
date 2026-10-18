import { NavLink } from 'react-router-dom'
import { BOTTOM_NAV } from '../../config/navigation'
import './style.scss'

/** Thumb-reachable shortcuts for small screens. Everything else lives in the header drawer. */
const BottomNav = () => (
  <nav className="bottomNav" aria-label="Quick navigation">
    <ul className="bottomNav__list">
      {BOTTOM_NAV.map(({ id, label, short, to, end, icon: Icon, iconActive: IconActive }) => (
        <li key={id}>
          <NavLink to={to} end={end} className={({ isActive }) => `bottomNav__link ${isActive ? 'isActive' : ''}`}>
            {({ isActive }) => (
              <>
                {isActive ? <IconActive aria-hidden="true" /> : <Icon aria-hidden="true" />}
                <span>{short || label}</span>
              </>
            )}
          </NavLink>
        </li>
      ))}
    </ul>
  </nav>
)

export default BottomNav
