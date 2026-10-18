import { Link, useParams } from 'react-router-dom'
import { SOUTH_INDIAN } from '../../config/languages'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import PageHeader from '../../components/pageHeader/PageHeader'
import LanguageHub from '../../components/languageHub/LanguageHub'
import PageNotFound from '../404/PageNotFound'

const SouthIndian = () => {
  const { lang } = useParams()
  const active = SOUTH_INDIAN.find((l) => l.slug === (lang || 'tamil'))
  useDocumentTitle(active ? `${active.label} Movies` : 'South Indian Movies')
  if (!active) return <PageNotFound />

  return (
    <div className="pageBody">
      <PageHeader
        eyebrow="South Indian cinema"
        title="South Indian Movies"
        intro="Tamil, Telugu, Kannada and Malayalam films, grouped by each film's original language. VM Flix doesn't label titles as “dubbed”, because dubbing data isn't published reliably."
      >
        <nav className="chipRow" aria-label="South Indian languages">
          {SOUTH_INDIAN.map(({ label, slug }) => (
            <Link key={slug} to={`/south-indian/${slug}`} className={`chip ${slug === active.slug ? 'isActive' : ''}`} aria-current={slug === active.slug ? 'page' : undefined}>
              {label}
            </Link>
          ))}
        </nav>
      </PageHeader>
      <LanguageHub key={active.code} language={active.code} label={active.label} />
    </div>
  )
}

export default SouthIndian
