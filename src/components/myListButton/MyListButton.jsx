import { memo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { IoAdd, IoCheckmark, IoBookmark, IoBookmarkOutline } from 'react-icons/io5'
import { toggleMyList } from '../../store/librarySlice'
import { selectIsInList } from '../../store/selectors'
import { normalizeTitle } from '../../services/normalize'
import './style.scss'

/**
 * Add / remove a title from My List.
 * variant "card" = small round overlay button, "button" = labelled button, "icon" = round icon button.
 */
const MyListButton = memo(function MyListButton({ item, variant = 'button', className = '' }) {
  const dispatch = useDispatch()
  const title = normalizeTitle(item)
  const inList = useSelector((state) => (title ? selectIsInList(state, title.mediaType, title.id) : false))
  if (!title) return null

  const onClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    dispatch(toggleMyList(title))
    toast.success(inList ? `Removed "${title.title}" from My List` : `Added "${title.title}" to My List`, { id: `mylist-${title.mediaType}-${title.id}` })
  }

  const label = inList ? `Remove ${title.title} from My List` : `Add ${title.title} to My List`

  if (variant === 'card') {
    return (
      <button type="button" className={`myListBtn myListBtn--card ${inList ? 'isActive' : ''} ${className}`} aria-label={label} aria-pressed={inList} onClick={onClick}>
        {inList ? <IoCheckmark /> : <IoAdd />}
      </button>
    )
  }

  if (variant === 'icon') {
    return (
      <button type="button" className={`btn btn--glass btn--icon myListBtn ${inList ? 'isActive' : ''} ${className}`} aria-label={label} aria-pressed={inList} onClick={onClick}>
        {inList ? <IoBookmark /> : <IoBookmarkOutline />}
      </button>
    )
  }

  return (
    <button type="button" className={`btn btn--glass myListBtn ${inList ? 'isActive' : ''} ${className}`} aria-pressed={inList} onClick={onClick}>
      {inList ? <IoCheckmark /> : <IoAdd />}
      <span>{inList ? 'In My List' : 'My List'}</span>
    </button>
  )
})

export default MyListButton
