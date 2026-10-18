import useDocumentTitle from '../../hooks/useDocumentTitle'
import PageHeader from '../../components/pageHeader/PageHeader'
import LanguageHub from '../../components/languageHub/LanguageHub'

const Marathi = () => {
  useDocumentTitle('Marathi Movies')
  return (
    <div className="pageBody">
      <PageHeader
        eyebrow="Marathi cinema"
        title="Marathi Movies"
        intro="Latest releases, popular films and classics, filtered strictly by original language so nothing from other industries is mixed in."
      />
      <LanguageHub language="mr" label="Marathi" />
    </div>
  )
}

export default Marathi
