import { useEffect, useState } from 'react'
import Modal from './Modal'
import { useToast } from '../context/ToastContext'
import api from '../lib/axios'

export default function PlugInButton({ onStarted }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [options, setOptions] = useState({ vehicles: [], chargers: [] })
  const [vehicleId, setVehicleId] = useState('')
  const [chargerId, setChargerId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!open) return undefined
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const { data } = await api.get('/sessions/options')
        if (cancelled) return
        setOptions(data.data || { vehicles: [], chargers: [] })
        setVehicleId(data.data?.vehicles?.[0]?.id || '')
        setChargerId(data.data?.chargers?.[0]?.id || '')
      } catch (err) {
        if (!cancelled) {
          setError(err.response?.data?.message || 'Failed to load options')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [open])

  async function handleStart(e) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const { data } = await api.post('/sessions/start', { vehicleId, chargerId })
      toast('Plug-in simulated — session started')
      setOpen(false)
      onStarted?.(data.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to start session')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="ui-btn ui-btn-primary"
      >
        Simulate Plug-In
      </button>

      <Modal open={open} title="Simulate Plug-In" onClose={() => setOpen(false)}>
        {loading ? (
          <p className="text-sm text-ink-muted">Loading fleet & chargers…</p>
        ) : (
          <form onSubmit={handleStart} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="plugin-vehicle" className="block text-sm font-medium">
                Vehicle / driver
              </label>
              <select
                id="plugin-vehicle"
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className={inputClass}
                required
                disabled={!options.vehicles.length}
              >
                {!options.vehicles.length && <option value="">No vehicles</option>}
                {options.vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.driverName} · {v.priorityTier} · {v.batteryCapacityKwh} kWh
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="plugin-charger" className="block text-sm font-medium">
                Charger
              </label>
              <select
                id="plugin-charger"
                value={chargerId}
                onChange={(e) => setChargerId(e.target.value)}
                className={inputClass}
                required
                disabled={!options.chargers.length}
              >
                {!options.chargers.length && <option value="">No available chargers</option>}
                {options.chargers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label} · {c.maxPowerKw} kW
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting || !vehicleId || !chargerId}
              className="ui-btn ui-btn-primary w-full"
            >
              {submitting ? 'Starting…' : 'Start session'}
            </button>
          </form>
        )}
      </Modal>
    </>
  )
}

const inputClass =
  'w-full rounded-md border border-border bg-panel px-3 py-2.5 text-sm outline-none ring-accent focus:ring-2 dark:border-border-dark dark:bg-surface-dark'
