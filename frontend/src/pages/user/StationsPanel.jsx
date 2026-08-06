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
      toast('Booking created — pending admin approval')
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
          <h2 className="font-display text-xl font-semibold">Charging stations</h2>
          <p className="text-sm text-ink-muted">Search locations and pre-book a time slot.</p>
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
            className="rounded-xl border border-border bg-panel px-3 py-2 text-sm dark:border-border-dark dark:bg-panel-dark"
          />
          <button type="submit" className="rounded-xl bg-accent px-3 py-2 text-sm font-semibold text-white">
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
            <article key={s.id} className="glass-panel rounded-xl p-4">
              <h3 className="font-semibold">{s.name}</h3>
              <p className="text-sm text-ink-muted">{s.location}</p>
              <p className="mt-2 text-xs">
                Grid {s.maxCapacityKw} kW · {s.availableChargers}/{s.chargerCount} available
              </p>
              <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                {s.chargers?.map((c) => (
                  <li key={c.id}>
                    {c.label} — {c.maxPowerKw} kW · {c.status}
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => openBook(s)}
                className="mt-3 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
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
              className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 dark:border-border-dark dark:bg-panel-dark"
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
              className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 dark:border-border-dark dark:bg-panel-dark"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            End
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-border bg-panel px-3 py-2 dark:border-border-dark dark:bg-panel-dark"
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
                  className="mr-1 mt-1 rounded-full border border-border px-2 py-0.5 dark:border-border-dark"
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
            className="w-full rounded-xl bg-accent py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {submitting ? 'Booking…' : 'Confirm booking'}
          </button>
        </form>
      </Modal>
    </section>
  )
}
