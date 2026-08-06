import { useEffect, useRef, useState } from 'react'
import useNotifications from '../hooks/useNotifications'
import NotificationList from './NotificationList'
import NotificationToast from './NotificationToast'

export default function NotificationBell() {
  const {
    notifications,
    unreadCount,
    loading,
    latest,
    clearLatest,
    markRead,
    markAllRead,
  } = useNotifications()

  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="ui-btn ui-btn-secondary relative !h-9 !w-9 !gap-0 !p-0"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={open}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          className="h-4 w-4 fill-none stroke-current"
          strokeWidth="1.8"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2c0 .5-.2 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2">
          <NotificationList
            notifications={notifications}
            loading={loading}
            onMarkRead={markRead}
            onMarkAllRead={markAllRead}
          />
        </div>
      )}

      <NotificationToast notification={latest} onDismiss={clearLatest} />
    </div>
  )
}
