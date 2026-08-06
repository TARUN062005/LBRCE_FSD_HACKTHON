import { useEffect } from 'react'

/** Transient toast for simulated push/SMS alerts from `notification:new`. */
export default function NotificationToast({ notification, onDismiss }) {
  useEffect(() => {
    if (!notification) return undefined
    const t = window.setTimeout(() => onDismiss?.(), 4500)
    return () => window.clearTimeout(t)
  }, [notification, onDismiss])

  if (!notification) return null

  const isThrottle = notification.type === 'throttled'

  return (
    <div
      role="status"
      className={[
        'pointer-events-auto fixed bottom-14 right-3 z-[70] w-[min(100%-1.5rem,22rem)] rounded-lg border px-3 py-3 text-sm shadow-lg xs:bottom-16',
        isThrottle
          ? 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-800 dark:bg-amber-950/80 dark:text-amber-100'
          : 'border-accent/40 bg-panel text-ink dark:border-accent/50 dark:bg-panel-dark dark:text-white',
      ].join(' ')}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
            Simulated push / SMS
          </p>
          <p className="mt-1 leading-snug">{notification.message}</p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 text-xs opacity-60 hover:opacity-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
