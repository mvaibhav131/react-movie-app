import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { IoRefresh } from 'react-icons/io5'
import { countByStatus } from '../../services/cricket/cricketService'
import useCricketBoard from '../../hooks/useCricketBoard'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import MatchCard from '../../components/matchCard/MatchCard'
import CricketVideos from '../../components/cricketVideos/CricketVideos'
import { EmptyState, ErrorState } from '../../components/states/States'
import './style.scss'

const TABS = [
  { id: 'live', label: 'Live now', pick: (m) => m.status === 'live' || m.status === 'unknown' },
  { id: 'upcoming', label: 'Upcoming', pick: (m) => m.status === 'upcoming' },
  { id: 'results', label: 'Results', pick: (m) => m.status === 'completed' || m.status === 'postponed' },
]

const SOURCE_NAMES = { sportsdb: 'TheSportsDB', cricapi: 'CricAPI' }

const timeAgo = (ms) => {
  const minutes = Math.round((Date.now() - ms) / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} min ago`
  return `${Math.round(minutes / 60)} h ago`
}

const Live = () => {
  useDocumentTitle('Live Cricket')
  const { data, loading, error, refresh } = useCricketBoard()
  const [params, setParams] = useSearchParams()
  const matches = useMemo(() => data?.matches || [], [data])
  const counts = useMemo(() => countByStatus(matches), [matches])

  // Open on the most useful tab: live matches, else upcoming fixtures, else results.
  const defaultTab = counts.live + counts.unknown > 0 ? 'live' : counts.upcoming > 0 ? 'upcoming' : matches.length ? 'results' : 'live'
  const tab = TABS.find((t) => t.id === params.get('tab')) || TABS.find((t) => t.id === defaultTab)
  const league = params.get('league') || ''

  const inTab = useMemo(() => matches.filter(tab.pick), [matches, tab])
  const leagues = useMemo(() => [...new Set(inTab.map((m) => m.league))], [inTab])
  const visible = league ? inTab.filter((m) => m.league === league) : inTab

  const select = (key, value) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    if (key === 'tab') next.delete('league')
    setParams(next, { replace: true })
  }

  const tabCount = (t) => matches.filter(t.pick).length

  return (
    <div className="pageBody">
      <PageHeader
        eyebrow="Cricket"
        title="Live Cricket"
        intro="Live scores, fixtures and results stay here. Free live video appears only when an official cricket channel publishes an embeddable stream; official highlights and replays are available below."
      />
      <ContentWrapper className="livePage">
        <CricketVideos />

        <div className="livePage__bar">
          <div className="chipRow" role="tablist" aria-label="Match status">
            {TABS.map((t) => (
              <button key={t.id} type="button" role="tab" id={`tab-${t.id}`} aria-selected={tab.id === t.id} className="chip" onClick={() => select('tab', t.id)}>
                {t.label} <span className="livePage__count">{tabCount(t)}</span>
              </button>
            ))}
          </div>
          <div className="livePage__status">
            {data && <span>Updated {timeAgo(data.updatedAt)} · {SOURCE_NAMES[data.source]}</span>}
            <button type="button" className="btn btn--ghost btn--sm" onClick={refresh} disabled={loading}>
              <IoRefresh className={loading ? 'isSpinning' : ''} /> Refresh
            </button>
          </div>
        </div>

        {data?.stale && (
          <p className="livePage__notice" role="status">
            Showing the last saved data because the live feed couldn&apos;t be reached right now.
          </p>
        )}

        {leagues.length > 1 && (
          <div className="chipRow" role="group" aria-label="Tournament">
            <button type="button" className="chip" aria-pressed={!league} onClick={() => select('league', '')}>
              All tournaments
            </button>
            {leagues.map((name) => (
              <button key={name} type="button" className="chip" aria-pressed={league === name} onClick={() => select('league', league === name ? '' : name)}>
                {name}
              </button>
            ))}
          </div>
        )}

        <section role="tabpanel" aria-labelledby={`tab-${tab.id}`} aria-live="polite">
          {loading && !data ? (
            <div className="livePage__grid" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="skeleton livePage__skeleton" />
              ))}
            </div>
          ) : error && !data ? (
            <ErrorState error={error} onRetry={refresh} title="Cricket data is unavailable" />
          ) : visible.length ? (
            <div className="livePage__grid">
              {visible.map((match) => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={tab.id === 'live' ? 'No match is confirmed live right now' : tab.id === 'upcoming' ? 'No upcoming fixtures found' : 'No recent results found'}
              message={
                tab.id === 'live'
                ? 'Scores appear here when the data feed confirms a match. Free in-page live video appears above only when an official channel provides a stream.'
                : 'The free score feed may not cover every tournament. Try refreshing later for updated fixtures and results.'
              }
              action={
                tab.id === 'live' && counts.upcoming > 0 ? (
                  <button type="button" className="btn btn--primary btn--sm" onClick={() => select('tab', 'upcoming')}>
                    See upcoming fixtures
                  </button>
                ) : null
              }
            />
          )}
        </section>

      </ContentWrapper>
    </div>
  )
}

export default Live
