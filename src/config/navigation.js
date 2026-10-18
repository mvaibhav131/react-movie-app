import {
  IoHomeOutline,
  IoHome,
  IoFilmOutline,
  IoFilm,
  IoTvOutline,
  IoTv,
  IoAlbumsOutline,
  IoAlbums,
  IoRadioOutline,
  IoRadio,
  IoMusicalNotesOutline,
  IoMusicalNotes,
  IoLanguageOutline,
  IoLanguage,
  IoCompassOutline,
  IoCompass,
  IoBookmarkOutline,
  IoBookmark,
  IoGiftOutline,
  IoGift,
} from 'react-icons/io5'

/**
 * Primary navigation. `bottom` items appear in the mobile bottom bar; everything is reachable from the drawer.
 */
export const NAV_ITEMS = [
  { id: 'home', label: 'Home', to: '/', end: true, bottom: true, icon: IoHomeOutline, iconActive: IoHome },
  { id: 'movies', label: 'Movies', to: '/movies', bottom: true, icon: IoFilmOutline, iconActive: IoFilm },
  { id: 'free', label: 'Free Movies', to: '/free', icon: IoGiftOutline, iconActive: IoGift },
  { id: 'tv', label: 'TV Shows', to: '/tv-shows', icon: IoTvOutline, iconActive: IoTv },
  { id: 'web', label: 'Web Series', to: '/web-series', icon: IoAlbumsOutline, iconActive: IoAlbums },
  { id: 'live', label: 'Live Cricket', short: 'Live', to: '/live', bottom: true, icon: IoRadioOutline, iconActive: IoRadio },
  { id: 'music', label: 'Music', to: '/music', bottom: true, icon: IoMusicalNotesOutline, iconActive: IoMusicalNotes },
  { id: 'marathi', label: 'Marathi', to: '/marathi', icon: IoLanguageOutline, iconActive: IoLanguage },
  { id: 'south', label: 'South Indian', to: '/south-indian', icon: IoCompassOutline, iconActive: IoCompass },
  { id: 'mylist', label: 'My List', to: '/my-list', bottom: true, icon: IoBookmarkOutline, iconActive: IoBookmark },
]

export const DESKTOP_NAV = NAV_ITEMS.filter((item) => item.id !== 'mylist')
export const BOTTOM_NAV = NAV_ITEMS.filter((item) => item.bottom)
