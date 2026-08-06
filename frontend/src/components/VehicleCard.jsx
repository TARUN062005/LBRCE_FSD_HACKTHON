import PriorityBadge from './PriorityBadge'

function formatDeparture(iso) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

export default function VehicleCard({ vehicle, onEdit }) {
  return (
    <article className="ui-card ui-card-hover flex h-full flex-col p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-semibold text-ink dark:text-white">{vehicle.driverName}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">{vehicle.batteryCapacityKwh} kWh battery</p>
        </div>
        <PriorityBadge tier={vehicle.priorityTier} />
      </div>

      <dl className="mt-4 flex-1 space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Departure</dt>
          <dd className="text-right font-medium text-ink dark:text-white">
            {formatDeparture(vehicle.departureTime)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Priority</dt>
          <dd className="capitalize text-ink dark:text-white">{vehicle.priorityTier}</dd>
        </div>
      </dl>

      {onEdit && (
        <button type="button" onClick={() => onEdit(vehicle)} className="ui-btn ui-btn-secondary mt-4 w-full">
          Edit
        </button>
      )}
    </article>
  )
}
