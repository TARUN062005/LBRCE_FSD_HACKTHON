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

  const gstPct = Math.round((invoice.gstRate || 0.18) * 100)

  return (
    <article className="ui-card">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="font-semibold text-ink dark:text-white">
            Invoice {invoice.invoiceId?.slice(-8) || invoice.period}
            {invoice.stationName ? ` · ${invoice.stationName}` : ''}
            {invoice.customerName ? ` · ${invoice.customerName}` : ''}
          </p>
          <p className="text-xs capitalize text-ink-muted">
            {invoice.paymentStatus || invoice.status} ·{' '}
            {Number(invoice.energyConsumed ?? invoice.totalKwh ?? 0).toFixed(3)} kWh
            {invoice.durationMinutes ? ` · ${invoice.durationMinutes} min` : ''}
          </p>
        </button>
        <div className="text-right">
          <p className="stat-value !text-lg text-accent">
            {formatMoney(invoice.totalAmount ?? invoice.amount)}
          </p>
          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={downloadPdf}
              className="text-xs font-semibold text-accent hover:underline"
            >
              PDF
            </button>
            <button
              type="button"
              onClick={onToggle}
              className="text-xs text-ink-muted hover:text-ink dark:hover:text-white"
            >
              {expanded ? 'Hide' : 'Details'}
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border px-4 py-3 dark:border-border-dark">
          <dl className="grid gap-2 text-sm xs:grid-cols-2">
            <div>
              <dt className="text-xs text-ink-muted">Subtotal</dt>
              <dd className="font-medium">{formatMoney(invoice.subtotal || 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">GST ({gstPct}%)</dt>
              <dd className="font-medium">{formatMoney(invoice.gstAmount || invoice.gst || 0)}</dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Price / kWh</dt>
              <dd className="font-medium">
                ${Number(invoice.pricePerKwh ?? invoice.tariffRate ?? 0).toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-ink-muted">Charger</dt>
              <dd className="font-medium truncate">{invoice.chargerId || '—'}</dd>
            </div>
          </dl>
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
                      {Number(li.kWh).toFixed(3)} kWh × ${Number(li.tariffRate).toFixed(2)}
                      {li.durationMinutes ? ` · ${li.durationMinutes} min` : ''}
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
