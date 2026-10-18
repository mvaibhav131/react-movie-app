import ContentWrapper from '../contentWrapper/ContentWrapper'
import './style.scss'

/** Standard top section for listing pages: title, optional intro, then controls (filters, tabs...). */
const PageHeader = ({ title, intro, eyebrow, children, id }) => (
  <header className="pageHead">
    <ContentWrapper>
      {eyebrow && <p className="pageHead__eyebrow">{eyebrow}</p>}
      <h1 className="pageTitle" id={id}>
        {title}
      </h1>
      {intro && <p className="pageIntro">{intro}</p>}
      {children && <div className="pageHead__controls">{children}</div>}
    </ContentWrapper>
  </header>
)

export default PageHeader
