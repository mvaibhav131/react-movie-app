import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import Img from '../../components/lazyLoadImage/Img'
import { tmdbImage } from '../../utils/api'

const avatar = (person) => tmdbImage(person.profile_path, 'w185')

/** Horizontally scrolling cast list. */
export const CastRail = ({ cast }) => {
  const people = (cast || []).slice(0, 20)
  if (!people.length) return null
  return (
    <section className="people" aria-labelledby="cast-title">
      <ContentWrapper>
        <h2 id="cast-title" className="sectionTitle">
          Top cast
        </h2>
      </ContentWrapper>
      <ul className="people__track">
        {people.map((person) => (
          <li key={`${person.id}-${person.credit_id}`} className="person">
            <div className="person__photo">
              <Img src={avatar(person)} ratio="1 / 1" fallback="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%238a93a8' d='M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-3.3 0-8 1.7-8 5v1h16v-1c0-3.3-4.7-5-8-5z'/%3E%3C/svg%3E" />
            </div>
            <p className="person__name">{person.name}</p>
            <p className="person__role">{person.character}</p>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** Trailers, teasers and clips from TMDB (YouTube only). */
export const VideosRail = ({ videos, onOpen }) => {
  const items = (videos?.results || []).filter((v) => v.site === 'YouTube' && v.key).slice(0, 12)
  if (!items.length) return null
  return (
    <section className="people" aria-labelledby="videos-title">
      <ContentWrapper>
        <h2 id="videos-title" className="sectionTitle">
          Trailers &amp; clips
        </h2>
      </ContentWrapper>
      <ul className="people__track people__track--videos">
        {items.map((video) => (
          <li key={video.id} className="videoCard">
            <button type="button" onClick={() => onOpen(video)} aria-label={`Play ${video.name}`}>
              <span className="videoCard__thumb">
                <Img src={`https://i.ytimg.com/vi/${encodeURIComponent(video.key)}/mqdefault.jpg`} ratio="16 / 9" />
                <span className="videoCard__play" aria-hidden="true">
                  ▶
                </span>
              </span>
              <span className="videoCard__title">{video.name}</span>
              <span className="videoCard__type">{video.type}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
