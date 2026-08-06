import { useCallback, useEffect, useState } from 'react'
import EmptyState from '../../components/EmptyState'
import ErrorState from '../../components/ErrorState'
import InvoiceCard from '../../components/InvoiceCard'
import UsageSummary from '../../components/UsageSummary'
import { SkeletonList } from '../../components/SkeletonCard'
import { useToast } from '../../context/ToastContext'
import api from '../../lib/axios'

export default function BillingPanel() {
  const { toast } = useToast()
  const [summary, setSummary] = useState(null)
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expandedId, setExpandedId] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data } = await api.get('/billing')
      setSummary(data.data?.summary || null)
      setInvoices(data.data?.invoices || [])
      const openId = data.data?.summary?.invoiceId
      if (openId) setExpandedId(openId)
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to load billing'
      setError(msg)
      toast(msg, 'error')
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    load()
  }, [load])

  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold text-ink dark:text-white">Billing</h2>
          <p className="text-sm text-ink-muted">
            Usage-based invoices — kWh delivered × tariff at delivery time.
          </p>
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
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : (
        <>
          <UsageSummary summary={summary} />

          {!invoices.length ? (
            <EmptyState
              title="No invoices yet"
              description="Complete a charging session to start metering this period."
            />
          ) : (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-ink dark:text-white">Invoices</h3>
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
          )}
        </>
      )}
    </section>
  )
}
