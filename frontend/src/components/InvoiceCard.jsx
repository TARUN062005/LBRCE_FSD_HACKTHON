import { formatMoney } from '../lib/money'
import { getAuthToken } from '../lib/authToken'
import { useToast } from '../context/ToastContext'

function formatWhen(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleString()
}

export default function InvoiceCard({ invoice, expanded, onToggle }) {
  const { toast } = useToast()
  const gstPct = Math.round((invoice.gstRate || 0.18) * 100)
  const payment = String(invoice.paymentStatus || invoice.status || 'unpaid')
  const paid = payment.toLowerCase() === 'paid'

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
      a.download = `GridFleet-Invoice-${(invoice.invoiceId || invoice.id).slice(-8)}.pdf`
      a.click()
      URL.revokeObjectURL(url)
      toast('Invoice PDF downloaded')
    } catch (err) {
      toast(err.message || 'PDF failed', 'error')
    }
  }

  return (
    <article className="ui-card overflow-hidden">
      <div className="flex items-stretch">
        <div className="hidden w-1.5 shrink-0 bg-accent sm:block" aria-hidden />
        <div className="min-w-0 flex-1">
          <div className="flex w-full flex-wrap items-start justify-between gap-3 px-4 py-4 sm:px-5">
            <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-semibold tracking-tight text-ink dark:text-white">
                  Invoice #{(invoice.invoiceId || invoice.id || '').slice(-8).toUpperCase()}
                </p>
                <span
                  className={[
                    'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide',
                    paid
                      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                      : 'bg-amber-50 text-amber-900 dark:bg-amber-950/40 dark:text-amber-200',
                  ].join(' ')}
                >
                  {payment}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink-muted">
                {invoice.stationName || invoice.companyName || 'Charging session'}
                {invoice.customerName ? ` · ${invoice.customerName}` : ''}
              </p>
              <p className="mt-0.5 text-xs text-ink-muted">
                {formatWhen(invoice.dateTime || invoice.generatedAt) || `Period ${invoice.period}`}
                {' · '}
                {Number(invoice.energyConsumed ?? invoice.totalKwh ?? 0).toFixed(3)} kWh
                {invoice.durationMinutes ? ` · ${invoice.durationMinutes} min` : ''}
              </p>
            </button>

            <div className="text-right">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-muted">
                Total
              </p>
              <p className="stat-value !text-xl text-accent">
                {formatMoney(invoice.totalAmount ?? invoice.amount)}
              </p>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={downloadPdf}
                  className="ui-btn ui-btn-primary !py-1.5 text-xs"
                >
                  Download PDF
                </button>
                <button
                  type="button"
                  onClick={onToggle}
                  className="ui-btn ui-btn-secondary !py-1.5 text-xs"
                >
                  {expanded ? 'Hide' : 'Details'}
                </button>
              </div>
            </div>
          </div>

          {expanded && (
            <div className="space-y-4 border-t border-border bg-surface/60 px-4 py-4 dark:border-border-dark dark:bg-surface-dark/40 sm:px-5">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Meta label="Subtotal" value={formatMoney(invoice.subtotal || 0)} />
                <Meta
                  label={`GST (${gstPct}%)`}
                  value={formatMoney(invoice.gstAmount || invoice.gst || 0)}
                />
                <Meta
                  label="Price / kWh"
                  value={`₹${Number(invoice.pricePerKwh ?? invoice.tariffRate ?? 0).toFixed(2)}`}
                />
                <Meta label="Charger" value={invoice.chargerId || invoice.lineItems?.[0]?.chargerLabel || '—'} />
              </div>

              <div className="overflow-x-auto rounded-lg border border-border dark:border-border-dark">
                <table className="w-full min-w-[480px] text-left text-sm">
                  <thead className="bg-ink text-[11px] font-semibold uppercase tracking-wide text-white dark:bg-ink-muted">
                    <tr>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2">Energy</th>
                      <th className="px-3 py-2">Duration</th>
                      <th className="px-3 py-2">Rate</th>
                      <th className="px-3 py-2 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(invoice.lineItems || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-3 py-4 text-ink-muted">
                          No line items yet.
                        </td>
                      </tr>
                    ) : (
                      invoice.lineItems.map((li, idx) => (
                        <tr
                          key={li.sessionId || li.bookingId || idx}
                          className="border-t border-border dark:border-border-dark"
                        >
                          <td className="px-3 py-2.5">
                            <p className="font-medium text-ink dark:text-white">
                              {li.chargerLabel || li.stationName || 'Charging session'}
                            </p>
                            <p className="text-xs text-ink-muted">
                              {li.driverName || ''}
                              {li.deliveredAt ? ` · ${formatWhen(li.deliveredAt)}` : ''}
                            </p>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {Number(li.kWh).toFixed(3)} kWh
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {li.durationMinutes || invoice.durationMinutes || 0} min
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            ₹{Number(li.tariffRate).toFixed(2)}
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold">
                            {formatMoney(li.amount)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-end justify-between gap-3 rounded-lg border border-accent/20 bg-accent/5 px-4 py-3">
                <p className="text-xs text-ink-muted">
                  Includes GST · Computer-generated GridFleet invoice
                </p>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase text-ink-muted">Amount due</p>
                  <p className="text-lg font-bold text-accent">
                    {formatMoney(invoice.totalAmount ?? invoice.amount)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function Meta({ label, value }) {
  return (
    <div className="rounded-lg border border-border bg-white px-3 py-2 dark:border-border-dark dark:bg-ink/40">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink dark:text-white">{value}</p>
    </div>
  )
}
