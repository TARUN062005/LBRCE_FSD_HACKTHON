import ProfileDropdown from './ProfileDropdown'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

export default function Topbar({ title, onMenuClick }) {
  return (
    <header className="theme-surface flex h-14 items-center justify-between border-b border-border bg-panel/90 px-3 backdrop-blur-xl xs:px-4 dark:border-border-dark dark:bg-panel-dark/90">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-ink md:hidden dark:border-border-dark"
          aria-label="Toggle sidebar"
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <h1 className="font-display text-base font-semibold tracking-tight xs:text-lg">{title}</h1>
      </div>

      <div className="flex items-center gap-2 xs:gap-3">
        <NotificationBell />
        <ThemeToggle />
        <ProfileDropdown />
      </div>
    </header>
  )
}
