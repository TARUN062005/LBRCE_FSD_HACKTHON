import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import EntityTable from '../../components/EntityTable'
import InvoiceCard from '../../components/InvoiceCard'
import UsageSummary from '../../components/UsageSummary'
import { SkeletonList } from '../../components/SkeletonCard'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'
import { formatMoney } from '../../lib/money'

export default function ReportsPanel() {
  const { toast } = useToast()
  const [summary, setSummary] = useState(null)
  const [byTenant, setByTenant] = useState([])
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/billing')
      setSummary(data.data?.summary || null)
      setByTenant(data.data?.byTenant || [])
      setInvoices(data.data?.invoices || [])
    } catch (err) {
      toast(err.response?.data?.message || 'Failed to load reports', 'error')
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
    {
      key: 'sessionCount',
      label: 'Sessions',
    },
    {
      key: 'amount',
      label: 'Cost',
      render: (row) => formatMoney(row.amount),
    },
  ]

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white">Reports</h2>
          <p className="text-sm text-ink-muted">Per-tenant cost breakdown for the current period.</p>
        </div>
        <button
          type="button"
          onClick={load}
          className="rounded-md border border-border px-3 py-2 text-sm dark:border-border-dark"
        >
          Refresh
        </button>
      </header>

      {loading ? (
        <SkeletonList count={2} />
      ) : (
        <>
          <UsageSummary summary={platformSummary} />

          {!byTenant.length ? (
            <EmptyState
              title="No billed usage yet"
              description="When tenant sessions complete, metered costs appear here."
            />
          ) : (
            <>
              <h3 className="text-sm font-semibold text-ink dark:text-white">
                Cost by tenant
              </h3>
              <EntityTable columns={columns} rows={byTenant} rowKey="tenantId" />

              <h3 className="text-sm font-semibold text-ink dark:text-white">All invoices</h3>
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
