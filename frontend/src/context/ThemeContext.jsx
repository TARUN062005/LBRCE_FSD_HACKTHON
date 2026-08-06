import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const STORAGE_KEY = 'theme'
const ThemeContext = createContext(null)

function getInitialDark() {
  const stored = localStorage.getItem(STORAGE_KEY)
  if (stored === 'dark') return true
  if (stored === 'light') return false
  return window.matchMedia?.('(prefers-color-scheme: dark)')?.matches ?? false
}

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(getInitialDark)

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem(STORAGE_KEY, dark ? 'dark' : 'light')
  }, [dark])

  const toggle = useCallback(() => setDark((v) => !v), [])
  const setTheme = useCallback((mode) => setDark(mode === 'dark'), [])

  const value = useMemo(
    () => ({
      dark,
      theme: dark ? 'dark' : 'light',
      toggle,
      setTheme,
    }),
    [dark, toggle, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
