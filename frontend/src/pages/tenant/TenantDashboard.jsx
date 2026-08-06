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
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="page-title">Fleet dashboard</h2>
          <p className="page-desc">
            {user?.name ? `Welcome, ${user.name}. ` : ''}
            Priorities, live site power, and billing at a glance.
          </p>
        </div>
        <button type="button" onClick={load} className="ui-btn ui-btn-secondary">
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
              className="ui-card ui-card-hover flex h-full flex-col p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Live session board
              </p>
              <p className="mt-2 text-sm text-ink dark:text-white">
                Simulate plug-in and watch Queued → Completed.
              </p>
            </Link>
            <Link
              to="/tenant/billing"
              className="ui-card ui-card-hover flex h-full flex-col p-4"
            >
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">Billing</p>
              <p className="mt-2 text-sm text-ink dark:text-white">
                Metered invoices for completed sessions.
              </p>
            </Link>
            <div className="ui-card flex h-full flex-col p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                Site draw
              </p>
              <p className="stat-value mt-2 text-ink dark:text-white">
                {data.summary.usedKw} / {data.summary.capacityKw} kW
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Tariff: {data.tariff?.label || '—'}
              </p>
            </div>
          </div>

          <PowerUsageChart initialData={data.powerUsage} />

          {data.recentSessions?.length > 0 && (
            <div className="ui-card p-4 md:p-5">
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
    <Comp to={to} className="ui-card ui-card-hover flex h-full flex-col p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="stat-value mt-2 text-lg text-ink dark:text-white">{value}</p>
    </Comp>
  )
}
