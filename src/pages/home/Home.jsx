import { SOUTH_INDIAN } from '../../config/languages'
import { loadCatalogRail, loadFreeRail, rails } from '../../services/rails'
import { TabbedRail, TitleRail } from '../../components/titleRail/TitleRail'
import LazySection from '../../components/lazySection/LazySection'
import HeroBanner from './heroBanner/HeroBanner'
import QuickLinks from './QuickLinks'
import ContinueWatching from './ContinueWatching'
import RecommendedRail from './RecommendedRail'
import LiveStrip from './LiveStrip'
import MusicStrip from './MusicStrip'
import './style.scss'

const southTabs = SOUTH_INDIAN.map(({ code, label, slug }) => ({
  label,
  load: rails.byLanguage(code),
  seeAllTo: `/south-indian/${slug}`,
}))

const Home = () => (
  <div className="homePage">
    <HeroBanner />
    <QuickLinks />
    <ContinueWatching />

    <LazySection minHeight={120}>
      <TitleRail title="Free to Watch" load={loadFreeRail('hi')} seeAllTo="/free" endpoint="movie" hideWhenEmpty />
    </LazySection>
    <LazySection>
      <TitleRail title="Latest Bollywood Movies" load={rails.bollywood} seeAllTo="/movies" endpoint="movie" />
    </LazySection>
    <LazySection minHeight={120}>
      <RecommendedRail />
    </LazySection>
    <LazySection minHeight={120}>
      <TitleRail title="New on VM Flix" load={loadCatalogRail} hideWhenEmpty />
    </LazySection>
    <LazySection>
      <TitleRail title="Latest Hindi Web Series" load={rails.latestHindiWebSeries} seeAllTo="/web-series" endpoint="tv" />
    </LazySection>
    <LazySection>
      <TitleRail title="Latest Hindi TV Shows" load={rails.latestHindiTv} seeAllTo="/tv-shows" endpoint="tv" />
    </LazySection>
    <LazySection>
      <TitleRail title="Latest Released Movies" load={rails.latestReleased} seeAllTo="/movies?lang=all" endpoint="movie" />
    </LazySection>
    <LazySection>
      <TitleRail title="Latest Hollywood Movies" load={rails.hollywood} seeAllTo="/movies?lang=en" endpoint="movie" />
    </LazySection>
    <LazySection>
      <TitleRail title="Marathi Movies" load={rails.byLanguage('mr')} seeAllTo="/marathi" endpoint="movie" />
    </LazySection>
    <LazySection>
      <TabbedRail title="South Indian Movies" tabs={southTabs} endpoint="movie" />
    </LazySection>
    <LazySection minHeight={220}>
      <LiveStrip />
    </LazySection>
    <LazySection minHeight={220}>
      <MusicStrip />
    </LazySection>
    <LazySection>
      <TitleRail title="Top Rated Movies" load={rails.topRatedMovies} endpoint="movie" />
    </LazySection>
    <LazySection>
      <TitleRail title="Coming Soon" load={rails.comingSoon} endpoint="movie" />
    </LazySection>
  </div>
)

export default Home
