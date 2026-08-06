import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import api from '../../lib/axios'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import InvoiceCard from '../../components/InvoiceCard'
import { formatMoney } from '../../lib/money'

export default function UserBillingPanel() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [openId, setOpenId] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/billing')
      setData(res.data)
      const first = res.data?.invoices?.[0]
      if (first) setOpenId(first.id)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <SkeletonCard rows={4} />
  if (error) return <ErrorState message={error} onRetry={load} />

  const invoices = data?.invoices || []
  const summary = data?.summary

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <div>
        <h2 className="page-title">Invoices</h2>
        <p className="page-desc">
          Structured receipts for every completed charge — download a professional PDF anytime.
        </p>
      </div>

      {summary && (
        <div className="grid gap-3 sm:grid-cols-3">
          <SummaryTile label="Billing period" value={summary.period || '—'} />
          <SummaryTile label="Energy this period" value={`${Number(summary.totalKwh || 0).toFixed(3)} kWh`} />
          <SummaryTile label="Amount" value={formatMoney(summary.amount)} accent />
        </div>
      )}

      {!invoices.length ? (
        <EmptyState
          title="No invoices yet"
          description="When a station host completes your charging session, an invoice with GST appears here."
          action={
            <Link to="/user/map" className="ui-btn ui-btn-primary">
              Find a charger
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <InvoiceCard
              key={inv.id}
              invoice={inv}
              expanded={openId === inv.id}
              onToggle={() => setOpenId((id) => (id === inv.id ? '' : inv.id))}
            />
          ))}
        </div>
      )}

      {invoices.length > 0 && (
        <p className="text-center text-xs text-ink-muted">
          PDFs include invoice ID, station, energy, duration, GST breakdown, and payment status.
        </p>
      )}
    </section>
  )
}

function SummaryTile({ label, value, accent }) {
  return (
    <div className="ui-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className={['mt-1 text-lg font-semibold', accent ? 'text-accent' : 'text-ink dark:text-white'].join(' ')}>
        {value}
      </p>
    </div>
  )
}
