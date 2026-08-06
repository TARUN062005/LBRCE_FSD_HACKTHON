import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import EntityTable from '../../components/EntityTable'
import ErrorState from '../../components/ErrorState'
import InvoiceCard from '../../components/InvoiceCard'
import UsageSummary from '../../components/UsageSummary'
import TenantCostChart from '../../components/charts/TenantCostChart'
import PowerUsageChart from '../../components/charts/PowerUsageChart'
import { SkeletonList } from '../../components/SkeletonCard'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'
import { formatMoney } from '../../lib/money'

export default function ReportsPanel() {
  const { toast } = useToast()
  const [summary, setSummary] = useState(null)
  const [byTenant, setByTenant] = useState([])
  const [invoices, setInvoices] = useState([])
  const [powerUsage, setPowerUsage] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [billingRes, dashRes] = await Promise.all([
        api.get('/billing'),
        api.get('/dashboard'),
      ])
      setSummary(billingRes.data.data?.summary || null)
      setByTenant(billingRes.data.data?.byTenant || [])
      setInvoices(billingRes.data.data?.invoices || [])
      setPowerUsage(dashRes.data.data?.powerUsage || [])
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load reports'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  const platformSummary = {
    period: summary?.period,
    totalKwh: byTenant.reduce((s, t) => s + (t.totalKwh || 0), 0),
    amount: byTenant.reduce((s, t) => s + (t.amount || 0), 0),
    sessionCount: byTenant.reduce((s, t) => s + (t.sessionCount || 0), 0),
  }

  const columns = [
    { key: 'companyName', label: 'Tenant' },
    {
      key: 'totalKwh',
      label: 'Energy',
      render: (row) => `${Number(row.totalKwh).toFixed(3)} kWh`,
    },
    { key: 'sessionCount', label: 'Sessions' },
    {
      key: 'amount',
      label: 'Cost',
      render: (row) => formatMoney(row.amount),
    },
  ]

  return (
    <section className="space-y-4 md:space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="page-title">Reports</h2>
          <p className="page-desc">
            Per-tenant cost breakdown and live site power for the demo period.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          className="ui-btn ui-btn-secondary"
        >
          Refresh
        </button>
      </header>

      {loading ? (
        <SkeletonList count={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <UsageSummary summary={platformSummary} />

          <div className="grid gap-4 lg:grid-cols-2">
            <TenantCostChart data={byTenant} />
            <PowerUsageChart initialData={powerUsage} />
          </div>

          {!byTenant.length ? (
            <EmptyState
              title="No billed usage yet"
              description="When tenant sessions complete, metered costs appear here."
            />
          ) : (
            <>
              <h3 className="section-title">Cost by tenant</h3>
              <EntityTable columns={columns} rows={byTenant} rowKey="tenantId" />

              <h3 className="section-title">All invoices</h3>
              <div className="space-y-3">
                {invoices.map((inv) => (
                  <InvoiceCard
                    key={inv.id}
                    invoice={inv}
                    expanded={expandedId === inv.id}
                    onToggle={() =>
                      setExpandedId((id) => (id === inv.id ? null : inv.id))
                    }
                  />
                ))}
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
