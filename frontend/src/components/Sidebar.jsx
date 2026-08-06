import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  [
    'block rounded-md px-3 py-2 text-sm transition',
    isActive
      ? 'bg-accent text-white'
      : 'text-ink-muted hover:bg-surface hover:text-ink dark:hover:bg-surface-dark dark:hover:text-white',
  ].join(' ')

export default function Sidebar({ links, open, onClose, brand = 'App' }) {
  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 md:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-panel transition-transform duration-200 dark:border-border-dark dark:bg-panel-dark',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-14 items-center border-b border-border px-4 dark:border-border-dark">
          <span className="text-sm font-bold tracking-wide text-accent">{brand}</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
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
      </aside>
    </>
  )
}
