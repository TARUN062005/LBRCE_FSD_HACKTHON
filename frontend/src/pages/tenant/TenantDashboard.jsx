import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PowerUsageChart from '../../components/charts/PowerUsageChart'
import PriorityBadge from '../../components/PriorityBadge'
import ErrorState from '../../components/ErrorState'
import SkeletonCard from '../../components/SkeletonCard'
import { useAuth } from '../../context/AuthContext'
import { formatMoney } from '../../lib/money'
import api from '../../lib/axios'

export default function TenantDashboard() {
  const { user } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/dashboard')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white xs:text-2xl">
            Tenant Dashboard
          </h2>
          <p className="text-sm text-ink-muted">
            {user?.name ? `Welcome, ${user.name}. ` : ''}
            Fleet priorities, live site power, and billing at a glance.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-border px-3 py-2 text-sm dark:border-border-dark"
        >
          Refresh
        </button>
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
            <StatCard label="Vehicles" value={data.summary.vehicles} to="/tenant/vehicles" />
            <StatCard
              label="Active sessions"
              value={data.summary.activeSessions}
              to="/tenant/sessions"
            />
            <StatCard
              label="Period energy"
              value={`${Number(data.summary.totalKwh || 0).toFixed(3)} kWh`}
              to="/tenant/billing"
            />
            <StatCard
              label="Period cost"
              value={formatMoney(data.summary.amount)}
              to="/tenant/billing"
            />
          </div>

          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3">
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
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Billing</p>
              <p className="mt-2 text-sm text-ink dark:text-white">
                Metered invoices for completed sessions.
              </p>
            </Link>
            <div className="rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Site draw
              </p>
              <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                {data.summary.usedKw} / {data.summary.capacityKw} kW
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Tariff: {data.tariff?.label || '—'}
              </p>
            </div>
          </div>

          <PowerUsageChart initialData={data.powerUsage} />

          {data.recentSessions?.length > 0 && (
            <div className="rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink dark:text-white">Recent sessions</h3>
                <Link to="/tenant/sessions" className="text-sm text-accent hover:underline">
                  Live board
                </Link>
              </div>
              <ul className="space-y-2">
                {data.recentSessions.map((s) => (
                  <li
                    key={s.id}
                    className="flex flex-wrap items-center justify-between gap-2 text-sm"
                  >
                    <span className="font-medium text-ink dark:text-white">{s.driverName}</span>
                    <div className="flex items-center gap-2">
                      <PriorityBadge tier={s.priorityTier} />
                      <span className="capitalize text-ink-muted">{s.state}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}

function StatCard({ label, value, to }) {
  const Comp = to ? Link : 'div'
  return (
    <Comp
      to={to}
      className="rounded-lg border border-border bg-panel p-4 transition hover:border-accent dark:border-border-dark dark:bg-panel-dark"
    >
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">{value}</p>
    </Comp>
  )
}
