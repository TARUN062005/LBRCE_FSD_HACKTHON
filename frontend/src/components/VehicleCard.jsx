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
    <article className="flex flex-col rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-ink dark:text-white">{vehicle.driverName}</h3>
          <p className="mt-0.5 text-sm text-ink-muted">
            {vehicle.batteryCapacityKwh} kWh battery
          </p>
        </div>
        <PriorityBadge tier={vehicle.priorityTier} />
      </div>

      <dl className="mt-4 space-y-2 text-sm">
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
        <button
          type="button"
          onClick={() => onEdit(vehicle)}
          className="mt-4 rounded-md border border-border px-3 py-2 text-sm text-ink-muted transition hover:border-accent hover:text-accent dark:border-border-dark"
        >
          Edit
        </button>
      )}
    </article>
  )
}
