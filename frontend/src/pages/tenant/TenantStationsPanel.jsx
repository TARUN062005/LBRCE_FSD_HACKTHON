import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'

export default function TenantStationsPanel() {
  const [stations, setStations] = useState([])
  const [earnings, setEarnings] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [st, ear] = await Promise.all([
        api.get('/marketplace/stations'),
        api.get('/marketplace/earnings'),
      ])
      setStations(st.data.data || [])
      setEarnings(ear.data.data || null)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stations')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={load} />

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="page-title">My stations</h2>
          <p className="page-desc">Charging sites you host on GridFleet.</p>
        </div>
        <Link to="/tenant/stations/new" className="ui-btn ui-btn-primary">
          Create station
        </Link>
      </div>

      {earnings && (
        <div className="grid gap-3 xs:grid-cols-3">
          <div className="ui-card p-4">
            <p className="text-xs uppercase text-ink-muted">Revenue</p>
            <p className="stat-value mt-1 text-lg">${Number(earnings.revenue || 0).toFixed(2)}</p>
          </div>
          <div className="ui-card p-4">
            <p className="text-xs uppercase text-ink-muted">Paid bookings</p>
            <p className="stat-value mt-1 text-lg">{earnings.paidBookings}</p>
          </div>
          <div className="ui-card p-4">
            <p className="text-xs uppercase text-ink-muted">Completed</p>
            <p className="stat-value mt-1 text-lg">{earnings.completedSessions}</p>
          </div>
        </div>
      )}

      {!stations.length ? (
        <EmptyState
          title="No stations yet"
          description="Pin your first charging location on the map to start receiving bookings."
          action={
            <Link to="/tenant/stations/new" className="ui-btn ui-btn-primary">
              Create station
            </Link>
          }
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {stations.map((s) => (
            <article key={s.id} className="ui-card flex h-full flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink dark:text-white">{s.name}</h3>
                  <p className="text-xs text-ink-muted">{s.address || s.location}</p>
                </div>
                <span className="rounded-md bg-surface px-2 py-0.5 text-[11px] font-semibold uppercase dark:bg-surface-dark">
                  {s.status}
                </span>
              </div>
              <p className="mt-3 text-sm text-ink-muted">
                {s.availableChargers}/{s.chargerCount} free · ${Number(s.pricePerKwh || 0).toFixed(2)}/kWh · ★{' '}
                {Number(s.ratingAvg || 0).toFixed(1)}
              </p>
              {s.latitude != null && (
                <p className="mt-1 text-xs text-ink-muted">
                  {s.latitude.toFixed(4)}, {s.longitude.toFixed(4)}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
