import { Link } from 'react-router-dom'
import { IoRadioOutline } from 'react-icons/io5'
import { loadCricketBoard } from '../../services/cricket/cricketService'
import useAsync from '../../hooks/useAsync'
import Carousel from '../../components/carousel/Carousel'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import MatchCard from '../../components/matchCard/MatchCard'

const MAX_CARDS = 8

/** Home rail: live matches first, then the next fixtures, then recent results. */
const LiveStrip = () => {
  const { data, loading, error } = useAsync((signal) => loadCricketBoard({ signal }), [])
  const matches = (data?.matches || []).filter((m) => m.status !== 'postponed').slice(0, MAX_CARDS)

  if (!loading && (error || !matches.length)) {
    return (
      <section className="carousel" aria-labelledby="live-strip-title">
        <ContentWrapper>
          <header className="carousel__head">
            <h2 id="live-strip-title" className="carousel__title">
              Live Cricket &amp; Sports
            </h2>
          </header>
          <Link to="/live" className="liveStrip__cta">
            <IoRadioOutline aria-hidden="true" />
            <span>
              <strong>Open the Live Cricket hub</strong>
              <small>Fixtures, scores and official places to watch.</small>
            </span>
          </Link>
        </ContentWrapper>
      </section>
    )
  }

  return (
    <Carousel
      title="Live Cricket & Sports"
      variant="landscape"
      data={matches}
      loading={loading}
      seeAllTo="/live"
      renderItem={(match) => <MatchCard match={match} compact />}
    />
  )
}

export default LiveStrip
