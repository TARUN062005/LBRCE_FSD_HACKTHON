import { formatMoney } from '../lib/money'

export default function InvoiceCard({ invoice, expanded, onToggle }) {
  return (
    <article className="rounded-lg border border-border bg-panel dark:border-border-dark dark:bg-panel-dark">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
      >
        <div>
          <p className="font-semibold text-ink dark:text-white">
            Invoice {invoice.period}
            {invoice.companyName ? ` · ${invoice.companyName}` : ''}
          </p>
          <p className="text-xs capitalize text-ink-muted">
            {invoice.status} · {invoice.sessionIds?.length || 0} sessions ·{' '}
            {Number(invoice.totalKwh || 0).toFixed(3)} kWh
          </p>
        </div>
        <div className="text-right">
          <p className="text-lg font-semibold text-accent">{formatMoney(invoice.amount)}</p>
          <p className="text-xs text-ink-muted">{expanded ? 'Hide' : 'Details'}</p>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border px-4 py-3 dark:border-border-dark">
          {!invoice.lineItems?.length ? (
            <p className="text-sm text-ink-muted">No line items yet.</p>
          ) : (
            <ul className="space-y-2">
              {invoice.lineItems.map((li) => (
                <li
                  key={li.sessionId}
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
