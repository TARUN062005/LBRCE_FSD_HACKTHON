import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

export default function Topbar({ title, onMenuClick }) {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-panel px-3 xs:px-4 dark:border-border-dark dark:bg-panel-dark">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-ink md:hidden dark:border-border-dark"
          aria-label="Toggle sidebar"
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <h1 className="text-base font-semibold tracking-tight xs:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2 xs:gap-3">
        {user && (
          <span className="hidden max-w-[140px] truncate text-xs text-ink-muted sm:inline">
            {user.name}
          </span>
        )}
        <NotificationBell />
        <ThemeToggle />
        <button
          type="button"
          onClick={handleLogout}
          className="rounded-md border border-border px-3 py-1.5 text-sm text-ink-muted transition hover:border-red-400 hover:text-red-600 dark:border-border-dark"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
