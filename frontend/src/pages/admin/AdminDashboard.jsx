import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import SkeletonCard from '../../components/SkeletonCard'
import api from '../../lib/axios'

const CARDS = [
  {
    key: 'sites',
    title: 'Sites',
    blurb: 'Register sites and locations',
    to: '/admin/sites',
    countKey: 'sites',
  },
  {
    key: 'chargers',
    title: 'Chargers',
    blurb: 'Add chargers under a site',
    to: '/admin/chargers',
    countKey: 'chargers',
  },
  {
    key: 'tenants',
    title: 'Tenants',
    blurb: 'Onboard tenant companies',
    to: '/admin/tenants',
    countKey: 'tenants',
  },
  {
    key: 'grid',
    title: 'Grid Limit',
    blurb: 'Set site electrical capacity (kW)',
    to: '/admin/sites',
    countKey: 'capacity',
  },
  {
    key: 'sessions',
    title: 'Live Board',
    blurb: 'Watch sessions across all tenants',
    to: '/admin/sessions',
    countKey: 'sessions',
  },
]

export default function AdminDashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      try {
        const [sitesRes, chargersRes, tenantsRes, sessionsRes] = await Promise.all([
          api.get('/sites'),
          api.get('/chargers'),
          api.get('/tenants'),
          api.get('/sessions', { params: { active: 'true' } }),
        ])
        if (cancelled) return
        const sites = sitesRes.data.data || []
        const totalCapacity = sites.reduce((sum, s) => sum + (s.maxCapacityKw || 0), 0)
        setStats({
          sites: sites.length,
          chargers: (chargersRes.data.data || []).length,
          tenants: (tenantsRes.data.data || []).length,
          capacity: `${totalCapacity} kW`,
          sessions: (sessionsRes.data.data || []).length,
        })
      } catch {
        if (!cancelled) {
          setStats({ sites: 0, chargers: 0, tenants: 0, capacity: '0 kW', sessions: 0 })
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-ink dark:text-white">Admin Dashboard</h2>
        <p className="text-sm text-ink-muted">
          Configure sites, chargers, tenants, and grid power caps.
        </p>
      </div>

      {loading ? (
        <div className="grid gap-3 xs:grid-cols-2 lg:grid-cols-3">
          {CARDS.map((card) => (
            <SkeletonCard key={card.key} rows={2} />
          ))}
        </div>
      ) : (
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
                {stats?.[card.countKey] ?? '—'}
              </p>
              <p className="mt-1 text-sm text-ink-muted">{card.blurb}</p>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
