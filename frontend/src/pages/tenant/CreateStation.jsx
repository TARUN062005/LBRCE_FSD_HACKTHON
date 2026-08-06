import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import LocationPicker from '../../components/map/LocationPicker'
import useGeolocation from '../../hooks/useGeolocation'
import { reverseGeocode, searchPlaces } from '../../lib/geocode'

export default function CreateStation() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { coords, status, request } = useGeolocation()
  const [submitting, setSubmitting] = useState(false)
  const [lookingUp, setLookingUp] = useState(false)
  const [error, setError] = useState('')
  const [pin, setPin] = useState({ lat: 16.5062, lng: 80.648 })
  const [search, setSearch] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [searching, setSearching] = useState(false)
  const searchTimer = useRef(null)
  const skipNextReverse = useRef(false)

  const [form, setForm] = useState({
    stationName: '',
    description: '',
    address: '',
    city: '',
    state: 'Andhra Pradesh',
    pincode: '',
    pricePerKwh: '14',
    numberOfChargers: '2',
    maxCapacityKw: '40',
    open: '06:00',
    close: '22:00',
    photoUrl: '',
  })

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  useEffect(() => {
    if (status === 'idle') request()
  }, [status, request])

  useEffect(() => {
    if (coords?.lat != null) {
      setPin({ lat: coords.lat, lng: coords.lng })
    }
  }, [coords])

  const fillFromPlace = useCallback((place) => {
    setForm((prev) => ({
      ...prev,
      address: place.address || prev.address,
      city: place.city || prev.city,
      state: place.state || prev.state || 'Andhra Pradesh',
      pincode: place.pincode || prev.pincode,
    }))
  }, [])

  const lookupPin = useCallback(
    async (next) => {
      if (!next?.lat || !next?.lng) return
      setLookingUp(true)
      try {
        const place = await reverseGeocode(next.lat, next.lng)
        fillFromPlace(place)
      } catch {
        // keep manual fields
      } finally {
        setLookingUp(false)
      }
    },
    [fillFromPlace],
  )

  function onPinChange(next) {
    setPin(next)
    if (skipNextReverse.current) {
      skipNextReverse.current = false
      return
    }
    lookupPin(next)
  }

  useEffect(() => {
    if (coords?.lat != null) lookupPin(coords)
    // only on first granted location
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords?.lat, coords?.lng])

  function onSearchChange(value) {
    setSearch(value)
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (value.trim().length < 2) {
      setSuggestions([])
      return
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true)
      try {
        const results = await searchPlaces(value, { limit: 6 })
        setSuggestions(results)
      } catch {
        setSuggestions([])
      } finally {
        setSearching(false)
      }
    }, 350)
  }

  function pickSuggestion(place) {
    skipNextReverse.current = true
    setPin({ lat: place.lat, lng: place.lng })
    fillFromPlace(place)
    setSearch(place.displayName || place.address)
    setSuggestions([])
  }

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const photos = form.photoUrl.trim() ? [form.photoUrl.trim()] : []
      await api.post('/marketplace/stations', {
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
        workingHours: { open: form.open, close: form.close },
      })
      toast('Station submitted — waiting for admin approval')
      navigate('/tenant/stations')
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
        <h2 className="page-title mt-2">Add a charging station</h2>
        <p className="page-desc">
          Search an area or drop a pin — address fields fill automatically. Submit for admin approval
          before it goes live on the map.
        </p>
      </div>

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <div className="ui-card space-y-3 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-ink dark:text-white">Map location</h3>
                <p className="text-xs text-ink-muted">
                  Blue = your location · Green pin = station
                  {lookingUp ? ' · Looking up address…' : ''}
                </p>
              </div>
              <button
                type="button"
                className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                onClick={request}
              >
                Use my location
              </button>
            </div>

            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 z-10 flex items-center text-ink-muted">
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
                  <circle cx="11" cy="11" r="7" />
                  <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
                </svg>
              </span>
              <input
                className="ui-input w-full !pl-10"
                placeholder="Search area, landmark, or city…"
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                autoComplete="off"
              />
              {(searching || suggestions.length > 0) && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-xl border border-border bg-white shadow-lg dark:border-border-dark dark:bg-ink">
                  {searching && (
                    <p className="px-3 py-2 text-xs text-ink-muted">Searching…</p>
                  )}
                  {suggestions.map((s) => (
                    <button
                      key={`${s.lat}-${s.lng}-${s.displayName}`}
                      type="button"
                      className="block w-full truncate px-3 py-2 text-left text-sm hover:bg-accent/10"
                      onClick={() => pickSuggestion(s)}
                    >
                      {s.displayName || s.address}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <LocationPicker
            value={pin}
            onChange={onPinChange}
            userLocation={coords}
            height={420}
          />
          <p className="text-xs text-ink-muted">
            Lat {pin.lat.toFixed(5)} · Lng {pin.lng.toFixed(5)}
          </p>
        </div>

        <div className="ui-card space-y-4 p-5">
          <label className="block text-sm">
            <span className="ui-label">Station name</span>
            <input
              className="ui-input"
              required
              value={form.stationName}
              onChange={(e) => setField('stationName', e.target.value)}
              placeholder="e.g. Benz Circle EV Hub"
            />
          </label>

          <label className="block text-sm">
            <span className="ui-label">Description</span>
            <input
              className="ui-input"
              value={form.description}
              onChange={(e) => setField('description', e.target.value)}
              placeholder="Optional notes for drivers"
            />
          </label>

          <label className="block text-sm">
            <span className="ui-label">Address (auto-filled)</span>
            <input
              className="ui-input"
              required
              value={form.address}
              onChange={(e) => setField('address', e.target.value)}
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="ui-label">City</span>
              <input
                className="ui-input"
                required
                value={form.city}
                onChange={(e) => setField('city', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="ui-label">State</span>
              <input
                className="ui-input"
                value={form.state}
                onChange={(e) => setField('state', e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="ui-label">Pincode</span>
            <input
              className="ui-input"
              value={form.pincode}
              onChange={(e) => setField('pincode', e.target.value)}
              inputMode="numeric"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="ui-label">Price per kWh (₹)</span>
              <input
                className="ui-input"
                type="number"
                required
                min="1"
                step="0.5"
                value={form.pricePerKwh}
                onChange={(e) => setField('pricePerKwh', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="ui-label">Number of chargers</span>
              <input
                className="ui-input"
                type="number"
                required
                min="1"
                max="20"
                value={form.numberOfChargers}
                onChange={(e) => setField('numberOfChargers', e.target.value)}
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="ui-label">Capacity (kW)</span>
              <input
                className="ui-input"
                type="number"
                required
                min="10"
                value={form.maxCapacityKw}
                onChange={(e) => setField('maxCapacityKw', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="ui-label">Opens</span>
              <input
                className="ui-input"
                type="time"
                value={form.open}
                onChange={(e) => setField('open', e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="ui-label">Closes</span>
              <input
                className="ui-input"
                type="time"
                value={form.close}
                onChange={(e) => setField('close', e.target.value)}
              />
            </label>
          </div>

          <label className="block text-sm">
            <span className="ui-label">Photo URL (optional)</span>
            <input
              className="ui-input"
              type="url"
              value={form.photoUrl}
              onChange={(e) => setField('photoUrl', e.target.value)}
              placeholder="https://…"
            />
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" className="ui-btn ui-btn-primary w-full" disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit for admin approval'}
          </button>
          <p className="text-center text-xs text-ink-muted">
            Drivers will only see this station after an admin approves it.
          </p>
        </div>
      </form>
    </section>
  )
}
