import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { fetchData } from '../../utils/api'
import { normalizeList } from '../../services/normalize'
import useAsync from '../../hooks/useAsync'
import useAvailability from '../../hooks/useAvailability'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import Carousel from '../../components/carousel/Carousel'
import VideoPopup from '../../components/videoPopup/VideoPopup'
import { ErrorState } from '../../components/states/States'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageNotFound from '../404/PageNotFound'
import DetailsHero from './DetailsHero'
import Episodes from './Episodes'
import { CastRail, VideosRail } from './People'
import './style.scss'

const APPEND = {
  movie: 'credits,videos,similar,recommendations,release_dates',
  tv: 'credits,videos,similar,recommendations,content_ratings',
}

const Details = () => {
  const { mediaType, id } = useParams()
  const valid = (mediaType === 'movie' || mediaType === 'tv') && /^\d+$/.test(id)
  const { data, loading, error, reload } = useAsync(
    (signal) => fetchData(`/${mediaType}/${id}`, { append_to_response: APPEND[mediaType] }, { signal }),
    [mediaType, id],
    { enabled: valid }
  )
  const { data: availability, loading: availabilityLoading } = useAvailability(data, mediaType)
  const [video, setVideo] = useState(null)
  useDocumentTitle(data ? data.title || data.name : '')

  if (!valid || error?.code === 'NOT_FOUND') return <PageNotFound />

  if (loading) {
    return (
      <div className="detailsSkeleton" aria-busy="true">
        <div className="skeleton detailsSkeleton__media" />
        <ContentWrapper>
          <div className="skeleton detailsSkeleton__line detailsSkeleton__line--title" />
          <div className="skeleton detailsSkeleton__line" />
          <div className="skeleton detailsSkeleton__line detailsSkeleton__line--short" />
        </ContentWrapper>
      </div>
    )
  }

  if (error) {
    return (
      <ContentWrapper>
        <ErrorState error={error} onRetry={reload} title="Couldn't load this title" />
      </ContentWrapper>
    )
  }

  const trailer = availability?.trailer
  const similar = normalizeList(data.similar?.results, mediaType)
  const recommended = normalizeList(data.recommendations?.results, mediaType)

  return (
    <div className="detailsPage">
      <DetailsHero
        data={data}
        mediaType={mediaType}
        availability={availability}
        availabilityLoading={availabilityLoading}
        onTrailer={() => trailer && setVideo(trailer)}
      />
      {mediaType === 'tv' && <Episodes tvId={data.id} seasons={data.seasons} playableEpisodes={availability?.playableEpisodes} status={availability?.status} />}
      <CastRail cast={data.credits?.cast} />
      <VideosRail videos={data.videos} onOpen={setVideo} />
      <Carousel title={mediaType === 'tv' ? 'More like this' : 'Similar movies'} data={recommended.length ? recommended : similar} endpoint={mediaType} hideWhenEmpty />
      {recommended.length > 0 && similar.length > 0 && (
        <Carousel title={mediaType === 'tv' ? 'Similar shows' : 'You might also like'} data={similar} endpoint={mediaType} hideWhenEmpty />
      )}
      <VideoPopup open={!!video} onClose={() => setVideo(null)} videoId={video?.key} title={video?.name} />
    </div>
  )
}

export default Details
