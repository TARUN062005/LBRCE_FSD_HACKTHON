import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import api from '../../lib/axios'
import { formatMoney, formatRate } from '../../lib/money'
import { useToast } from '../../context/ToastContext'
import { useAuth } from '../../context/AuthContext'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import RazorpayDemoModal from '../../components/RazorpayDemoModal'
import useGeolocation from '../../hooks/useGeolocation'

export default function StationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()
  const { coords } = useGeolocation()
  const [station, setStation] = useState(null)
  const [ratings, setRatings] = useState([])
  const [slots, setSlots] = useState([])
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [chargerId, setChargerId] = useState('')
  const [selectedSlot, setSelectedSlot] = useState(null)
  const [quote, setQuote] = useState(null)
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
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
      setChargerId((prev) => prev || firstAvail?.id || st.data.data.chargers?.[0]?.id || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load station')
    } finally {
      setLoading(false)
    }
  }, [id, date])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    setQuote(null)
    setSelectedSlot(null)
  }, [date])

  useEffect(() => {
    let cancelled = false
    async function fetchQuote() {
      if (!selectedSlot || !chargerId || !id) {
        setQuote(null)
        return
      }
      setQuoteBusy(true)
      try {
        const { data } = await api.post('/payments/quote', {
          siteId: id,
          chargerId,
          startTime: selectedSlot.startTime,
          endTime: selectedSlot.endTime,
          duration: 60,
        })
        if (!cancelled) setQuote(data.data)
      } catch (err) {
        if (!cancelled) {
          setQuote(null)
          toast(err.response?.data?.message || 'Could not estimate price', 'error')
        }
      } finally {
        if (!cancelled) setQuoteBusy(false)
      }
    }
    fetchQuote()
    return () => {
      cancelled = true
    }
  }, [selectedSlot, chargerId, id, toast])

  const chargerLabel = useMemo(() => {
    const c = station?.chargers?.find((x) => x.id === chargerId)
    return c?.label || quote?.chargerLabel || chargerId
  }, [station, chargerId, quote])

  async function handlePaySuccess(method) {
    const { data } = await api.post('/payments/demo-checkout', {
      siteId: id,
      chargerId,
      bookingDate: date,
      startTime: selectedSlot.startTime,
      endTime: selectedSlot.endTime,
      duration: quote?.durationMinutes || 60,
      method,
    })
    toast(data.message || 'Your booking request has been sent to the station owner.')
    return data
  }

  async function handlePayCancel(method) {
    try {
      await api.post('/payments/demo-cancel', {
        siteId: id,
        amount: quote?.totalAmount || 0,
        method,
        reason: 'cancelled',
      })
    } catch {
      /* ignore demo cancel errors */
    }
    toast('Payment cancelled.', 'error')
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

  const summaryLines = quote
    ? [
        `Charger ${chargerLabel}`,
        `${quote.durationMinutes} min · ~${quote.estimatedKwh} kWh`,
        `Energy ${formatMoney(quote.energyCost)} · Fee ${formatMoney(quote.platformFee)} · GST ${formatMoney(quote.gstAmount)}`,
      ]
    : []

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
          <h3 className="text-sm font-semibold">Pre-book a slot</h3>
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
            <select
              className="ui-input"
              value={chargerId}
              onChange={(e) => {
                setChargerId(e.target.value)
                setSelectedSlot(null)
              }}
            >
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
            <div className="rounded-xl border border-border bg-surface/70 p-4 dark:border-border-dark dark:bg-surface-dark/40">
              <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Booking summary
              </p>
              {quoteBusy && !quote ? (
                <p className="mt-2 text-sm text-ink-muted">Calculating price…</p>
              ) : quote ? (
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row label="Station" value={quote.stationName || station.name} />
                  <Row label="Charger" value={quote.chargerLabel || chargerLabel} />
                  <Row label="Duration" value={`${quote.durationMinutes} min`} />
                  <Row label="Est. energy" value={`${quote.estimatedKwh} kWh`} />
                  <Row label="Price / kWh" value={formatRate(quote.pricePerKwh)} />
                  <Row label="Energy cost" value={formatMoney(quote.energyCost)} />
                  <Row label="Platform fee" value={formatMoney(quote.platformFee)} />
                  <Row
                    label={`GST (${Math.round((quote.gstRate || 0.18) * 100)}%)`}
                    value={formatMoney(quote.gstAmount)}
                  />
                  <div className="flex justify-between border-t border-border pt-2 font-semibold dark:border-border-dark">
                    <dt>Total amount</dt>
                    <dd className="text-accent">{formatMoney(quote.totalAmount)}</dd>
                  </div>
                </dl>
              ) : (
                <p className="mt-2 text-sm text-ink-muted">Select a slot to see pricing.</p>
              )}
            </div>
          )}

          <button
            type="button"
            className="ui-btn ui-btn-primary w-full"
            disabled={!quote || quoteBusy}
            onClick={() => setPayOpen(true)}
          >
            Proceed to Payment
          </button>
          <p className="text-center text-xs text-ink-muted">
            Demo Razorpay checkout · pay first, then the station host approves your booking.
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

      <RazorpayDemoModal
        open={payOpen}
        amount={quote?.totalAmount || 0}
        userName={user?.name || ''}
        userEmail={user?.email || ''}
        stationName={station.name}
        summaryLines={summaryLines}
        onSuccess={handlePaySuccess}
        onCancel={handlePayCancel}
        onClose={() => {
          setPayOpen(false)
          navigate('/user/bookings')
        }}
        onDismiss={() => setPayOpen(false)}
      />
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-muted">{label}</dt>
      <dd className="text-right font-medium text-ink dark:text-white">{value}</dd>
    </div>
  )
}
