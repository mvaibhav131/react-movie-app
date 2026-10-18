import { Link } from 'react-router-dom'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'

const LINKS = [
  { to: '/free', label: 'Free Movies' },
  { to: '/movies', label: 'Movies' },
  { to: '/tv-shows', label: 'TV Shows' },
  { to: '/web-series', label: 'Web Series' },
  { to: '/marathi', label: 'Marathi' },
  { to: '/south-indian', label: 'South Indian' },
  { to: '/live', label: 'Live Cricket' },
  { to: '/music', label: 'Music' },
]

/** Quick category shortcuts: the mobile bottom bar only has room for five destinations. */
const QuickLinks = () => (
  <ContentWrapper className="quickLinks">
    <nav aria-label="Browse categories" className="chipRow">
      {LINKS.map(({ to, label }) => (
        <Link key={to} to={to} className="chip">
          {label}
        </Link>
      ))}
    </nav>
  </ContentWrapper>
)

export default QuickLinks
