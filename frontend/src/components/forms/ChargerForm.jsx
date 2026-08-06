import { useState } from 'react'

const STATUSES = ['available', 'in_use', 'offline']

export default function ChargerForm({ sites, initial, onSubmit, onCancel, submitting }) {
  const [siteId, setSiteId] = useState(initial?.siteId || sites[0]?.id || '')
  const [label, setLabel] = useState(initial?.label || '')
  const [maxPowerKw, setMaxPowerKw] = useState(initial?.maxPowerKw ?? 22)
  const [status, setStatus] = useState(initial?.status || 'available')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!siteId || !label.trim()) {
      setError('Site and label are required')
      return
    }
    try {
      await onSubmit({
        siteId,
        label: label.trim(),
        maxPowerKw: Number(maxPowerKw),
        status,
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save charger')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Site" id="charger-site">
        <select
          id="charger-site"
          value={siteId}
          onChange={(e) => setSiteId(e.target.value)}
          disabled={submitting || !sites.length}
          className={inputClass}
          required
        >
          {!sites.length && <option value="">No sites available</option>}
          {sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Label" id="charger-label">
        <input
          id="charger-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          disabled={submitting}
          className={inputClass}
          placeholder="Charger A1"
          required
        />
      </Field>
      <Field label="Max power (kW)" id="charger-power">
        <input
          id="charger-power"
          type="number"
          min={0.1}
          step={0.1}
          value={maxPowerKw}
          onChange={(e) => setMaxPowerKw(Number(e.target.value))}
          disabled={submitting}
          className={inputClass}
          required
        />
      </Field>
      <Field label="Status" id="charger-status">
        <select
          id="charger-status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          disabled={submitting}
          className={inputClass}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace('_', ' ')}
            </option>
          ))}
        </select>
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
          disabled={submitting || !sites.length}
          className="flex-1 rounded-md bg-accent px-3 py-2 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {submitting ? 'Saving…' : 'Save charger'}
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
