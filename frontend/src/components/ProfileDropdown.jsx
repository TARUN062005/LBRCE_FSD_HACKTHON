import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { useAuth } from '../context/AuthContext'

export default function ProfileDropdown() {
  const { user, logout, homePath } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    function onDoc(e) {
      if (!rootRef.current?.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  if (!user) return null

  const initials = (user.name || user.email || '?')
    .split(/\s+/)
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  async function handleLogout() {
    setOpen(false)
    await logout()
    navigate('/', { replace: true })
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-border/80 bg-panel/80 p-0.5 pr-2.5 backdrop-blur transition hover:border-accent dark:border-border-dark dark:bg-panel-dark/80"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {user.picture ? (
          <img
            src={user.picture}
            alt=""
            className="h-8 w-8 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
            {initials}
          </span>
        )}
        <span className="hidden max-w-[120px] truncate text-xs font-medium sm:inline">
          {user.name}
        </span>
        <span className="text-[10px] text-ink-muted">▾</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            role="menu"
            className="absolute right-0 z-40 mt-2 w-64 overflow-hidden rounded-xl border border-white/20 bg-panel/90 shadow-xl backdrop-blur-xl dark:border-white/10 dark:bg-panel-dark/90"
          >
            <div className="border-b border-border/70 px-4 py-3 dark:border-border-dark">
              <p className="truncate text-sm font-semibold text-ink dark:text-white">{user.name}</p>
              <p className="truncate text-xs text-ink-muted">{user.email}</p>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-accent">{user.role}</p>
            </div>
            <div className="p-1.5">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  navigate(homePath)
                }}
                className="w-full rounded-lg px-3 py-2 text-left text-sm transition hover:bg-surface dark:hover:bg-surface-dark"
              >
                Dashboard
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 transition hover:bg-red-50 dark:hover:bg-red-950/40"
              >
                Logout
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
