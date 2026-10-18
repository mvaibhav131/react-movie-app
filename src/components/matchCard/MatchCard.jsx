import { useState } from 'react'
import { IoLocationOutline, IoTimeOutline } from 'react-icons/io5'
import { describeMatchStart } from '../../utils/format'
import './style.scss'

const Logo = ({ team }) => {
  const [broken, setBroken] = useState(false)
  if (!team.logo || broken) return <span className="matchCard__logo matchCard__logo--fallback" aria-hidden="true">{team.name.slice(0, 1)}</span>
  return <img className="matchCard__logo" src={team.logo} alt="" width="36" height="36" loading="lazy" onError={() => setBroken(true)} />
}

const BADGES = {
  live: { text: 'Live', className: 'badge--live', dot: true },
  unknown: { text: 'Started · status unconfirmed', className: 'badge--warn' },
  upcoming: { text: 'Upcoming', className: '' },
  completed: { text: 'Result', className: 'badge--success' },
  postponed: { text: 'Postponed', className: 'badge--warn' },
}

/** One fixture, live match or result; video is shown only when an official in-page stream is available. */
const MatchCard = ({ match, compact = false }) => {
  const badge = BADGES[match.status] || BADGES.upcoming

  return (
    <article className={`matchCard matchCard--${match.status} ${compact ? 'matchCard--compact' : ''}`}>
      <header className="matchCard__head">
        <span className="matchCard__league">{match.league}</span>
        <span className={`badge ${badge.className}`}>
          {badge.dot && <i className="matchCard__dot" aria-hidden="true" />}
          {badge.text}
        </span>
      </header>

      <ul className="matchCard__teams" aria-label={match.name}>
        {match.teams.map((team) => (
          <li key={team.name}>
            <Logo team={team} />
            <span className="matchCard__name">{team.name}</span>
            {team.score && <strong className="matchCard__score">{team.score}</strong>}
          </li>
        ))}
      </ul>

      <p className="matchCard__meta">
        <IoTimeOutline aria-hidden="true" /> {describeMatchStart(match)}
      </p>
      {match.venue && !compact && (
        <p className="matchCard__meta">
          <IoLocationOutline aria-hidden="true" /> {match.venue}
        </p>
      )}
      {(match.result || (match.statusText && match.status !== 'upcoming')) && <p className="matchCard__result">{match.result || match.statusText}</p>}

    </article>
  )
}

export default MatchCard
