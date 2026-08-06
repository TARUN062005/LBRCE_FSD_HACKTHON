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
  { title: 'Chargers', blurb: 'Hardware inventory', to: '/admin/chargers' },
  { title: 'Tenants', blurb: 'Companies', to: '/admin/tenants' },
  { title: 'Live Board', blurb: 'Session states', to: '/admin/sessions' },
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
    <section className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink dark:text-white xs:text-2xl">
            Judge Analytics
          </h2>
          <p className="text-sm text-ink-muted">
            Live demo metrics with animated counters and charts.
            {data?.tariff ? ` · ${data.tariff.label} band` : ''}
            {s ? ` · ${s.usedKw}/${s.totalCapacityKw} kW` : ''}
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
                className="rounded-xl border border-border/80 bg-panel/90 p-4 shadow-sm backdrop-blur dark:border-border-dark dark:bg-panel-dark/90"
              >
                <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                  {m.label}
                </p>
                <p className="mt-2 font-display text-2xl font-semibold text-ink dark:text-white">
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
              className="rounded-xl border border-accent/30 bg-accent/5 p-4 xs:col-span-2 lg:col-span-1"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-ink-muted">
                Period billed
              </p>
              <p className="mt-2 font-display text-2xl font-semibold text-accent">
                {formatMoney(s?.billedAmount || 0)}
              </p>
            </motion.div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <PowerUsageChart initialData={data.powerUsage} />
            <TenantCostChart data={data.tenantCosts} />
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-ink-muted">Quick links</h3>
            <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-5">
              {SHORTCUTS.map((card) => (
                <Link
                  key={card.title}
                  to={card.to}
                  className="rounded-lg border border-border bg-panel p-3 transition hover:border-accent dark:border-border-dark dark:bg-panel-dark"
                >
                  <p className="text-sm font-semibold">{card.title}</p>
                  <p className="text-xs text-ink-muted">{card.blurb}</p>
                </Link>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
