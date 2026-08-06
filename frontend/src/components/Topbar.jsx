import ProfileDropdown from './ProfileDropdown'
import NotificationBell from './NotificationBell'
import ThemeToggle from './ThemeToggle'

export default function Topbar({ title, onMenuClick }) {
  return (
    <header className="theme-surface sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-panel/95 px-3 backdrop-blur-md xs:px-4 dark:border-border-dark dark:bg-panel-dark/95">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          onClick={onMenuClick}
          className="ui-btn ui-btn-secondary inline-flex h-9 w-9 !p-0 md:hidden"
          aria-label="Toggle sidebar"
        >
          <span className="text-base leading-none" aria-hidden>
            ☰
          </span>
        </button>
        <h1 className="truncate font-display text-base font-semibold tracking-tight text-ink xs:text-[1.05rem] dark:text-white">
          {title}
        </h1>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 xs:gap-2">
        <NotificationBell />
        <ThemeToggle />
        <ProfileDropdown />
      </div>
    </header>
  )
}
