import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import AnimatedCounter from '../../components/AnimatedCounter'

export default function UserDashboard() {
  const { user } = useAuth()
  const [stations, setStations] = useState([])
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [st, bk] = await Promise.all([
        api.get('/stations', { params: q ? { q } : {} }),
        api.get('/bookings'),
      ])
      setStations(st.data.data || [])
      setBookings(bk.data.data || [])
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [q])

  useEffect(() => {
    load()
  }, [load])

  const active = bookings.filter((b) => ['pending', 'approved', 'charging'].includes(b.status))

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-semibold text-ink dark:text-white">
          Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-sm text-ink-muted">
          Search stations, pre-book a slot, and track your charging — driver portal (
          <span className="text-accent">normal_user</span>).
        </p>
      </div>

      <div className="grid gap-3 xs:grid-cols-3">
        <div className="glass-panel rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Stations</p>
          <p className="mt-1 font-display text-2xl font-bold">
            <AnimatedCounter value={stations.length} />
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Active bookings</p>
          <p className="mt-1 font-display text-2xl font-bold">
            <AnimatedCounter value={active.length} />
          </p>
        </div>
        <div className="glass-panel rounded-xl p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">History</p>
          <p className="mt-1 font-display text-2xl font-bold">
            <AnimatedCounter value={bookings.length} />
          </p>
        </div>
      </div>

      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search stations or locations…"
          className="min-w-[200px] flex-1 rounded-xl border border-border bg-panel px-3 py-2.5 text-sm dark:border-border-dark dark:bg-panel-dark"
        />
        <button
          type="submit"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
        >
          Search
        </button>
        <Link
          to="/user/stations"
          className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold dark:border-border-dark"
        >
          Browse all
        </Link>
      </form>

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <SkeletonCard rows={3} />
          <SkeletonCard rows={3} />
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {stations.slice(0, 4).map((s) => (
            <Link
              key={s.id}
              to={`/user/stations?site=${s.id}`}
              className="glass-panel rounded-xl p-4 transition hover:border-accent"
            >
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-ink-muted">{s.location}</p>
              <p className="mt-2 text-xs text-accent">
                {s.availableChargers}/{s.chargerCount} chargers available · {s.maxCapacityKw} kW
              </p>
            </Link>
          ))}
          {!stations.length && (
            <p className="text-sm text-ink-muted">No stations match your search.</p>
          )}
        </div>
      )}
    </section>
  )
}
