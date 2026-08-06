import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PriorityBadge from '../../components/PriorityBadge'
import SkeletonCard from '../../components/SkeletonCard'
import { useAuth } from '../../context/AuthContext'
import api from '../../lib/axios'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [vehicles, setVehicles] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const { data } = await api.get('/vehicles')
        if (!cancelled) setVehicles(data.data || [])
      } catch {
        if (!cancelled) setVehicles([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const priorityCounts = vehicles.reduce(
    (acc, v) => {
      acc[v.priorityTier] = (acc[v.priorityTier] || 0) + 1
      return acc
    },
    { low: 0, medium: 0, high: 0, sla: 0 },
  )

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ink dark:text-white">Tenant Dashboard</h2>
        <p className="text-sm text-ink-muted">
          {user?.name ? `Welcome, ${user.name}. ` : ''}
          Manage your fleet&apos;s charging priorities and departure windows.
        </p>
      </div>

      <div className="grid gap-3 xs:grid-cols-2">
        {loading ? (
          <>
            <SkeletonCard rows={2} />
            <SkeletonCard rows={2} />
          </>
        ) : (
          <>
            <Link
              to="/tenant/vehicles"
              className="rounded-lg border border-border bg-panel p-4 transition hover:border-accent dark:border-border-dark dark:bg-panel-dark"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Vehicles
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                {vehicles.length}
              </p>
              <p className="mt-1 text-sm text-ink-muted">Own fleet only</p>
            </Link>

            <Link
              to="/tenant/sessions"
              className="rounded-lg border border-border bg-panel p-4 transition hover:border-accent dark:border-border-dark dark:bg-panel-dark"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Live Session Board
              </p>
              <p className="mt-2 text-sm text-ink dark:text-white">
                Simulate plug-in and watch Queued → Completed.
              </p>
            </Link>

            <Link
              to="/tenant/billing"
              className="rounded-lg border border-border bg-panel p-4 transition hover:border-accent dark:border-border-dark dark:bg-panel-dark"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Billing
              </p>
              <p className="mt-2 text-sm text-ink dark:text-white">
                View metered invoices for completed sessions.
              </p>
            </Link>

            <div className="rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Priority mix
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['sla', 'high', 'medium', 'low'].map((tier) => (
                  <div key={tier} className="flex items-center gap-1.5">
                    <PriorityBadge tier={tier} />
                    <span className="text-sm text-ink dark:text-white">
                      {priorityCounts[tier] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {!loading && vehicles.length > 0 && (
        <div className="rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-ink dark:text-white">Next departures</h3>
            <Link to="/tenant/vehicles" className="text-sm text-accent hover:underline">
              View all
            </Link>
          </div>
          <ul className="space-y-2">
            {vehicles.slice(0, 3).map((v) => (
              <li
                key={v.id}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="font-medium text-ink dark:text-white">{v.driverName}</span>
                <PriorityBadge tier={v.priorityTier} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
