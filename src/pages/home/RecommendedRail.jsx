import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectMyList, selectPrefs, selectProgressMap } from '../../store/selectors'
import { titleKey } from '../../services/normalize'
import { loadRecommendations } from '../../services/rails'
import { TitleRail } from '../../components/titleRail/TitleRail'

/** "Recommended for You": based on My List and watch history, plus the preferred-language setting. */
const RecommendedRail = () => {
  const myList = useSelector(selectMyList)
  const progress = useSelector(selectProgressMap)
  const { language } = useSelector(selectPrefs)

  const { seeds, exclude, seedKey } = useMemo(() => {
    const watched = Object.values(progress).map((p) => ({ ...p.title, at: p.updatedAt || 0 }))
    const saved = myList.map((t) => ({ ...t, at: t.addedAt || 0 }))
    const all = [...watched, ...saved].sort((a, b) => b.at - a.at)
    const unique = []
    const seen = new Set()
    all.forEach((t) => {
      const key = titleKey(t)
      if (!seen.has(key)) {
        seen.add(key)
        unique.push(t)
      }
    })
    return { seeds: unique.slice(0, 4), exclude: seen, seedKey: unique.slice(0, 4).map(titleKey).join(',') }
  }, [myList, progress])

  if (!seeds.length && language === 'any') return null

  return (
    <TitleRail
      title="Recommended for You"
      load={(signal) => loadRecommendations({ seeds, language, exclude }, signal)}
      deps={[seedKey, language]}
      hideWhenEmpty
    />
  )
}

export default RecommendedRail
