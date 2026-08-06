import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  [
    'block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
    isActive
      ? 'bg-accent text-white'
      : 'text-ink-muted hover:bg-black/[0.04] hover:text-ink dark:hover:bg-white/[0.06] dark:hover:text-white',
  ].join(' ')

export default function Sidebar({ links, open, onClose, brand = 'App' }) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-ink/35 backdrop-blur-[1px] md:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-[15.5rem] flex-col border-r border-border bg-panel transition-transform duration-200 dark:border-border-dark dark:bg-panel-dark',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-14 items-center gap-2 border-b border-border px-4 dark:border-border-dark">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/10 font-display text-xs font-bold text-accent"
            aria-hidden
          >
            G
          </span>
          <span className="font-display text-sm font-bold tracking-tight text-ink dark:text-white">
            {brand}
          </span>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-3" aria-label="Primary">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={linkClass}
              onClick={onClose}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border p-3 dark:border-border-dark">
          <p className="px-1 text-[11px] leading-relaxed text-ink-muted">
            Grid-aware fleet charging
          </p>
        </div>
      </aside>
    </>
  )
}
