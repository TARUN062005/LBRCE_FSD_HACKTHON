import { useState } from 'react'

export default function SiteForm({ initial, onSubmit, onCancel, submitting }) {
  const [name, setName] = useState(initial?.name || '')
  const [location, setLocation] = useState(initial?.location || '')
  const [maxCapacityKw, setMaxCapacityKw] = useState(initial?.maxCapacityKw ?? 100)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!name.trim() || !location.trim()) {
      setError('Name and location are required')
      return
    }
    try {
      await onSubmit({
        name: name.trim(),
        location: location.trim(),
        maxCapacityKw: Number(maxCapacityKw),
      })
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save site')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Site name" id="site-name">
        <input
          id="site-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          className={inputClass}
          placeholder="Downtown Hub"
          required
        />
      </Field>
      <Field label="Location" id="site-location">
        <input
          id="site-location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          disabled={submitting}
          className={inputClass}
          placeholder="City, address"
          required
        />
      </Field>
      <Field label={`Grid limit (kW): ${maxCapacityKw}`} id="site-capacity">
        <input
          id="site-capacity"
          type="range"
          min={0}
          max={2000}
          step={10}
          value={maxCapacityKw}
          onChange={(e) => setMaxCapacityKw(Number(e.target.value))}
          disabled={submitting}
          className="w-full accent-accent"
        />
        <input
          type="number"
          min={0}
          step={1}
          value={maxCapacityKw}
          onChange={(e) => setMaxCapacityKw(Number(e.target.value))}
          disabled={submitting}
          className={`${inputClass} mt-2`}
        />
      </Field>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          disabled={submitting}
          className="ui-btn ui-btn-secondary flex-1"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="ui-btn ui-btn-primary flex-1"
        >
          {submitting ? 'Saving…' : 'Save site'}
        </button>
      </div>
    </form>
  )
}

function Field({ label, id, children }) {
  return (
    <div>
      <label htmlFor={id} className="ui-label">
        {label}
      </label>
      {children}
    </div>
  )
}

const inputClass = 'ui-input'
