import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import EmptyState from '../../components/EmptyState'
import { useAuth } from '../../context/AuthContext'
import { formatMoney } from '../../lib/money'
import api from '../../lib/axios'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [stations, setStations] = useState([])
  const [bookings, setBookings] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [st, bk, earn] = await Promise.all([
        api.get('/marketplace/stations'),
        api.get('/marketplace/bookings'),
        api.get('/marketplace/earnings').catch(() => ({ data: { data: null } })),
      ])
      setStations(st.data.data || [])
      setBookings(bk.data.data || [])
      setEarnings(earn.data.data || null)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const pending = bookings.filter((b) => b.status === 'pending').length
  const active = bookings.filter((b) => ['approved', 'charging'].includes(b.status)).length

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="page-title">Host home</h2>
          <p className="page-desc">
            {user?.name ? `Hi ${user.name}. ` : ''}
            Manage your charging stations, approve booking requests, and track earnings.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/tenant/stations/new" className="ui-btn ui-btn-primary">
            Add station
          </Link>
          <button type="button" onClick={load} className="ui-btn ui-btn-secondary">
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} rows={2} />
          ))}
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Stations" value={stations.length} to="/tenant/stations" />
            <StatCard label="Pending requests" value={pending} to="/tenant/bookings" highlight={pending > 0} />
            <StatCard label="Active bookings" value={active} to="/tenant/bookings" />
            <StatCard label="Live board" value="Open" to="/tenant/sessions" />
            <StatCard
              label="Earnings"
              value={formatMoney(earnings?.revenue ?? 0)}
              to="/tenant/billing"
            />
          </div>

          {!stations.length ? (
            <EmptyState
              title="Add your first station"
              description="Pin it on the map, set prices and hours, then start receiving booking requests."
              action={
                <Link to="/tenant/stations/new" className="ui-btn ui-btn-primary">
                  Create station
                </Link>
              }
            />
          ) : null}

          {pending > 0 && (
            <div className="ui-card flex flex-wrap items-center justify-between gap-3 border-accent/30 p-4">
              <div>
                <p className="font-semibold text-ink dark:text-white">
                  {pending} booking request{pending === 1 ? '' : 's'} waiting
                </p>
                <p className="text-sm text-ink-muted">Approve or reject so drivers know what to do next.</p>
              </div>
              <Link to="/tenant/bookings" className="ui-btn ui-btn-primary">
                Review requests
              </Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function StatCard({ label, value, to, highlight }) {
  return (
    <Link
      to={to}
      className={[
        'ui-card ui-card-hover block p-4',
        highlight ? 'border-accent ring-1 ring-accent/20' : '',
      ].join(' ')}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="stat-value mt-1">{value}</p>
    </Link>
  )
}
