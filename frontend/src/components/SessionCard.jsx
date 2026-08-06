import PriorityBadge from './PriorityBadge'
import { SESSION_STATE_BADGE } from './ui/statusStyles'

const STATE_LABELS = {
  queued: 'Queued',
  connected: 'Connected',
  charging: 'Charging',
  optimized: 'Optimized',
  throttled: 'Throttled',
  completed: 'Completed',
}

export default function SessionCard({ session, onStop }) {
  const state = session.state
  const badgeClass = SESSION_STATE_BADGE[state] || SESSION_STATE_BADGE.queued

  return (
    <article className="session-card ui-card ui-card-hover p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink dark:text-white">
            {session.driverName || 'Driver'}
          </p>
          <p className="truncate text-xs text-ink-muted">{session.chargerLabel || 'Charger'}</p>
        </div>
        <PriorityBadge tier={session.priorityTier} />
      </div>

      <div className="mt-2.5">
        <span
          className={['inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold', badgeClass].join(
            ' ',
          )}
          aria-label={`Session state: ${STATE_LABELS[state] || state}`}
        >
          {STATE_LABELS[state] || state}
        </span>
      </div>

      <dl className="mt-3 space-y-1.5 text-xs text-ink-muted">
        <div className="flex justify-between gap-2">
          <dt>Power</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {session.allocatedPowerKw ?? 0} kW
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Delivered</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {session.kWhDelivered ?? 0} kWh
          </dd>
        </div>
      </dl>

      {onStop && session.state !== 'completed' && (
        <button
          type="button"
          onClick={() => onStop(session)}
          className="ui-btn ui-btn-danger mt-3 w-full !py-1.5 text-xs"
        >
          Stop
        </button>
      )}
    </article>
  )
}
