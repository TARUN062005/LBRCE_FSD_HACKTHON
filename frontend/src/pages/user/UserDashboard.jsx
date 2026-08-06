import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import AnimatedCounter from '../../components/AnimatedCounter'
import { formatRate } from '../../lib/money'

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
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {user?.picture ? (
            <img
              src={user.picture}
              alt=""
              className="h-14 w-14 rounded-2xl object-cover shadow"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 font-display text-xl font-bold text-accent">
              {(user?.name || '?')[0]}
            </div>
          )}
          <div>
            <h2 className="page-title">
              Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
            </h2>
            <p className="page-desc">Find a charger, book a slot, and head over.</p>
          </div>
        </div>
        <Link to="/user/profile" className="ui-btn ui-btn-secondary">
          Edit profile
        </Link>
      </div>

      {user && !user.profileComplete && (
        <div className="ui-card flex flex-wrap items-center justify-between gap-3 border-amber-200/70 bg-amber-50/80 p-4 dark:border-amber-800/40 dark:bg-amber-950/30">
          <div>
            <p className="text-sm font-semibold text-ink dark:text-white">Complete your driver profile</p>
            <p className="text-sm text-ink-muted">
              Add phone and vehicle number so station hosts can identify you.
            </p>
          </div>
          <Link to="/user/profile" className="ui-btn ui-btn-primary">
            Finish profile
          </Link>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/user/map" className="ui-btn ui-btn-primary">
          Open nearby map
        </Link>
        <Link to="/user/bookings" className="ui-btn ui-btn-secondary">
          My bookings
        </Link>
      </div>

      <div className="grid gap-3 xs:grid-cols-3">
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Stations</p>
          <p className="stat-value mt-1 text-ink dark:text-white">
            <AnimatedCounter value={stations.length} />
          </p>
        </div>
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">Active bookings</p>
          <p className="stat-value mt-1 text-ink dark:text-white">
            <AnimatedCounter value={active.length} />
          </p>
        </div>
        <div className="ui-card p-4">
          <p className="text-[11px] uppercase tracking-wider text-ink-muted">History</p>
          <p className="stat-value mt-1 text-ink dark:text-white">
            <AnimatedCounter value={bookings.length} />
          </p>
        </div>
      </div>

      <form
        className="ui-card flex flex-wrap gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault()
          load()
        }}
      >
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-ink-muted">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-none stroke-current" strokeWidth="2">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
          </span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search stations or locations…"
            className="ui-input w-full !pl-10"
            aria-label="Search stations"
          />
        </div>
        <button type="submit" className="ui-btn ui-btn-primary">
          Search
        </button>
        <Link to="/user/stations" className="ui-btn ui-btn-secondary">
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
              to={`/user/stations/${s.id}`}
              className="ui-card ui-card-hover flex h-full flex-col p-4"
            >
              <p className="font-semibold text-ink dark:text-white">{s.name}</p>
              <p className="text-sm text-ink-muted">{s.location || s.address}</p>
              <p className="mt-2 text-xs text-accent">
                {s.availableChargers}/{s.chargerCount} free · {formatRate(s.pricePerKwh)}
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
