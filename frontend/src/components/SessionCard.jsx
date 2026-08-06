import PriorityBadge from './PriorityBadge'

const STATE_LABELS = {
  queued: 'Queued',
  connected: 'Connected',
  charging: 'Charging',
  optimized: 'Optimized',
  throttled: 'Throttled',
  completed: 'Completed',
}

export default function SessionCard({ session, onStop }) {
  return (
    <article className="session-card rounded-md border border-border bg-panel p-3 shadow-sm transition-all duration-500 ease-out dark:border-border-dark dark:bg-panel-dark">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink dark:text-white">
            {session.driverName || 'Driver'}
          </p>
          <p className="truncate text-xs text-ink-muted">{session.chargerLabel || 'Charger'}</p>
        </div>
        <PriorityBadge tier={session.priorityTier} />
      </div>

      <dl className="mt-2 space-y-1 text-xs text-ink-muted">
        <div className="flex justify-between gap-2">
          <dt>State</dt>
          <dd className="font-medium text-ink dark:text-white">
            {STATE_LABELS[session.state] || session.state}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Power</dt>
          <dd className="font-medium text-ink dark:text-white">
            {session.allocatedPowerKw ?? 0} kW
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Delivered</dt>
          <dd className="font-medium text-ink dark:text-white">
            {session.kWhDelivered ?? 0} kWh
          </dd>
        </div>
      </dl>

      {onStop && session.state !== 'completed' && (
        <button
          type="button"
          onClick={() => onStop(session)}
          className="mt-2 w-full rounded-md border border-border px-2 py-1.5 text-xs text-ink-muted hover:border-red-400 hover:text-red-600 dark:border-border-dark"
        >
          Stop
        </button>
      )}
    </article>
  )
}
