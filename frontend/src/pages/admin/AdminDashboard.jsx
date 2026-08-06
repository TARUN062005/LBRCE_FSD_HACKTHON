import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import PowerUsageChart from '../../components/charts/PowerUsageChart'
import TenantCostChart from '../../components/charts/TenantCostChart'
import AnimatedCounter from '../../components/AnimatedCounter'
import ErrorState from '../../components/ErrorState'
import SkeletonCard, { SkeletonList } from '../../components/SkeletonCard'
import { formatMoney } from '../../lib/money'
import api from '../../lib/axios'

const SHORTCUTS = [
  { title: 'Sites', blurb: 'Grid capacity', to: '/admin/sites' },
  { title: 'Tenants', blurb: 'Companies', to: '/admin/tenants' },
  { title: 'Managers', blurb: 'Promote hosts', to: '/admin/users' },
  { title: 'Reports', blurb: 'Billing rollup', to: '/admin/reports' },
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
    const id = window.setInterval(load, 8000)
    return () => window.clearInterval(id)
  }, [load])

  const s = data?.summary

  const judgeMetrics = s
    ? [
        {
          key: 'sessions',
          label: 'Active sessions',
          value: s.activeSessions,
          decimals: 0,
          suffix: '',
        },
        {
          key: 'energy',
          label: 'Total energy',
          value: s.totalEnergyKwh,
          decimals: 2,
          suffix: ' kWh',
        },
        {
          key: 'chargers',
          label: 'Chargers',
          value: s.chargers,
          decimals: 0,
          suffix: '',
        },
        {
          key: 'grid',
          label: 'Grid utilization',
          value: s.gridUtilizationPct,
          decimals: 1,
          suffix: '%',
        },
        {
          key: 'tariff',
          label: 'Electricity tariff',
          value: s.tariffRate,
          decimals: 2,
          prefix: '$',
          suffix: '/kWh',
        },
        {
          key: 'tenants',
          label: 'Tenants',
          value: s.tenants,
          decimals: 0,
          suffix: '',
        },
        {
          key: 'vehicles',
          label: 'Vehicles',
          value: s.vehicles,
          decimals: 0,
          suffix: '',
        },
      ]
    : []

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-2xl">
          <h2 className="page-title">Analytics</h2>
          <p className="page-desc">
            Live site metrics and charts
            {data?.tariff ? ` · ${data.tariff.label} band` : ''}
            {s ? ` · ${s.usedKw}/${s.totalCapacityKw} kW` : ''}
          </p>
        </div>
        <button type="button" onClick={load} className="ui-btn ui-btn-secondary">
          Refresh
        </button>
      </div>

      {loading && !data ? (
        <>
          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 7 }).map((_, i) => (
              <SkeletonCard key={i} rows={2} />
            ))}
          </div>
          <SkeletonList count={2} />
        </>
      ) : error && !data ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-4">
            {judgeMetrics.map((m, i) => (
              <motion.div
                key={m.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="ui-card ui-card-hover flex h-full flex-col p-4"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {m.label}
                </p>
                <p className="stat-value mt-2 text-ink dark:text-white">
                  <AnimatedCounter
                    value={m.value}
                    decimals={m.decimals}
                    prefix={m.prefix || ''}
                    suffix={m.suffix}
                  />
                </p>
              </motion.div>
            ))}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="ui-card flex h-full flex-col border-accent/25 bg-accent/[0.04] p-4 xs:col-span-2 lg:col-span-1"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Period billed
              </p>
              <p className="stat-value mt-2 text-accent">{formatMoney(s?.billedAmount || 0)}</p>
            </motion.div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PowerUsageChart initialData={data.powerUsage} />
            <TenantCostChart data={data.tenantCosts} />
          </div>

          <div>
            <h3 className="section-title mb-3">Quick links</h3>
            <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-5">
              {SHORTCUTS.map((card) => (
                <Link
                  key={card.title}
                  to={card.to}
                  className="ui-card ui-card-hover flex h-full flex-col p-4"
                >
                  <p className="text-sm font-semibold text-ink dark:text-white">{card.title}</p>
                  <p className="mt-1 text-xs text-ink-muted">{card.blurb}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
