import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import PowerUsageChart from '../../components/charts/PowerUsageChart'
import TenantCostChart from '../../components/charts/TenantCostChart'
import ErrorState from '../../components/ErrorState'
import SkeletonCard, { SkeletonList } from '../../components/SkeletonCard'
import { formatMoney } from '../../lib/money'
import api from '../../lib/axios'

const CARDS = [
  { key: 'sites', title: 'Sites', blurb: 'Register sites', to: '/admin/sites', field: 'sites' },
  {
    key: 'chargers',
    title: 'Chargers',
    blurb: 'Hardware inventory',
    to: '/admin/chargers',
    field: 'chargers',
  },
  {
    key: 'tenants',
    title: 'Tenants',
    blurb: 'Onboard companies',
    to: '/admin/tenants',
    field: 'tenants',
  },
  {
    key: 'sessions',
    title: 'Live Board',
    blurb: 'Active sessions',
    to: '/admin/sessions',
    field: 'activeSessions',
  },
  {
    key: 'capacity',
    title: 'Grid limit',
    blurb: 'Total site capacity',
    to: '/admin/sites',
    field: 'capacity',
  },
  {
    key: 'billing',
    title: 'Billed',
    blurb: 'Period revenue',
    to: '/admin/reports',
    field: 'billing',
  },
]

export default function AdminDashboard() {
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
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const stats = data
    ? {
        sites: data.summary.sites,
        chargers: data.summary.chargers,
        tenants: data.summary.tenants,
        activeSessions: data.summary.activeSessions,
        capacity: `${data.summary.totalCapacityKw} kW`,
        billing: formatMoney(data.summary.billedAmount),
      }
    : null

  return (
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white xs:text-2xl">
            Admin Dashboard
          </h2>
          <p className="text-sm text-ink-muted">
            Live grid usage, tenant costs, and configuration shortcuts.
            {data?.tariff ? ` · Tariff: ${data.tariff.label}` : ''}
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
        <>
          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => (
              <SkeletonCard key={card.key} rows={2} />
            ))}
          </div>
          <SkeletonList count={2} />
        </>
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3">
            {CARDS.map((card) => (
              <Link
                key={card.key}
                to={card.to}
                className="rounded-lg border border-border bg-panel p-4 transition hover:border-accent dark:border-border-dark dark:bg-panel-dark"
              >
                <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                  {card.title}
                </p>
                <p className="mt-2 text-2xl font-semibold text-ink dark:text-white">
                  {stats?.[card.field] ?? '—'}
                </p>
                <p className="mt-1 text-sm text-ink-muted">{card.blurb}</p>
              </Link>
            ))}
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PowerUsageChart initialData={data.powerUsage} />
            <TenantCostChart data={data.tenantCosts} />
          </div>
        </>
      )}
    </section>
  )
}
