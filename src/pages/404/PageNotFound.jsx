import { Link } from 'react-router-dom'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import './style.scss'

const PageNotFound = () => {
  useDocumentTitle('Page not found')
  return (
    <div className="pageNotFound">
      <ContentWrapper>
        <p className="pageNotFound__code" aria-hidden="true">
          404
        </p>
        <h1>This page isn&apos;t available</h1>
        <p>The link may be broken or the page may have moved.</p>
        <div className="pageNotFound__actions">
          <Link to="/" className="btn btn--primary">
            Back to home
          </Link>
          <Link to="/movies" className="btn btn--outline">
            Browse movies
          </Link>
        </div>
      </ContentWrapper>
    </div>
  )
}

export default PageNotFound
