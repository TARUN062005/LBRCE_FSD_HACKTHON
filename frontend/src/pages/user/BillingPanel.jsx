import { useCallback, useEffect, useState } from 'react'
import api from '../../lib/axios'
import { useToast } from '../../context/ToastContext'
import ErrorState from '../../components/ErrorState'
import EmptyState from '../../components/EmptyState'
import SkeletonCard from '../../components/SkeletonCard'
import { formatMoney } from '../../lib/money'
import { getAuthToken } from '../../lib/authToken'

export default function UserBillingPanel() {
  const { toast } = useToast()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const { data: res } = await api.get('/billing')
      setData(res.data)
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load invoices')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function downloadPdf(id) {
    try {
      const base = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${base}/billing/${id}/pdf`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error('PDF download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('Invoice PDF downloaded')
    } catch (err) {
      toast(err.message || 'PDF failed', 'error')
    }
  }

  if (loading) return <SkeletonCard rows={3} />
  if (error) return <ErrorState message={error} onRetry={load} />

  const invoices = data?.invoices || []

  return (
    <section className="space-y-4">
      <div>
        <h2 className="page-title">Billing and invoices</h2>
        <p className="page-desc">
          Auto-generated when you complete a charging session.
          {data?.summary
            ? ` Period ${data.summary.period}: ${data.summary.totalKwh} kWh · ${formatMoney(data.summary.amount)}`
            : ''}
        </p>
      </div>

      {!invoices.length ? (
        <EmptyState
          title="No invoices yet"
          description="Complete a booking charge to generate your first invoice."
        />
      ) : (
        <div className="space-y-3">
          {invoices.map((inv) => (
            <article key={inv.id} className="ui-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-ink dark:text-white">
                    Invoice {inv.invoiceId?.slice(-8)}
                  </p>
                  <p className="text-sm text-ink-muted">
                    Period {inv.period} · {inv.status} · tariff ${inv.tariffRate}/kWh
                  </p>
                  <p className="mt-1 text-sm text-ink dark:text-white">
                    {inv.totalKwh} kWh · <strong>{formatMoney(inv.totalAmount ?? inv.amount)}</strong>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => downloadPdf(inv.id)}
                  className="ui-btn ui-btn-primary !py-1.5 text-xs"
                >
                  Download PDF
                </button>
              </div>
              <ul className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-ink-muted dark:border-border-dark">
                {(inv.lineItems || []).map((li, idx) => (
                  <li key={idx}>
                    {li.chargerLabel || 'Charger'} · {li.kWh} kWh @ ${li.tariffRate} ({li.tariffBand})
                    = {formatMoney(li.amount)}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
