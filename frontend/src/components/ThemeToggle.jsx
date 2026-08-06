import { useTheme } from '../context/ThemeContext'

export default function ThemeToggle() {
  const { dark, toggle } = useTheme()

  return (
    <button
      type="button"
      onClick={toggle}
      className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-muted transition hover:border-accent hover:text-accent dark:border-border-dark"
      aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
    >
      {dark ? 'Light' : 'Dark'}
    </button>
  )
}
