import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axios'
import { formatMoney, formatRate } from '../../lib/money'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import useGeolocation from '../../hooks/useGeolocation'

export default function StationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { coords } = useGeolocation()
  const [station, setStation] = useState(null)
  const [ratings, setRatings] = useState([])
  const [slots, setSlots] = useState([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [chargerId, setChargerId] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [stars, setStars] = useState(5)
  const [comment, setComment] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [st, av, rt] = await Promise.all([
        api.get(`/stations/${id}`),
        api.get('/availability', { params: { siteId: id, date } }),
        api.get(`/stations/${id}/ratings`).catch(() => ({ data: { data: [] } })),
      ])
      setStation(st.data.data)
      setSlots(av.data.data?.freeSlots || [])
      setRatings(rt.data.data || [])
      const firstAvail = (st.data.data.chargers || []).find((c) => c.status === 'available')
      setChargerId(firstAvail?.id || st.data.data.chargers?.[0]?.id || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load station')
    } finally {
      setLoading(false)
    }
  }, [id, date])

  useEffect(() => {
    load()
  }, [load])

  async function bookNow() {
    if (!selectedSlot || !chargerId) {
      toast('Choose a charger and time slot', 'error')
      return
    }
    setBusy(true)
    try {
      await api.post('/bookings/create', {
        siteId: id,
        chargerId,
        bookingDate: date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        duration: 60,
      })
      toast('Booking request sent — the station host will approve or reject')
      navigate('/user/bookings')
    } catch (err) {
      toast(err.response?.data?.message || 'Booking failed', 'error')
    } finally {
      setBusy(false)
    }
  }

  async function submitRating(e) {
    e.preventDefault()
    try {
      await api.post(`/stations/${id}/ratings`, { rating: stars, comment })
      toast('Thanks for your rating')
      setComment('')
      load()
    } catch (err) {
      toast(err.response?.data?.message || 'Could not save rating', 'error')
    }
  }

  if (loading) return <SkeletonCard rows={6} />
  if (error) return <ErrorState message={error} onRetry={load} />
  if (!station) return null

  const navigateUrl =
    station.latitude != null && coords
      ? `https://www.openstreetmap.org/directions?from=${coords.lat},${coords.lng}&to=${station.latitude},${station.longitude}`
      : station.latitude != null
        ? `https://www.openstreetmap.org/?mlat=${station.latitude}&mlon=${station.longitude}#map=16/${station.latitude}/${station.longitude}`
        : null

  return (
    <section className="space-y-6">
      <div>
        <Link to="/user/map" className="text-sm font-medium text-accent hover:underline">
          ← Back to map
        </Link>
        <h2 className="page-title mt-2">{station.name}</h2>
        <p className="page-desc">{station.address || station.location}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="ui-card space-y-3 p-5">
          <p className="text-sm text-ink-muted">{station.description || 'Local EV charging station.'}</p>
          <dl className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-ink-muted">Price</dt>
              <dd className="font-semibold">{formatRate(station.pricePerKwh)}</dd>
            </div>
            <div>
              <dt className="text-ink-muted">Rating</dt>
              <dd className="font-semibold">
                ★ {Number(station.ratingAvg || 0).toFixed(1)} ({station.ratingCount || 0})
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Chargers</dt>
              <dd className="font-semibold">
                {station.availableChargers}/{station.chargerCount} available
              </dd>
            </div>
            <div>
              <dt className="text-ink-muted">Hours</dt>
              <dd className="font-semibold">
                {station.workingHours?.open || '08:00'}–{station.workingHours?.close || '20:00'}
              </dd>
            </div>
          </dl>
          {station.amenities?.length > 0 && (
            <div>
              <p className="ui-label">Amenities</p>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {station.amenities.map((a) => (
                  <span
                    key={a}
                    className="rounded-md bg-surface px-2 py-0.5 text-xs font-medium text-ink-muted dark:bg-surface-dark"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          )}
          {navigateUrl && (
            <a href={navigateUrl} target="_blank" rel="noreferrer" className="ui-btn ui-btn-secondary">
              Navigate to station
            </a>
          )}
          {station.photos?.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {station.photos.slice(0, 4).map((src) => (
                <img key={src} src={src} alt="" className="h-24 w-full rounded-lg object-cover" />
              ))}
            </div>
          )}
        </div>

        <div className="ui-card space-y-4 p-5">
          <h3 className="text-sm font-semibold">Book a slot</h3>
          <label className="block text-sm">
            <span className="ui-label">Date</span>
            <input
              type="date"
              className="ui-input"
              value={date}
              onChange={(e) => {
                setDate(e.target.value)
                setSelectedSlot(null)
              }}
            />
          </label>
          <label className="block text-sm">
            <span className="ui-label">Charger</span>
            <select className="ui-input" value={chargerId} onChange={(e) => setChargerId(e.target.value)}>
              {(station.chargers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} · {c.chargerType || 'Type2'} · {c.maxPowerKw} kW · {c.status}
                </option>
              ))}
            </select>
          </label>
          <div>
            <p className="ui-label">Available slots</p>
            <div className="flex flex-wrap gap-2">
              {slots.map((slot) => (
                <button
                  key={slot.startTime}
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className={[
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold',
                    selectedSlot?.startTime === slot.startTime
                      ? 'border-accent bg-accent text-white'
                      : 'border-border dark:border-border-dark',
                  ].join(' ')}
                >
                  {slot.slot ||
                    new Date(slot.startTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                </button>
              ))}
              {!slots.length && <p className="text-sm text-ink-muted">No free slots this day.</p>}
            </div>
          </div>
          {selectedSlot && (
            <p className="text-sm text-ink-muted">
              Est. total ~{formatMoney(
                Math.min(
                  station.chargers?.find((c) => c.id === chargerId)?.maxPowerKw || 22,
                  22,
                ) *
                  1 *
                  Number(station.pricePerKwh || 14),
              )}{' '}
              (1 hour · station rate)
            </p>
          )}
          <button
            type="button"
            className="ui-btn ui-btn-primary w-full"
            disabled={busy || !selectedSlot}
            onClick={bookNow}
          >
            {busy ? 'Sending request…' : 'Book Now'}
          </button>
          <p className="text-center text-xs text-ink-muted">
            The station host reviews every request. You’ll get a notification when they approve or reject.
          </p>
        </div>
      </div>

      <div className="ui-card space-y-4 p-5">
        <h3 className="text-sm font-semibold">Ratings</h3>
        <form onSubmit={submitRating} className="flex flex-wrap items-end gap-2">
          <label className="text-sm">
            <span className="ui-label">Stars</span>
            <select className="ui-input w-24" value={stars} onChange={(e) => setStars(Number(e.target.value))}>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="min-w-[200px] flex-1 text-sm">
            <span className="ui-label">Comment</span>
            <input
              className="ui-input"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="How was the station?"
            />
          </label>
          <button type="submit" className="ui-btn ui-btn-secondary">
            Submit rating
          </button>
        </form>
        <ul className="space-y-2">
          {ratings.map((r) => (
            <li key={r.id} className="border-t border-border pt-2 text-sm dark:border-border-dark">
              <span className="font-semibold">★ {r.rating}</span>
              <span className="ml-2 text-ink-muted">{r.comment || 'No comment'}</span>
            </li>
          ))}
          {!ratings.length && <p className="text-sm text-ink-muted">No ratings yet.</p>}
        </ul>
      </div>
    </section>
  )
}
