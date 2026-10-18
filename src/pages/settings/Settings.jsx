import { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import toast from 'react-hot-toast'
import { clearAllProgress, clearRecentTracks, clearSearchHistory, setPref } from '../../store/librarySlice'
import { selectPrefs } from '../../store/selectors'
import { useTheme } from '../../context/ThemeContext'
import { LANGUAGE_NAMES } from '../../config/languages'
import useDocumentTitle from '../../hooks/useDocumentTitle'
import ContentWrapper from '../../components/contentWrapper/ContentWrapper'
import PageHeader from '../../components/pageHeader/PageHeader'
import './style.scss'

const CONTENT_LANGUAGES = ['hi', 'en', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'pa', 'gu']
const SUBTITLE_LANGUAGES = ['en', 'hi', 'mr', 'ta', 'te', 'kn', 'ml', 'bn', 'pa', 'es', 'fr', 'de']
const QUALITIES = [
  { value: 'auto', label: 'Auto (recommended)' },
  { value: '1080', label: 'Up to 1080p' },
  { value: '720', label: 'Up to 720p' },
  { value: '480', label: 'Up to 480p' },
  { value: '360', label: 'Up to 360p' },
]

const Row = ({ label, hint, children, htmlFor }) => (
  <div className="settings__row">
    <div>
      <label htmlFor={htmlFor} className="settings__label">
        {label}
      </label>
      {hint && <p className="settings__hint">{hint}</p>}
    </div>
    {children}
  </div>
)

const Switch = ({ id, checked, onChange, label }) => (
  <button id={id} type="button" role="switch" aria-checked={checked} aria-label={label} className={`settings__switch ${checked ? 'isOn' : ''}`} onClick={() => onChange(!checked)}>
    <span />
  </button>
)

/** Two-step button: the first press arms it, the second performs the destructive action. */
const ConfirmButton = ({ label, onConfirm }) => {
  const [armed, setArmed] = useState(false)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <button
      type="button"
      className={`btn btn--sm ${armed ? 'btn--primary' : 'btn--outline'}`}
      onClick={() => {
        if (armed) {
          clearTimeout(timer.current)
          setArmed(false)
          onConfirm()
          return
        }
        setArmed(true)
        timer.current = setTimeout(() => setArmed(false), 4000)
      }}
    >
      {armed ? 'Press again to confirm' : label}
    </button>
  )
}

const Settings = () => {
  useDocumentTitle('Settings')
  const dispatch = useDispatch()
  const prefs = useSelector(selectPrefs)
  const { theme, toggleTheme } = useTheme()
  const set = (key) => (value) => dispatch(setPref({ key, value }))

  return (
    <div className="pageBody">
      <PageHeader title="Settings" intro="Saved on this device and applied across VM Flix." />
      <ContentWrapper>
        <div className="settings">
        <section aria-labelledby="set-playback">
          <h2 id="set-playback">Playback</h2>
          <Row label="Default quality" hint="Applies when a title offers several qualities. Auto adapts to your connection." htmlFor="pref-quality">
            <select id="pref-quality" value={prefs.quality} onChange={(e) => set('quality')(e.target.value)}>
              {QUALITIES.map((q) => (
                <option key={q.value} value={q.value}>
                  {q.label}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Subtitle language" hint="Turned on automatically when a title has subtitles in this language." htmlFor="pref-subs">
            <select id="pref-subs" value={prefs.subtitleLang} onChange={(e) => set('subtitleLang')(e.target.value)}>
              <option value="off">Off</option>
              {SUBTITLE_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_NAMES[code]}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Autoplay next episode" hint="Start the next episode after a short countdown." htmlFor="pref-autoplay">
            <Switch id="pref-autoplay" checked={prefs.autoplayNext} onChange={set('autoplayNext')} label="Autoplay next episode" />
          </Row>
        </section>

        <section aria-labelledby="set-content">
          <h2 id="set-content">Content</h2>
          <Row label="Preferred language" hint="Used to personalise “Recommended for You”." htmlFor="pref-language">
            <select id="pref-language" value={prefs.language} onChange={(e) => set('language')(e.target.value)}>
              <option value="any">No preference</option>
              {CONTENT_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {LANGUAGE_NAMES[code]}
                </option>
              ))}
            </select>
          </Row>
        </section>

        <section aria-labelledby="set-look">
          <h2 id="set-look">Appearance</h2>
          <Row label="Light theme" hint="VM Flix defaults to the dark cinematic theme." htmlFor="pref-theme">
            <Switch id="pref-theme" checked={theme === 'light'} onChange={toggleTheme} label="Light theme" />
          </Row>
        </section>

        <section aria-labelledby="set-data">
          <h2 id="set-data">Your data</h2>
          <Row label="Continue Watching" hint="Removes saved playback positions.">
            <ConfirmButton
              label="Clear history"
              onConfirm={() => {
                dispatch(clearAllProgress())
                toast.success('Watch history cleared')
              }}
            />
          </Row>
          <Row label="Search history">
            <ConfirmButton
              label="Clear searches"
              onConfirm={() => {
                dispatch(clearSearchHistory())
                toast.success('Search history cleared')
              }}
            />
          </Row>
          <Row label="Recently played music">
            <ConfirmButton
              label="Clear recent"
              onConfirm={() => {
                dispatch(clearRecentTracks())
                toast.success('Recently played cleared')
              }}
            />
          </Row>
        </section>
        </div>
      </ContentWrapper>
    </div>
  )
}

export default Settings
