import { formatMoney } from '../lib/money'
import { getAuthToken } from '../lib/authToken'
import { useToast } from '../context/ToastContext'

export default function InvoiceCard({ invoice, expanded, onToggle }) {
  const { toast } = useToast()

  async function downloadPdf(e) {
    e.stopPropagation()
    try {
      const base = import.meta.env.VITE_API_URL || '/api'
      const res = await fetch(`${base}/billing/${invoice.id}/pdf`, {
        headers: { Authorization: `Bearer ${getAuthToken()}` },
      })
      if (!res.ok) throw new Error('PDF download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoice.id}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('Invoice PDF downloaded')
    } catch (err) {
      toast(err.message || 'PDF failed', 'error')
    }
  }

  return (
    <article className="rounded-lg border border-border bg-panel dark:border-border-dark dark:bg-panel-dark">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-ink dark:text-white">
            Invoice {invoice.period}
            {invoice.companyName ? ` · ${invoice.companyName}` : ''}
            {invoice.customerName ? ` · ${invoice.customerName}` : ''}
          </p>
          <p className="text-xs capitalize text-ink-muted">
            {invoice.status} ·{' '}
            {(invoice.sessionIds?.length || 0) + (invoice.bookingIds?.length || 0)} items ·{' '}
            {Number(invoice.totalKwh || 0).toFixed(3)} kWh
          </p>
        </button>
        <div className="text-right">
          <p className="text-lg font-semibold text-accent">
            {formatMoney(invoice.totalAmount ?? invoice.amount)}
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              className="text-xs font-semibold text-accent"
            >
              PDF
            </button>
            <button type="button" onClick={onToggle} className="text-xs text-ink-muted">
              {expanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3 dark:border-border-dark">
          {!invoice.lineItems?.length ? (
            <p className="text-sm text-ink-muted">No line items yet.</p>
          ) : (
            <ul className="space-y-2">
              {invoice.lineItems.map((li, idx) => (
                <li
                  key={li.sessionId || li.bookingId || idx}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-surface px-3 py-2 text-sm dark:bg-surface-dark"
                >
                  <div>
                    <p className="font-medium text-ink dark:text-white">
                      {li.driverName || 'Session'} · {li.chargerLabel || 'Charger'}
                    </p>
                    <p className="text-xs text-ink-muted">
                      {Number(li.kWh).toFixed(3)} kWh × ${Number(li.tariffRate).toFixed(2)} (
                      {li.tariffBand})
                    </p>
                  </div>
                  <p className="font-semibold text-ink dark:text-white">
                    {formatMoney(li.amount)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </article>
  )
}
