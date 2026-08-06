import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import Modal from '../../components/Modal'

function toLocalInputValue(date) {
  const d = new Date(date)
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function StationsPanel() {
  const { toast } = useToast()
  const [params] = useSearchParams()
  const [stations, setStations] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [bookingSite, setBookingSite] = useState(null)
  const [chargerId, setChargerId] = useState('')
  const [startTime, setStartTime] = useState(() => toLocalInputValue(Date.now() + 3600000))
  const [endTime, setEndTime] = useState(() => toLocalInputValue(Date.now() + 7200000))
  const [slots, setSlots] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const selectedSiteId = params.get('site')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/stations', { params: q ? { q } : {} })
      setStations(data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stations')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (selectedSiteId && stations.length) {
      const site = stations.find((s) => s.id === selectedSiteId)
      if (site) openBook(site)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedSiteId, stations])

  const tariffHint = useMemo(() => {
    return null
  }, [])

  async function openBook(site) {
    setBookingSite(site)
    setChargerId(site.chargers?.[0]?.id || '')
    try {
      const { data } = await api.get('/availability', {
        params: { siteId: site.id, date: new Date().toISOString().slice(0, 10) },
      })
      setSlots(data.data?.freeSlots || [])
    } catch {
      setSlots([])
    }
  }

  async function submitBooking(e) {
    e.preventDefault()
    if (!bookingSite || !chargerId) return
    setSubmitting(true)
    try {
      await api.post('/bookings/create', {
        siteId: bookingSite.id,
        chargerId,
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        bookingDate: new Date(startTime).toISOString(),
      })
      toast('Booking request sent — waiting for the station host')
      setBookingSite(null)
    } catch (err) {
      toast(err.response?.data?.message || 'Booking failed', 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="page-title">Charging stations</h2>
          <p className="page-desc">Search locations and pre-book a time slot.</p>
        </div>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            load()
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search…"
            className="ui-input !w-auto min-w-[10rem]"
          />
          <button type="submit" className="ui-btn ui-btn-primary">
            Search
          </button>
        </form>
      </div>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.map((s) => (
            <article key={s.id} className="ui-card ui-card-hover flex h-full flex-col p-4">
              <h3 className="font-semibold text-ink dark:text-white">{s.name}</h3>
              <p className="text-sm text-ink-muted">{s.location}</p>
              <p className="mt-2 text-xs text-ink dark:text-white">
                Grid {s.maxCapacityKw} kW · {s.availableChargers}/{s.chargerCount} available
              </p>
              <ul className="mt-2 flex-1 space-y-1 text-xs text-ink-muted">
                {s.chargers?.map((c) => (
                  <li key={c.id}>
                    {c.label} — {c.maxPowerKw} kW · {c.status}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openBook(s)}
                className="ui-btn ui-btn-primary mt-3 self-start"
              >
                Pre-book slot
              </button>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={Boolean(bookingSite)}
        onClose={() => setBookingSite(null)}
        title={bookingSite ? `Book · ${bookingSite.name}` : 'Book'}
      >
        <form className="space-y-3" onSubmit={submitBooking}>
          <label className="block text-sm">
            Charger
            <select
              className="ui-input mt-1"
              value={chargerId}
              onChange={(e) => setChargerId(e.target.value)}
              required
            >
              {(bookingSite?.chargers || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label} ({c.maxPowerKw} kW)
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Start
            <input
              type="datetime-local"
              className="ui-input mt-1"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            End
            <input
              type="datetime-local"
              className="ui-input mt-1"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </label>
          {slots.length > 0 && (
            <div className="text-xs text-ink-muted">
              Free slots today:{' '}
              {slots.slice(0, 4).map((s) => (
                <button
                  key={s.startTime}
                  type="button"
                  className="ui-btn ui-btn-secondary mr-1 mt-1 !px-2 !py-0.5 text-xs"
                  onClick={() => {
                    setStartTime(toLocalInputValue(s.startTime))
                    setEndTime(toLocalInputValue(s.endTime))
                  }}
                >
                  {new Date(s.startTime).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-ink-muted">
            Estimated cost is calculated from charger power × duration × current tariff.
            {tariffHint}
          </p>
          <button
            type="submit"
            disabled={submitting}
            className="ui-btn ui-btn-primary w-full"
          >
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>
      </Modal>
    </section>
  )
}
