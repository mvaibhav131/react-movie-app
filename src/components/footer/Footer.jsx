import { Link } from 'react-router-dom'
import { FaGithub, FaInstagram, FaLinkedin, FaTwitter } from 'react-icons/fa'
import wordmark from '../../assets/vmflix-wordmark.svg'
import ContentWrapper from '../contentWrapper/ContentWrapper'
import './style.scss'

const EXPLORE = [
  { to: '/free', label: 'Free Movies' },
  { to: '/movies', label: 'Movies' },
  { to: '/tv-shows', label: 'TV Shows' },
  { to: '/web-series', label: 'Web Series' },
  { to: '/marathi', label: 'Marathi' },
  { to: '/south-indian', label: 'South Indian' },
]

const MORE = [
  { to: '/live', label: 'Live Cricket' },
  { to: '/music', label: 'Music' },
  { to: '/my-list', label: 'My List' },
  { to: '/downloads', label: 'Downloads' },
  { to: '/settings', label: 'Settings' },
]

const SOCIAL = [
  { href: 'https://github.com/mvaibhav131', label: 'GitHub', Icon: FaGithub },
  { href: 'https://www.instagram.com/vaibhavmore1997/', label: 'Instagram', Icon: FaInstagram },
  { href: 'https://twitter.com/mvaibhav131', label: 'Twitter', Icon: FaTwitter },
  { href: 'https://www.linkedin.com/in/vaibhav131/', label: 'LinkedIn', Icon: FaLinkedin },
]

const Footer = () => (
  <footer className="footer">
    <ContentWrapper>
      <div className="footer__grid">
        <div className="footer__brand">
          <img src={wordmark} alt="VM Flix" width="142" height="36" />
          <p>Discover movies, TV shows, web series, live cricket and music videos. Films and videos play from official sources: public-domain archives and the rights holders&apos; own YouTube channels.</p>
        </div>
        <nav aria-label="Explore">
          <h2>Explore</h2>
          <ul>
            {EXPLORE.map(({ to, label }) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <nav aria-label="More">
          <h2>More</h2>
          <ul>
            {MORE.map(({ to, label }) => (
              <li key={to}>
                <Link to={to}>{label}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <div>
          <h2>Follow</h2>
          <ul className="footer__social">
            {SOCIAL.map(({ href, label, Icon }) => (
              <li key={label}>
                <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label}>
                  <Icon />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="footer__legal">
        <p>
          Film and TV metadata and images are provided by{' '}
          <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer">
            TMDB
          </a>
          . This product uses the TMDB API but is not endorsed or certified by TMDB.
        </p>
        <p>
          Made by{' '}
          <a href="https://vaibhav-more-portfolio-site.netlify.app/" target="_blank" rel="noopener noreferrer">
            Vaibhav More
          </a>{' '}
          &middot; VM Flix
        </p>
      </div>
    </ContentWrapper>
  </footer>
)

export default Footer
