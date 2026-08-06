import { useState } from 'react'

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'sla', label: 'SLA' },
]

function toLocalInputValue(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function defaultDeparture() {
  const d = new Date()
  d.setHours(d.getHours() + 4, 0, 0, 0)
  return toLocalInputValue(d.toISOString())
}

export default function VehicleForm({ initial, onSubmit, onCancel, submitting }) {
  const [driverName, setDriverName] = useState(initial?.driverName || '')
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(
    initial?.batteryCapacityKwh ?? 60,
  )
  const [priorityTier, setPriorityTier] = useState(initial?.priorityTier || 'medium')
  const [departureTime, setDepartureTime] = useState(
    toLocalInputValue(initial?.departureTime) || defaultDeparture(),
  )
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (!driverName.trim()) {
      setError('Driver name is required')
      return
    }
    if (!departureTime) {
      setError('Departure time is required')
      return
    }

    try {
      await onSubmit({
        driverName: driverName.trim(),
        batteryCapacityKwh: Number(batteryCapacityKwh),
        priorityTier,
        // Send ISO — backend scopes tenantId from JWT only
        departureTime: new Date(departureTime).toISOString(),
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save vehicle')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Driver name" id="vehicle-driver">
        <input
          id="vehicle-driver"
          value={driverName}
          onChange={(e) => setDriverName(e.target.value)}
          disabled={submitting}
          className={inputClass}
          placeholder="Alex Rivera"
          required
        />
      </Field>

      <Field label="Battery capacity (kWh)" id="vehicle-battery">
        <input
          id="vehicle-battery"
          type="number"
          min={1}
          step={1}
          value={batteryCapacityKwh}
          onChange={(e) => setBatteryCapacityKwh(Number(e.target.value))}
          disabled={submitting}
          className={inputClass}
          required
        />
      </Field>

      <Field label="Priority tier" id="vehicle-priority">
        <select
          id="vehicle-priority"
          value={priorityTier}
          onChange={(e) => setPriorityTier(e.target.value)}
          disabled={submitting}
          className={inputClass}
        >
          {PRIORITY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Target departure" id="vehicle-departure">
        <input
          id="vehicle-departure"
          type="datetime-local"
          value={departureTime}
          onChange={(e) => setDepartureTime(e.target.value)}
          disabled={submitting}
          className={inputClass}
          required
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="flex-1 rounded-md border border-border px-3 py-2 text-sm dark:border-border-dark"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save vehicle'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, id, children }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink dark:text-white">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass =
  'w-full rounded-md border border-border bg-panel px-3 py-2.5 text-sm text-ink outline-none ring-accent focus:ring-2 disabled:opacity-60 dark:border-border-dark dark:bg-surface-dark dark:text-white'
