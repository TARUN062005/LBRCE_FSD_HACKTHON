import { formatMoney } from '../lib/money'

export default function UsageSummary({ summary }) {
  const period = summary?.period || '—'
  const kwh = summary?.totalKwh ?? 0
  const amount = summary?.amount ?? 0
  const sessions = summary?.sessionCount ?? 0

  return (
    <div className="grid gap-3 xs:grid-cols-3">
      <SummaryTile label="Period" value={period} />
      <SummaryTile label="Energy" value={`${Number(kwh).toFixed(3)} kWh`} />
      <SummaryTile label="Amount" value={formatMoney(amount)} hint={`${sessions} sessions`} />
    </div>
  )
}

function SummaryTile({ label, value, hint }) {
  return (
    <div className="rounded-lg border border-border bg-panel p-4 dark:border-border-dark dark:bg-panel-dark">
      <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">{label}</p>
      <p className="mt-2 text-xl font-semibold text-ink dark:text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
