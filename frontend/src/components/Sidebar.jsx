import { NavLink } from 'react-router-dom'

const linkClass = ({ isActive }) =>
  [
    'block rounded-xl px-3 py-2.5 text-sm font-medium transition',
    isActive
      ? 'bg-accent text-white shadow-sm shadow-accent/30'
      : 'text-ink-muted hover:bg-black/5 hover:text-ink dark:hover:bg-white/5 dark:hover:text-white',
  ].join(' ')

export default function Sidebar({ links, open, onClose, brand = 'App' }) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-[2px] md:hidden"
          aria-label="Close sidebar"
          onClick={onClose}
        />
      )}

      <aside
        className={[
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-panel/95 backdrop-blur-xl transition-transform duration-200 dark:border-border-dark dark:bg-panel-dark/95',
          'md:static md:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        <div className="flex h-14 items-center border-b border-border px-4 dark:border-border-dark">
          <span className="font-display text-sm font-bold tracking-wide text-accent">{brand}</span>
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
