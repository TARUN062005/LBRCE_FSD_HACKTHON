import { useState } from 'react'
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

const PRIORITIES = ['emergency', 'high', 'medium', 'low', 'background']

export default function SessionCard({ session, onStop, onAdjust }) {
  const state = session.state
  const badgeClass = SESSION_STATE_BADGE[state] || SESSION_STATE_BADGE.queued
  const [priority, setPriority] = useState(session.priorityTier || 'high')
  const [maxKw, setMaxKw] = useState(session.maxChargingPowerKw ?? 22)
  const [busy, setBusy] = useState(false)
  const voltage = session.servingVoltage || session.voltage || 400
  const chargerV = session.chargerVoltage
  const vehicleMax = session.maxChargingPowerKw
  const chargerMax = session.chargerMaxPowerKw

  async function saveAdjust() {
    if (!onAdjust) return
    setBusy(true)
    try {
      await onAdjust(session, {
        priorityTier: priority,
        maxChargingPowerKw: Number(maxKw),
      })
    } finally {
      setBusy(false)
    }
  }

  return (
    <article className="session-card ui-card ui-card-hover p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink dark:text-white">
            {session.driverName || 'Driver'}
          </p>
          <p className="truncate text-xs text-ink-muted">
            {session.chargerLabel || 'Charger'}
            {session.vehicleType ? ` · ${session.vehicleType}` : ''}
          </p>
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
          <dt>Battery</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {Math.round(session.currentCharge ?? 0)}% → {Math.round(session.targetCharge ?? 0)}%
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Required</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {session.requestedKw ?? session.maxChargingPowerKw ?? '—'} kW
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Allocated</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {session.allocatedPowerKw ?? 0} kW
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Voltage</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {voltage} V
            {chargerV && chargerV !== voltage ? (
              <span className="ml-1 font-normal text-ink-muted">(rail {chargerV} V)</span>
            ) : null}
          </dd>
        </div>
        {chargerMax != null && vehicleMax != null && chargerMax > vehicleMax ? (
          <div className="flex justify-between gap-2">
            <dt>Bill basis</dt>
            <dd className="font-medium text-ink dark:text-white">
              Vehicle need · not {chargerMax} kW charger
            </dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <dt>Delivered</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {session.kWhDelivered ?? 0} kWh
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Reason</dt>
          <dd className="max-w-[60%] text-right font-medium text-ink dark:text-white">
            {session.allocationReason || session.reason || '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>ETA</dt>
          <dd className="font-medium tabular-nums text-ink dark:text-white">
            {session.estimatedChargeMinutes
              ? `~${session.estimatedChargeMinutes} min`
              : session.timeRemaining || '—'}
          </dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Left</dt>
          <dd className="font-medium text-ink dark:text-white">
            {session.timeRemaining || '—'}
          </dd>
        </div>
      </dl>

      {onAdjust && session.state !== 'completed' && (
        <div className="mt-3 space-y-2 border-t border-border pt-2 dark:border-border-dark">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">
            Adjust after approve
          </p>
          <div className="flex gap-2">
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="ui-input !py-1 text-xs"
              aria-label="Priority"
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={maxKw}
              onChange={(e) => setMaxKw(e.target.value)}
              className="ui-input !py-1 text-xs"
              aria-label="Max kW for vehicle"
              title="Vehicle max kW (capped by charger)"
            />
          </div>
          <button
            type="button"
            disabled={busy}
            onClick={saveAdjust}
            className="ui-btn ui-btn-secondary w-full !py-1.5 text-xs"
          >
            {busy ? 'Saving…' : 'Apply · re-sort grid'}
          </button>
        </div>
      )}

      {onStop && session.state !== 'completed' && (
        <button
          type="button"
          onClick={() => onStop(session)}
          className="ui-btn ui-btn-danger mt-2 w-full !py-1.5 text-xs"
        >
          Stop · invoice actual energy
        </button>
      )}
    </article>
  )
}
