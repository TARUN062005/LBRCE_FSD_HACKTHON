import { useState } from 'react'
import { VEHICLE_PRESETS } from '../../lib/vehiclePresets'

const PRIORITY_OPTIONS = [
  { value: 'background', label: 'Background' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'emergency', label: 'Emergency' },
]

const TYPE_OPTIONS = [
  { value: 'bike', label: 'Electric bike' },
  { value: 'car', label: 'Electric car' },
  { value: 'bus', label: 'Electric bus' },
  { value: 'truck', label: 'Electric truck' },
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
  const [vehicleType, setVehicleType] = useState(initial?.vehicleType || 'car')
  const [batteryCapacityKwh, setBatteryCapacityKwh] = useState(
    initial?.batteryCapacityKwh ?? 60,
  )
  const [maxChargingPowerKw, setMaxChargingPowerKw] = useState(
    initial?.maxChargingPowerKw ?? 22,
  )
  const [currentCharge, setCurrentCharge] = useState(initial?.currentCharge ?? 20)
  const [targetCharge, setTargetCharge] = useState(initial?.targetCharge ?? 80)
  const [priorityTier, setPriorityTier] = useState(
    initial?.priorityTier === 'sla' ? 'emergency' : initial?.priorityTier || 'medium',
  )
  const [departureTime, setDepartureTime] = useState(
    toLocalInputValue(initial?.departureTime) || defaultDeparture(),
  )
  const [error, setError] = useState('')

  function applyType(type) {
    setVehicleType(type)
    const preset = VEHICLE_PRESETS[type] || VEHICLE_PRESETS.car
    setBatteryCapacityKwh(preset.batteryCapacityKwh)
    setMaxChargingPowerKw(preset.maxChargingPowerKw)
  }

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
        vehicleType,
        batteryCapacityKwh: Number(batteryCapacityKwh),
        maxChargingPowerKw: Number(maxChargingPowerKw),
        currentCharge: Number(currentCharge),
        targetCharge: Number(targetCharge),
        priorityTier,
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

      <Field label="Vehicle type" id="vehicle-type">
        <select
          id="vehicle-type"
          value={vehicleType}
          onChange={(e) => applyType(e.target.value)}
          disabled={submitting}
          className={inputClass}
        >
          {TYPE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Battery (kWh)" id="vehicle-battery">
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
        <Field label="Max charge power (kW)" id="vehicle-max-power">
          <input
            id="vehicle-max-power"
            type="number"
            min={0.1}
            step={0.1}
            value={maxChargingPowerKw}
            onChange={(e) => setMaxChargingPowerKw(Number(e.target.value))}
            disabled={submitting}
            className={inputClass}
            required
          />
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Current SoC %" id="vehicle-soc">
          <input
            id="vehicle-soc"
            type="number"
            min={0}
            max={100}
            value={currentCharge}
            onChange={(e) => setCurrentCharge(Number(e.target.value))}
            disabled={submitting}
            className={inputClass}
          />
        </Field>
        <Field label="Target SoC %" id="vehicle-target">
          <input
            id="vehicle-target"
            type="number"
            min={0}
            max={100}
            value={targetCharge}
            onChange={(e) => setTargetCharge(Number(e.target.value))}
            disabled={submitting}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label="Priority" id="vehicle-priority">
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
          className="ui-btn ui-btn-secondary flex-1"
        >
          Cancel
        </button>
        <button type="submit" disabled={submitting} className="ui-btn ui-btn-primary flex-1">
          {submitting ? 'Saving…' : 'Save vehicle'}
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
