function timeAgo(iso) {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(ms / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationList({
  notifications,
  loading,
  onMarkRead,
  onMarkAllRead,
}) {
  return (
    <div className="flex max-h-80 w-80 flex-col overflow-hidden rounded-lg border border-border bg-panel shadow-xl dark:border-border-dark dark:bg-panel-dark">
      <div className="flex items-center justify-between border-b border-border px-3 py-2 dark:border-border-dark">
        <p className="text-sm font-semibold text-ink dark:text-white">Notifications</p>
        <button
          type="button"
          onClick={onMarkAllRead}
          className="text-xs text-accent hover:underline"
        >
          Mark all read
        </button>
      </div>

      <ul className="flex-1 overflow-y-auto">
        {loading && (
          <li className="px-3 py-4 text-center text-xs text-ink-muted">Loading…</li>
        )}
        {!loading && notifications.length === 0 && (
          <li className="px-3 py-6 text-center text-xs text-ink-muted">
            No alerts yet. Throttle / complete events appear here.
          </li>
        )}
        {notifications.map((n) => (
          <li key={n.id}>
            <button
              type="button"
              onClick={() => !n.read && onMarkRead(n.id)}
              className={[
                'w-full border-b border-border px-3 py-2.5 text-left text-sm last:border-0 dark:border-border-dark',
                n.read
                  ? 'bg-transparent text-ink-muted'
                  : 'bg-accent/5 text-ink dark:bg-accent/10 dark:text-white',
              ].join(' ')}
            >
              <p className="leading-snug">{n.message}</p>
              <p className="mt-1 text-xs opacity-60">
                {n.type} · {timeAgo(n.createdAt)}
                {!n.read ? ' · unread' : ''}
              </p>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
