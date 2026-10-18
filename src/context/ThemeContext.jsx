import { createContext, useContext, useEffect, useMemo, useState } from 'react'

const ThemeContext = createContext({ theme: 'dark', toggleTheme: () => {} })

const readTheme = () => {
  try {
    return localStorage.getItem('movieapp_theme') === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f5f6fa' : '#0b0f19')
    try {
      localStorage.setItem('movieapp_theme', theme)
    } catch {
      /* storage unavailable */
    }
  }, [theme])

  const value = useMemo(() => ({ theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')) }), [theme])
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => useContext(ThemeContext)
