import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import LocationPicker from '../../components/map/LocationPicker'

export default function CreateStation() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [pin, setPin] = useState({ lat: 17.385, lng: 78.4867 })
  const [form, setForm] = useState({
    stationName: '',
    description: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    pricePerKwh: '0.14',
    numberOfChargers: '2',
    maxCapacityKw: '40',
    photoUrl: '',
  })

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const photos = form.photoUrl.trim() ? [form.photoUrl.trim()] : []
      const { data } = await api.post('/marketplace/stations', {
        stationName: form.stationName,
        description: form.description,
        address: form.address,
        city: form.city,
        state: form.state,
        pincode: form.pincode,
        pricePerKwh: Number(form.pricePerKwh),
        numberOfChargers: Number(form.numberOfChargers),
        maxCapacityKw: Number(form.maxCapacityKw),
        latitude: pin.lat,
        longitude: pin.lng,
        photos,
      })
      toast('Station created')
      navigate('/tenant/stations')
      return data
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to create station'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      <div>
        <Link to="/tenant/stations" className="text-sm text-accent hover:underline">
          ← My stations
        </Link>
        <h2 className="page-title mt-2">Create station</h2>
        <p className="page-desc">Pin your location on the map, then save pricing and chargers.</p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="ui-card space-y-4 p-5">
          {[
            ['stationName', 'Station name', 'text'],
            ['description', 'Description', 'text'],
            ['address', 'Address', 'text'],
            ['city', 'City', 'text'],
            ['state', 'State', 'text'],
            ['pincode', 'Pincode', 'text'],
            ['pricePerKwh', 'Price per kWh ($)', 'number'],
            ['numberOfChargers', 'Number of chargers', 'number'],
            ['maxCapacityKw', 'Site capacity (kW)', 'number'],
            ['photoUrl', 'Photo URL (optional)', 'url'],
          ].map(([key, label, type]) => (
            <label key={key} className="block text-sm">
              <span className="ui-label">{label}</span>
              <input
                className="ui-input"
                type={type}
                required={!['description', 'photoUrl', 'state', 'pincode'].includes(key)}
                value={form[key]}
                onChange={(e) => setField(key, e.target.value)}
                step={type === 'number' ? 'any' : undefined}
              />
            </label>
          ))}
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button type="submit" className="ui-btn ui-btn-primary w-full" disabled={submitting}>
            {submitting ? 'Saving…' : 'Save station'}
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <h3 className="text-sm font-semibold">Choose your station location</h3>
            <p className="text-xs text-ink-muted">Click the map or drag the pin. Coordinates are saved with the station.</p>
          </div>
          <LocationPicker value={pin} onChange={setPin} height={420} />
          <p className="text-xs text-ink-muted">
            Lat {pin.lat.toFixed(5)} · Lng {pin.lng.toFixed(5)}
          </p>
        </div>
      </form>
    </section>
  )
}
