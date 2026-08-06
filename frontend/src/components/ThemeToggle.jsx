import { useEffect, useState } from 'react'

/** Stub theme toggle — flips a `dark` class on <html>. Wire to prefs later. */
export default function ThemeToggle() {
  const [dark, setDark] = useState(() =>
    document.documentElement.classList.contains('dark'),
  )

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  return (
    <button
      type="button"
      onClick={() => setDark((v) => !v)}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-muted transition hover:border-accent hover:text-accent dark:border-border-dark"
      aria-label="Toggle theme"
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  )
}
