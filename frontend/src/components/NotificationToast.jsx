import { useEffect, useState } from 'react'

/** Transient toast for simulated push/SMS alerts from `notification:new`. */
export default function NotificationToast({ notification, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!notification) {
      setVisible(false)
      return undefined
    }
    setVisible(true)
    const hide = window.setTimeout(() => setVisible(false), 3800)
    const gone = window.setTimeout(() => onDismiss?.(), 4200)
    return () => {
      window.clearTimeout(hide)
      window.clearTimeout(gone)
    }
  }, [notification, onDismiss])

  if (!notification) return null

  const isThrottle = notification.type === 'throttled'

  return (
    <div
      role="status"
      className={[
        'pointer-events-auto fixed bottom-14 right-3 z-[70] w-[min(100%-1.5rem,22rem)] rounded-[0.875rem] border px-3 py-3 text-sm shadow-md transition-all duration-300 xs:bottom-16',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
        isThrottle
          ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100'
          : 'border-border bg-panel text-ink dark:border-border-dark dark:bg-panel-dark dark:text-white',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">New alert</p>
          <p className="mt-1 leading-snug">{notification.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs font-semibold opacity-60 hover:opacity-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
